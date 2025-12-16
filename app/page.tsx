"use client";
import { useMemo, useState } from "react";

type Role = "user" | "assistant";
type Mode = "study" | "career";
type Msg = { role: Role; content: string };

function systemPrompt(mode: Mode) {
  return mode === "study"
    ? `You are an AI Study Assistant. Explain simply, give notes, 5 MCQ with answers, and a revision summary.`
    : `You are an AI Career & Major Recommendation Assistant. Ask questions first, then recommend majors, careers, skills roadmap, and a 30-day plan.`;
}

export default function Home() {
  const [mode, setMode] = useState<Mode>("study");
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! Choose Study or Career and ask me anything 🙂" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => (mode === "study" ? "AI Study Assistant" : "AI Career & Major Recommender"),
    [mode]
  );

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          system: systemPrompt(mode),
          messages: newMsgs,
        }),
      });

      const data = (await res.json()) as { output?: string };
      const outText = data?.output ?? "No response";

      setMessages([...newMsgs, { role: "assistant", content: outText }]);
    } catch (e: any) {
      setMessages([
        ...newMsgs,
        { role: "assistant", content: "Error: " + (e?.message || "Request failed") },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16, fontFamily: "system-ui" }}>
      <h1 style={{ margin: 0, fontSize: 22 }}>AI Smart Study & Career Assistant</h1>

      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button onClick={() => setMode("study")}>Study</button>
        <button onClick={() => setMode("career")}>Career</button>
      </div>

      <p style={{ opacity: 0.8, marginTop: 8 }}>
        Mode: <b>{title}</b>
      </p>

      <div style={{ border: "1px solid gray", borderRadius: 12, padding: 12, minHeight: 320 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <b>{m.role}:</b> <span style={{ whiteSpace: "pre-wrap" }}>{m.content}</span>
          </div>
        ))}
        {loading && <div>Thinking...</div>}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type here..."
          onKeyDown={(e) => e.key === "Enter" && send()}
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={send}>Send</button>
      </div>
    </div>
  );
}
