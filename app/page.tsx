"use client";
import { useMemo, useState } from "react";

type Mode = "study" | "career";
type Msg = { role: "user" | "assistant"; content: string };

function systemPrompt(mode: Mode) {
  if (mode === "study") {
    return `
You are an AI Study Assistant.
Explain topics simply, give short notes, create 5 MCQ with answers, and a revision summary.
`;
  }
  return `
You are an AI Career & Major Recommendation Assistant.
Ask questions first, then recommend majors, careers, skills, and a 30-day plan.
`;
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
    if (!input.trim()) return;

    const newMsgs = [...messages, { role: "user", content: input }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        system: systemPrompt(mode),
        messages: newMsgs,
      }),
    });

    const data = await res.json();
    setMessages([...newMsgs, { role: "assistant", content: data.output }]);
    setLoading(false);
  }

  return (
    <div style={{ maxWidth: 900, margin: "auto", padding: 20 }}>
      <h1>AI Smart Study & Career Assistant</h1>

      <button onClick={() => setMode("study")}>Study</button>
      <button onClick={() => setMode("career")} style={{ marginLeft: 10 }}>
        Career
      </button>

      <p><b>Mode:</b> {title}</p>

      <div style={{ border: "1px solid gray", padding: 10, minHeight: 300 }}>
        {messages.map((m, i) => (
          <p key={i}><b>{m.role}:</b> {m.content}</p>
        ))}
        {loading && <p>Thinking...</p>}
      </div>

      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type here..."
        style={{ width: "80%", marginTop: 10 }}
      />
      <button onClick={send}>Send</button>
    </div>
  );
}
