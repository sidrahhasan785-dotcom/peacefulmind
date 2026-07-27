import { useEffect, useState } from "react";

const STORAGE_KEY = "qm.onboarded.v1";

const slides = [
  {
    emoji: "🌙",
    title: "Welcome to QuietMind",
    body: "A calm little sanctuary in your pocket. Take a breath — you're safe here.",
  },
  {
    emoji: "🫁",
    title: "Breathe. Rest. Be held.",
    body: "Guided breathing, gentle sounds, and a private journal that only you can read.",
  },
  {
    emoji: "💖",
    title: "Made for tender moments",
    body: "Whenever the day feels heavy, come back. The moon will be here.",
  },
] as const;

export function Onboarding() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {}
  }, []);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setOpen(false);
  }

  if (!open) return null;
  const s = slides[i];
  const last = i === slides.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      style={{ background: "radial-gradient(circle at 50% 35%, rgba(30,20,60,0.55), rgba(5,5,15,0.9))", animation: "qm-fade-in 0.5s ease-out both" }}
    >
      <div
        className="qm-glass-strong w-full max-w-sm rounded-3xl border border-white/10 px-7 py-9 text-center shadow-2xl"
        style={{ animation: "qm-message-in 0.8s ease-out both" }}
        key={i}
      >
        <div className="text-6xl" style={{ filter: "drop-shadow(0 8px 24px rgba(200,180,255,0.4))" }}>
          {s.emoji}
        </div>
        <h2 className="mt-6 text-2xl font-semibold qm-shimmer-text">{s.title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.body}</p>

        <div className="mt-6 flex justify-center gap-1.5">
          {slides.map((_, idx) => (
            <span
              key={idx}
              className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-white/80" : "w-1.5 bg-white/25"}`}
            />
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            onClick={finish}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            Skip
          </button>
          <button
            onClick={() => (last ? finish() : setI(i + 1))}
            className="qm-btn-premium rounded-full px-6 py-2.5 text-sm"
          >
            {last ? "Enter ✨" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}