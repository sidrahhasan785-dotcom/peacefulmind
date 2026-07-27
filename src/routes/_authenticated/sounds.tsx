import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { signMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/sounds")({
  head: () => ({ meta: [{ title: "Sleep Sounds — QuietMind" }] }),
  component: Sounds,
});

type Track = { id: string; title: string; category: string | null; storage_path: string; user_id: string | null };

const CATEGORIES = ["All", "Rain", "Ocean", "Night", "Nature", "My recordings"];

function Sounds() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [cat, setCat] = useState("All");
  const [current, setCurrent] = useState<Track | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [timerMin, setTimerMin] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("media")
        .select("id,title,category,storage_path,kind,user_id")
        .in("kind", ["sleep", "music", "voice"])
        .order("created_at", { ascending: false });
      if (error) console.error("[sounds] load failed", error);
      setTracks(((data as any[]) || []).map((d) => ({
        id: d.id,
        title: d.title,
        category: d.kind === "voice" ? "My recordings" : d.category,
        storage_path: d.storage_path,
        user_id: d.user_id ?? null,
      })));
    })();
  }, []);

  const visible = useMemo(
    () => (cat === "All" ? tracks : tracks.filter((t) => (t.category || "").toLowerCase() === cat.toLowerCase())),
    [tracks, cat],
  );

  async function pick(t: Track) {
    setCurrent(t);
    setUrl(null);
    setLoadingUrl(true);
    try {
      const signed = await signMedia(t.storage_path);
      if (!signed) throw new Error("Empty signed URL");
      setUrl(signed);
    } catch (err) {
      console.error("[sounds] failed to get signed URL", err);
      setLoadingUrl(false);
      return;
    }
  }

  // Once the audio element has a real URL, try to play and log any errors.
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !url) return;
    setLoadingUrl(false);
    el.load();
    const p = el.play();
    if (p && typeof p.catch === "function") {
      p.catch((err) => console.error("[sounds] play() rejected", err));
    }
  }, [url]);

  function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }

  function stop() {
    const el = audioRef.current;
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  }

  function setSleepTimer(min: number) {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setTimerMin(min);
    timerRef.current = window.setTimeout(() => {
      stop();
      setTimerMin(null);
    }, min * 60_000);
  }

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume, url]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <AppShell back="/home" activity="🎵 Sleep sounds">
      <div className="pt-4 pb-32">
        <h1 className="text-2xl font-semibold">Sleep Sounds</h1>
        <p className="mt-2 text-muted-foreground">Choose a sound. Let it carry you to rest.</p>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm border ${
                cat === c
                  ? "bg-primary text-primary-foreground border-primary"
                  : "qm-glass border-white/10 text-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-2">
          {visible.map((t) => (
            <button
              key={t.id}
              onClick={() => pick(t)}
              className={`w-full text-left qm-glass rounded-xl border border-white/10 p-4 flex items-center justify-between hover:brightness-110 ${
                current?.id === t.id ? "ring-2 ring-primary" : ""
              }`}
            >
              <div>
                <div className="text-base">{t.title}</div>
                {t.category && (
                  <div className="text-xs text-muted-foreground">{t.category}</div>
                )}
              </div>
              <div className="text-lg">▶</div>
            </button>
          ))}
          {visible.length === 0 && (
            <p className="text-sm text-muted-foreground italic">Nothing here yet.</p>
          )}
        </div>
      </div>

      {current && url && (
        <div className="fixed bottom-0 inset-x-0 z-10 qm-glass border-t border-white/10 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
          <audio
            ref={audioRef}
            src={url}
            preload="auto"
            crossOrigin="anonymous"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onLoadedMetadata={(e) => setDuration((e.target as HTMLAudioElement).duration || 0)}
            onTimeUpdate={(e) => setProgress((e.target as HTMLAudioElement).currentTime)}
            onError={(e) => {
              const audioEl = e.currentTarget as HTMLAudioElement;
              console.error("[sounds] <audio> error", audioEl.error, "src=", audioEl.currentSrc);
            }}
          />
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-sm truncate">{current.title}</div>
              {timerMin && (
                <div className="text-[10px] text-accent">⏱ stops in ~{timerMin}m</div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="rounded-full bg-primary text-primary-foreground w-10 h-10">
                {playing ? "❚❚" : "▶"}
              </button>
              <button onClick={stop} className="rounded-full qm-glass px-3 h-10 text-xs">
                ■
              </button>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            step={0.5}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (audioRef.current) audioRef.current.currentTime = v;
              setProgress(v);
            }}
            className="w-full mt-2 accent-[color:var(--primary)]"
          />
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-muted-foreground w-10">Vol</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 accent-[color:var(--primary)]"
            />
          </div>
          <div className="mt-2 flex gap-2 justify-end text-xs">
            <span className="text-muted-foreground self-center">Sleep timer:</span>
            {[15, 30, 60].map((m) => (
              <button
                key={m}
                onClick={() => setSleepTimer(m)}
                className="qm-glass px-2 py-1 rounded"
              >
                {m}m
              </button>
            ))}
            {timerMin && (
              <button
                onClick={() => {
                  if (timerRef.current) window.clearTimeout(timerRef.current);
                  setTimerMin(null);
                }}
                className="text-destructive"
              >
                clear
              </button>
            )}
          </div>
        </div>
      )}
      {current && !url && loadingUrl && (
        <div className="fixed bottom-0 inset-x-0 z-10 qm-glass border-t border-white/10 px-5 py-4 text-sm text-muted-foreground text-center">
          Preparing {current.title}…
        </div>
      )}
    </AppShell>
  );
}