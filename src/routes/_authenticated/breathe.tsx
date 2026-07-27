import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { signMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/breathe")({
  head: () => ({ meta: [{ title: "Breathe With Me — QuietMind" }] }),
  component: Breathe,
});

function Breathe() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [hasAudio, setHasAudio] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("media")
        .select("storage_path")
        .eq("kind", "breathing")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!data) {
        setHasAudio(false);
        return;
      }
      const { url } = await signMediaUrl({ data: { path: data.storage_path } });
      setUrl(url);
    })();
  }, []);

  function start() {
    const el = audioRef.current;
    if (el) {
      el.play().catch(() => {});
    }
    setState("playing");
  }
  function pause() {
    audioRef.current?.pause();
    setState("paused");
  }
  function stop() {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setState("idle");
  }

  return (
    <AppShell back="/home" activity="🫁 Breathing">
      <div className="flex flex-col items-center pt-6">
        <h1 className="text-2xl font-semibold">Breathe with me</h1>
        <p className="mt-2 text-muted-foreground text-center max-w-xs">
          Follow the moon. In... and out.
        </p>
        <div className="mt-10 flex items-center justify-center h-[320px]">
          <div
            className="qm-moon rounded-full"
            style={{
              width: 200,
              height: 200,
              animation:
                state === "playing"
                  ? "qm-breathe 8s ease-in-out infinite"
                  : "qm-moon-glow 6s ease-in-out infinite",
            }}
          />
        </div>

        {url && (
          <audio
            ref={audioRef}
            src={url}
            onEnded={() => setState("idle")}
            preload="auto"
          />
        )}

        <div className="mt-10 flex gap-3">
          {state !== "playing" ? (
            <button
              onClick={start}
              className="rounded-full bg-primary text-primary-foreground px-8 py-3 font-medium hover:brightness-110"
            >
              Start
            </button>
          ) : (
            <button
              onClick={pause}
              className="rounded-full bg-secondary text-foreground px-6 py-3"
            >
              Pause
            </button>
          )}
          {state !== "idle" && (
            <button
              onClick={stop}
              className="rounded-full qm-glass px-6 py-3 text-sm"
            >
              Stop
            </button>
          )}
        </div>
        {!hasAudio && (
          <p className="mt-6 text-xs text-muted-foreground">
            No breathing audio uploaded yet. Sidrah can add one in Admin.
          </p>
        )}
      </div>
    </AppShell>
  );
}