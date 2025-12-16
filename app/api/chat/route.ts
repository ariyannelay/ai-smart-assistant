import OpenAI from "openai";
export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return new Response("Missing API key", { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.responses.create({
      model: "gpt-4o-mini",
      input: body.messages.map((m: any) => m.content).join("\n"),
    });

    return Response.json({ output: response.output_text || "No response" });
  } catch (error: any) {
    console.error(error);
    return new Response(error.message, { status: 500 });
  }
}
