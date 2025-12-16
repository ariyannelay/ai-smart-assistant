import OpenAI from "openai";

export const runtime = "nodejs";

// --- Simple in-memory rate limit (per instance) ---
type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function getIP(req: Request) {
  // Vercel usually sends x-forwarded-for
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  return "unknown";
}

function rateLimit(ip: string, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const cur = buckets.get(ip);

  if (!cur || now > cur.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (cur.count >= limit) {
    return { ok: false, remaining: 0, resetAt: cur.resetAt };
  }

  cur.count += 1;
  buckets.set(ip, cur);
  return { ok: true, remaining: limit - cur.count, resetAt: cur.resetAt };
}

export async function POST(req: Request) {
  try {
    const ip = getIP(req);
    const rl = rateLimit(ip, 10, 60_000); // 10 req / minute / IP

    if (!rl.ok) {
      return Response.json(
        {
          error: "Rate limit exceeded",
          hint: "Wait 1 minute and try again.",
        },
        { status: 429, headers: { "Retry-After": "60" } }
      );
    }

    const key = process.env.OPENAI_API_KEY;
    if (!key) {
      return Response.json(
        { error: "Server misconfigured", hint: "Missing OPENAI_API_KEY in environment." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const msgs = Array.isArray(body?.messages) ? body.messages : [];

    // Basic validation
    const joined = msgs.map((m: any) => String(m?.content ?? "")).join("\n");
    if (!joined.trim()) {
      return Response.json({ error: "Empty message" }, { status: 400 });
    }
    if (joined.length > 6000) {
      return Response.json(
        { error: "Input too long", hint: "Please shorten your message." },
        { status: 400 }
      );
    }

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
