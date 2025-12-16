"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Mode = "study" | "career";
type Role = "user" | "assistant";
type Msg = { role: Role; content: string };

function systemPrompt(mode: Mode) {
  if (mode === "study") {
    return `You are an AI Study Assistant.
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

const INITIAL: Record<Mode, Msg[]> = {
  study: [
    {
      role: "assistant",
      content:
        "Hi! 👋\n\n✅ Study: ask any topic (e.g., Explain CNN)\n✅ Career: ask (e.g., Recommend my major)",
    },
  ],
  career: [
    {
      role: "assistant",
      content:
        "Hi! 👋 I can recommend your major & career path.\n\nTell me:\n1) Favorite subjects\n2) Interests (coding/design/data/security)\n3) Goal (job/research/freelance)\n4) Time per week",
    },
  ],
};

export default function Home() {
  const [mode, setMode] = useState<Mode>("study");
  const [transitionKey, setTransitionKey] = useState(0);

  const [history, setHistory] = useState<Record<Mode, Msg[]>>({
    study: INITIAL.study,
    career: INITIAL.career,
  });

  const messages = history[mode];

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const modeLabel = useMemo(
    () => (mode === "study" ? "AI Study Assistant" : "AI Career & Major Recommender"),
    [mode]
  );

  useEffect(() => {
    setTransitionKey((k) => k + 1);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  }, [mode]);

  function append(modeToUpdate: Mode, msg: Msg) {
    setHistory((prev) => ({
      ...prev,
      [modeToUpdate]: [...prev[modeToUpdate], msg],
    }));
  }

  // ✅ bubble click → input set + auto send
  function quickAsk(text: string) {
    if (loading) return;
    setInput(text);
    setTimeout(() => {
      sendText(text);
    }, 0);
  }

  async function sendText(text: string) {
    const t = text.trim();
    if (!t || loading) return;

    const newMsgs: Msg[] = [...messages, { role: "user", content: t }];
    setHistory((prev) => ({ ...prev, [mode]: newMsgs }));
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

      const raw = await res.text();
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        data = { error: raw };
      }

      if (!res.ok) {
        append(mode, {
          role: "assistant",
          content: `⚠️ ${data?.error || "Request failed"}${
            data?.hint ? `\n\nHint: ${data.hint}` : ""
          }`,
        });
        return;
      }

      append(mode, { role: "assistant", content: data.output });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    } catch {
      append(mode, { role: "assistant", content: "⚠️ Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  async function send() {
    await sendText(input);
  }

  function resetCurrentMode() {
    setHistory((prev) => ({
      ...prev,
      [mode]: mode === "study" ? INITIAL.study : INITIAL.career,
    }));
  }

  return (
    <div className="min-h-screen text-zinc-100 bg-[radial-gradient(60%_40%_at_50%_0%,rgba(255,255,255,0.10)_0%,rgba(0,0,0,0)_60%),linear-gradient(to_bottom,#070707,#000)]">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-3xl opacity-20 bg-white" />
        <div className="absolute top-52 -left-32 h-[360px] w-[360px] rounded-full blur-3xl opacity-10 bg-white" />
        <div className="absolute bottom-0 -right-40 h-[420px] w-[420px] rounded-full blur-3xl opacity-10 bg-white" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:py-10">
        {/* Header */}
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

            {/* ✅ Buttons separated properly */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="segmented">
                <button
                  onClick={() => setMode("study")}
                  className={`seg-btn ${mode === "study" ? "seg-active" : ""}`}
                >
                  Study
                </button>
                <button
                  onClick={() => setMode("career")}
                  className={`seg-btn ${mode === "career" ? "seg-active" : ""}`}
                >
                  Career
                </button>
              </div>

              <button onClick={resetCurrentMode} className="pill">
                Reset
              </button>
            </div>
          </div>

          {/* ✅ Bubble buttons */}
          <div className="mt-4 flex flex-wrap gap-2">
            {mode === "study" ? (
              <>
                <button className="bubble-btn" onClick={() => quickAsk("Explain CNN in simple words")}>
                  Explain CNN
                </button>
                <button className="bubble-btn" onClick={() => quickAsk("Give me short notes on Linear Regression")}>
                  Linear Regression Notes
                </button>
                <button className="bubble-btn" onClick={() => quickAsk("Make 5 MCQ on OOP concepts with answers")}>
                  OOP MCQ
                </button>
              </>
            ) : (
              <>
                <button
                  className="bubble-btn"
                  onClick={() =>
                    quickAsk("Recommend my major (DS vs Cyber vs Robotics). Ask me questions first.")
                  }
                >
                  Recommend Major
                </button>
                <button
                  className="bubble-btn"
                  onClick={() => quickAsk("Make a 30-day roadmap for getting a software internship")}
                >
                  30-day Roadmap
                </button>
                <button
                  className="bubble-btn"
                  onClick={() => quickAsk("Suggest 3 career paths based on my interests and CGPA")}
                >
                  Career Paths
                </button>
              </>
            )}
          </div>

          {/* animated underline */}
          <div className="mt-4 h-[2px] w-full bg-zinc-900/60 rounded-full overflow-hidden">
            <div
              className={`h-full w-1/2 bg-white/90 transition-all duration-500 ease-out ${
                mode === "study" ? "translate-x-0" : "translate-x-full"
              }`}
            />
          </div>
        </div>

        {/* Chat */}
        <div key={transitionKey} className="mt-4 chat-card animate-fadeSlide">
          <div className="h-[540px] overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-ai"}`}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.content}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bubble bubble-ai">
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="dot" />
                    <span className="dot [animation-delay:120ms]" />
                    <span className="dot [animation-delay:240ms]" />
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
                disabled={loading}
                className="rounded-xl px-5 py-3 text-sm font-semibold bg-white text-black hover:opacity-90 transition active:scale-[0.98] disabled:opacity-60"
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
