import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { signMedia } from "@/lib/media";

export const Route = createFileRoute("/_authenticated/hold")({
  head: () => ({ meta: [{ title: "Hold My Hand — QuietMind" }] }),
  component: Hold,
});

function Hold() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [msgIdx, setMsgIdx] = useState(0);
  const [holding, setHolding] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: media }, { data: msgs }] = await Promise.all([
        supabase
          .from("media")
          .select("storage_path")
          .eq("kind", "music")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.from("hold_messages").select("text").order("sort_order"),
      ]);
      if (media) {
        const { url } = await signMediaUrl({ data: { path: media.storage_path } });
        setUrl(url);
      }
      if (msgs) setMessages(msgs.map((m) => m.text));
    })();
  }, []);

  useEffect(() => {
    if (!holding || messages.length === 0) return;
    const iv = setInterval(() => setMsgIdx((i) => (i + 1) % messages.length), 4500);
    return () => clearInterval(iv);
  }, [holding, messages]);

  function begin() {
    setHolding(true);
    setMsgIdx(0);
    const el = audioRef.current;
    if (el) {
      el.currentTime = 0;
      el.loop = true;
      el.play().catch(() => {});
    }
  }
  function end() {
    setHolding(false);
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
  }

  return (
    <AppShell back="/home" activity="🫂 Being held">
      <div className="flex flex-col items-center pt-4">
        <h1 className="text-2xl font-semibold">I'm right here.</h1>
        <p className="mt-2 text-muted-foreground text-center max-w-xs">
          Press and hold. Let the words wash over you.
        </p>

        <div className="mt-10 relative flex items-center justify-center h-[300px]">
          <button
            onPointerDown={begin}
            onPointerUp={end}
            onPointerLeave={end}
            onPointerCancel={end}
            className="qm-moon rounded-full flex items-center justify-center text-3xl select-none transition"
            style={{
              width: holding ? 240 : 200,
              height: holding ? 240 : 200,
              transition: "width 400ms ease, height 400ms ease",
            }}
            aria-label="Hold my hand"
          >
            🤍
          </button>
        </div>

        <div className="mt-8 h-16 flex items-center justify-center">
          {holding && messages[msgIdx] && (
            <p
              key={msgIdx}
              className="qm-fade-in text-lg text-accent text-center max-w-xs"
            >
              {messages[msgIdx]}
            </p>
          )}
        </div>
        {url && <audio ref={audioRef} src={url} preload="auto" />}
        {!url && (
          <p className="mt-4 text-xs text-muted-foreground text-center">
            No music uploaded yet — the messages still hold you.
          </p>
        )}
      </div>
    </AppShell>
  );
}