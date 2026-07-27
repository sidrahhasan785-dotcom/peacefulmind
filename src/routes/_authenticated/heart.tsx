import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { signMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/heart")({
  head: () => ({ meta: [{ title: "Heart Constellation — QuietMind" }] }),
  component: HeartPage,
});

type Cfg = {
  enabled: boolean;
  colors: string[];
  count: number;
  speed: number;
  message: string;
  songPath: string;
};

type Heart = { id: number; x: number; delay: number; duration: number; scale: number; color: string; popped: boolean };
type Sparkle = { id: number; x: number; y: number; color: string; dx: number; dy: number };

function HeartPage() {
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [hearts, setHearts] = useState<Heart[]>([]);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [songUrl, setSongUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"idle" | "playing" | "message">("idle");
  const [popCount, setPopCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const idRef = useRef(0);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("key,value");
      const m = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
      const c: Cfg = {
        enabled: (m.hc_enabled ?? "true") === "true",
        colors: (m.hc_colors || "#ff6b9d,#c084fc,#f9a8d4").split(",").map((s) => s.trim()).filter(Boolean),
        count: Math.max(6, Math.min(60, parseInt(m.hc_count || "24", 10))),
        speed: Math.max(0.3, Math.min(3, parseFloat(m.hc_speed || "1"))),
        message: m.hc_message || "",
        songPath: m.hc_song_path || "",
      };
      setCfg(c);
      if (c.songPath) {
        try {
          const url = await signMedia(c.songPath);
          setSongUrl(url);
        } catch (e) {
          console.error("[heart] sign failed", e);
        }
      }
    })();
  }, []);

  const spawn = (c: Cfg): Heart[] =>
    Array.from({ length: c.count }, () => {
      idRef.current += 1;
      return {
        id: idRef.current,
        x: Math.random() * 90 + 5,
        delay: Math.random() * 8,
        duration: (10 + Math.random() * 8) / c.speed,
        scale: 0.7 + Math.random() * 0.9,
        color: c.colors[Math.floor(Math.random() * c.colors.length)],
        popped: false,
      };
    });

  function start() {
    if (!cfg) return;
    setHearts(spawn(cfg));
    setPopCount(0);
    setPhase("playing");
  }

  // Play song after 3s of interaction (or immediately when phase starts)
  useEffect(() => {
    if (phase !== "playing" || !songUrl) return;
    const t = setTimeout(() => {
      const el = audioRef.current;
      if (!el) return;
      el.load();
      el.play().catch((e) => console.error("[heart] play rejected", e));
    }, 2500);
    return () => clearTimeout(t);
  }, [phase, songUrl]);

  function pop(h: Heart, e: React.MouseEvent | React.TouchEvent) {
    if (h.popped) return;
    setHearts((prev) => prev.map((x) => (x.id === h.id ? { ...x, popped: true } : x)));
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const parts: Sparkle[] = Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2;
      const dist = 40 + Math.random() * 40;
      idRef.current += 1;
      return {
        id: idRef.current,
        x: cx,
        y: cy,
        color: h.color,
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
      };
    });
    setSparkles((prev) => [...prev, ...parts]);
    setTimeout(() => {
      setSparkles((prev) => prev.filter((s) => !parts.find((p) => p.id === s.id)));
    }, 900);
    setPopCount((c) => c + 1);
  }

  function onAudioEnd() {
    setPhase("message");
  }

  if (!cfg) {
    return (
      <AppShell back="/home">
        <div className="pt-20 text-center text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  if (!cfg.enabled) {
    return (
      <AppShell back="/home">
        <div className="pt-24 text-center text-muted-foreground">
          <div className="text-4xl">💤</div>
          <p className="mt-4">Heart Constellation is currently resting.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back="/home" activity="💖 Heart Constellation">
      <div className="pt-4">
        <h1 className="text-2xl font-semibold qm-shimmer-text">Heart Constellation</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tap the floating hearts. Let the sky hold you.
        </p>

        {phase === "idle" && (
          <div className="mt-16 text-center">
            <button onClick={start} className="qm-btn-premium rounded-full px-8 py-4 text-base">
              Begin ✨
            </button>
            <p className="mt-4 text-xs text-muted-foreground">Sound may play. Turn up your volume.</p>
          </div>
        )}
      </div>

      {phase !== "idle" && (
        <div className="fixed inset-0 z-20 overflow-hidden pointer-events-none">
          {hearts.map((h) => (
            <button
              key={h.id}
              onClick={(e) => pop(h, e)}
              onTouchStart={(e) => pop(h, e)}
              aria-label="Pop heart"
              className="qm-heart pointer-events-auto"
              style={{
                left: `${h.x}%`,
                bottom: 0,
                width: 48 * h.scale,
                height: 48 * h.scale,
                color: h.color,
                animation: `qm-rise ${h.duration}s linear ${h.delay}s infinite`,
                opacity: h.popped ? 0 : undefined,
                transform: h.popped ? "scale(2)" : undefined,
                transition: h.popped ? "opacity 0.4s, transform 0.4s" : undefined,
              }}
            >
              <svg viewBox="0 0 24 24" fill="currentColor" width="100%" height="100%">
                <path d="M12 21s-7-4.5-9.5-9C.7 8.5 2.5 4 6.5 4c2 0 3.5 1.2 4.5 2.8C12 5.2 13.5 4 15.5 4 19.5 4 21.3 8.5 21.5 12c-2.5 4.5-9.5 9-9.5 9z" />
              </svg>
            </button>
          ))}
          {sparkles.map((s) => (
            <span
              key={s.id}
              className="qm-sparkle"
              style={{
                left: s.x,
                top: s.y,
                background: s.color,
                boxShadow: `0 0 12px ${s.color}`,
                ["--dx" as any]: `${s.dx}px`,
                ["--dy" as any]: `${s.dy}px`,
                animation: "qm-sparkle-out 0.9s ease-out forwards",
              }}
            />
          ))}

          {phase === "message" && cfg.message && (
            <div className="pointer-events-auto absolute inset-0 flex items-center justify-center px-8 bg-black/40">
              <div className="qm-glass-strong max-w-md rounded-3xl border border-white/10 p-10 text-center" style={{ animation: "qm-message-in 1.8s ease-out both" }}>
                <p className="text-xl leading-relaxed qm-shimmer-text">{cfg.message}</p>
                <button
                  onClick={() => { setPhase("idle"); setHearts([]); if (audioRef.current) audioRef.current.pause(); }}
                  className="mt-8 qm-btn-premium rounded-full px-6 py-2 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {songUrl && (
        <audio
          ref={audioRef}
          src={songUrl}
          preload="auto"
          onEnded={onAudioEnd}
          onError={(e) => console.error("[heart] audio error", (e.currentTarget as HTMLAudioElement).error)}
        />
      )}

      {phase === "playing" && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-30 qm-glass rounded-full px-4 py-1.5 text-xs text-muted-foreground">
          Popped: {popCount}
        </div>
      )}
    </AppShell>
  );
}