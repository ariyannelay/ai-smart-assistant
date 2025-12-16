import OpenAI from "openai";

export const runtime = "nodejs";

/**
 * Simple in-memory rate limiter (per serverless instance).
 * NOTE: On Vercel, multiple instances may exist, so this is "best-effort".
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function getClientIP(req: Request): string {
  const headerOrder = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-vercel-forwarded-for",
  ];

  for (const h of headerOrder) {
    const v = req.headers.get(h);
    if (v) return v.split(",")[0].trim();
  }

  // Fallback: at least separate by user-agent
  const ua = req.headers.get("user-agent") || "ua";
  return `unknown:${ua.slice(0, 40)}`;
}

function rateLimit(ip: string, limit = 60, windowMs = 60_000) {
  const now = Date.now();
  const cur = buckets.get(ip);

  // New window
  if (!cur || now > cur.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(ip, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }

  // Exceeded
  if (cur.count >= limit) {
    return { ok: false, remaining: 0, resetAt: cur.resetAt };
  }

  // Consume
  cur.count += 1;
  buckets.set(ip, cur);

  return { ok: true, remaining: Math.max(0, limit - cur.count), resetAt: cur.resetAt };
}

function isGreeting(text: string) {
  const t = text.trim().toLowerCase();
  const greetings = ["hi", "hello", "hey", "assalamualaikum", "assalamu alaikum", "salam"];
  return greetings.includes(t);
}

export async function POST(req: Request) {
  try {
    // 1) Rate limit
    const ip = getClientIP(req);
    const rl = rateLimit(ip, 60, 60_000); // 60 requests per minute per IP

    if (!rl.ok) {
      return Response.json(
        { error: "Rate limit exceeded", hint: "Please wait 1 minute and try again." },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    // 2) API key check
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return Response.json(
        { error: "Server misconfigured", hint: "Missing OPENAI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    // 3) Parse body safely
    const body = await req.json();
    const msgs = Array.isArray(body?.messages) ? body.messages : [];

    const joined = msgs.map((m: any) => String(m?.content ?? "")).join("\n").trim();

    if (!joined) {
      return Response.json({ error: "Empty message", hint: "Type something first 🙂" }, { status: 400 });
    }

    if (joined.length > 6000) {
      return Response.json(
        { error: "Input too long", hint: "Please shorten your message (max ~6000 chars)." },
        { status: 400 }
      );
    }

    // 4) Quick reply for greetings (saves API cost + instant UX)
    if (isGreeting(joined)) {
      return Response.json({
        output:
          "Hi! 👋\n\n✅ Study mode: Ask any topic (e.g., *Explain CNN*)\n✅ Career mode: Ask *Recommend my major*",
        meta: { remaining: rl.remaining },
      });
    }

    // 5) Call OpenAI
    const openai = new OpenAI({ apiKey: key });

    const resp = await openai.responses.create({
      model: "gpt-4o-mini",
      input: joined,
    });

    return Response.json({
      output: resp.output_text || "No response",
      meta: { remaining: rl.remaining },
    });
  } catch (err: any) {
    return Response.json(
      { error: "Server error", hint: err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
