"use client";

import { useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

function systemPrompt(mode: "study" | "career") {
  if (mode === "study") {
    return `You are an AI Study Assistant for university students.
Return in this structure:
1) Simple explanation
2) Short notes (bullets)
3) 5 MCQ with answers
4) Quick revision summary (5-7 lines)
Use friendly tone.`;
  }
  return `You are an AI Career & Major Recommendation Assistant.
First ask 6 short questions (interests, skills, favorite subjects, CGPA, time/week, goal),
then recommend: 2 majors + reasons, 3 career paths, skill roadmap, 30-day plan.`;
}

export default function Home() {
  const [mode, setMode] = useState<"study" | "career">("study");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! 👋 Choose **Study** or **Career** mode, then ask me anything.\n\nTry: “Explain CNN” or “Recommend my major”.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const modeLabel = useMemo(
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

      const data = await res.json();

      if (!res.ok) {
        setMessages([
          ...newMsgs,
          {
            role: "assistant",
            content:
              `⚠️ ${data?.error || "Request failed"}\n\n` +
              (data?.hint ? `Hint: ${data.hint}` : ""),
          },
        ]);
        return;
      }

      setMessages([...newMsgs, { role: "assistant", content: data.output }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (e: any) {
      setMessages([
        ...newMsgs,
        { role: "assistant", content: "⚠️ Network error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        content:
          "Chat reset ✅\n\nTry: “Explain Linear Regression” or “Recommend my major”.",
      },
    ]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-zinc-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 shadow-xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                AI Smart Study & Career Assistant
              </h1>
              <p className="text-sm text-zinc-400">
                Mode: <span className="text-zinc-200 font-medium">{modeLabel}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setMode("study")}
                className={`rounded-xl px-4 py-2 text-sm font-medium border transition
                ${mode === "study"
                    ? "bg-zinc-100 text-black border-zinc-100"
                    : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900"
                  }`}
              >
                Study
              </button>
              <button
                onClick={() => setMode("career")}
                className={`rounded-xl px-4 py-2 text-sm font-medium border transition
                ${mode === "career"
                    ? "bg-zinc-100 text-black border-zinc-100"
                    : "bg-zinc-900/40 border-zinc-800 hover:bg-zinc-900"
                  }`}
              >
                Career
              </button>
              <button
                onClick={resetChat}
                className="rounded-xl px-4 py-2 text-sm font-medium border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 transition"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Chat */}
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/50 shadow-xl">
          <div className="h-[520px] overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed border
                    ${m.role === "user"
                      ? "bg-zinc-100 text-black border-zinc-100"
                      : "bg-zinc-900/40 text-zinc-100 border-zinc-800"
                    }`}
                >
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm border border-zinc-800 bg-zinc-900/40 text-zinc-300">
                  Thinking…
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-800 p-3 sm:p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") send();
                }}
                placeholder={mode === "study" ? "e.g., Explain CNN" : "e.g., Recommend my major"}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm outline-none focus:border-zinc-500"
              />
              <button
                onClick={send}
                className="rounded-xl px-4 py-3 text-sm font-semibold bg-white text-black hover:opacity-90 transition"
              >
                Send
              </button>
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              Tip: Don’t spam requests—rate limiting is enabled.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
