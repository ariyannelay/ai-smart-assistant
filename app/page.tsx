"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "study" | "career";
type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

function systemPrompt(mode: Mode) {
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
  const [mode, setMode] = useState<Mode>("study");
  const [modeKey, setModeKey] = useState(0); // for smooth transition re-mount
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi! 👋\n\n✅ **Study**: ask any topic (e.g., Explain CNN)\n✅ **Career**: ask for major/career plan (e.g., Recommend my major)",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const modeLabel = useMemo(
    () => (mode === "study" ? "AI Study Assistant" : "AI Career & Major Recommender"),
    [mode]
  );

  useEffect(() => {
    // Smooth transition when mode changes
    setModeKey((k) => k + 1);
  }, [mode]);

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

      // robust parsing (handles non-JSON errors too)
      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: raw };
      }

      if (!res.ok) {
        setMessages([
          ...newMsgs,
          {
            role: "assistant",
            content: `⚠️ ${data?.error || "Request failed"}\n${data?.hint ? `\nHint: ${data.hint}` : ""}`,
          },
        ]);
        return;
      }

      setMessages([...newMsgs, { role: "assistant", content: data.output }]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: "⚠️ Network error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function resetChat() {
    setMessages([
      {
        role: "assistant",
        content:
          "Chat reset ✅\n\nTry:\n- Study: Explain Linear Regression\n- Career: Recommend my major",
      },
    ]);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(80%_60%_at_50%_0%,rgba(255,255,255,0.10)_0%,rgba(0,0,0,0)_60%),linear-gradient(to_bottom,#050505,#000)] text-zinc-100">
      {/* background blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl opacity-20 bg-white" />
        <div className="absolute top-44 -left-24 h-80 w-80 rounded-full blur-3xl opacity-15 bg-white" />
        <div className="absolute bottom-0 -right-24 h-80 w-80 rounded-full blur-3xl opacity-10 bg-white" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {/* Top Card */}
        <div className="glass-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
                AI Smart Study & Career Assistant
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Mode: <span className="text-zinc-100 font-medium">{modeLabel}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setMode("study")}
                className={`mode-pill ${mode === "study" ? "mode-pill-active" : ""}`}
              >
                Study
              </button>
              <button
                onClick={() => setMode("career")}
                className={`mode-pill ${mode === "career" ? "mode-pill-active" : ""}`}
              >
                Career
              </button>
              <button onClick={resetChat} className="mode-pill">
                Reset
              </button>
            </div>
          </div>

          {/* mode indicator bar */}
          <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-zinc-900/60">
            <div
              className={`h-full w-1/2 rounded-full transition-all duration-500 ease-out ${
                mode === "study" ? "translate-x-0 bg-white/90" : "translate-x-full bg-white/90"
              }`}
            />
          </div>
        </div>

        {/* Chat Card */}
        <div key={modeKey} className="mt-4 chat-card animate-fadeSlide">
          <div className="h-[520px] overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
                  <div className="whitespace-pre-wrap leading-relaxed text-sm">{m.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bubble bubble-ai">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse" />
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse [animation-delay:120ms]" />
                    <span className="h-2 w-2 rounded-full bg-zinc-400 animate-pulse [animation-delay:240ms]" />
                    <span className="ml-2">Thinking…</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-zinc-800/60 p-3 sm:p-4">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={mode === "study" ? "e.g., Explain CNN" : "e.g., Recommend my major"}
                className="flex-1 rounded-xl border border-zinc-800/70 bg-zinc-950/60 px-4 py-3 text-sm outline-none focus:border-zinc-500 focus:ring-2 focus:ring-white/10 transition"
              />
              <button
                onClick={send}
                className="rounded-xl px-5 py-3 text-sm font-semibold bg-white text-black hover:opacity-90 transition active:scale-[0.98]"
              >
                Send
              </button>
            </div>

            <p className="mt-2 text-xs text-zinc-500">
              Tip: Don’t spam requests—rate limiting is enabled.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-6 text-center text-xs text-zinc-500">
          Developed by <span className="text-zinc-200 font-medium">ariyan_nelay</span>
        </footer>
      </div>
    </div>
  );
}
