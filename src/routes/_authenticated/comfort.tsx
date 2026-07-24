import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/comfort")({
  head: () => ({ meta: [{ title: "Comfort Corner — QuietMind" }] }),
  component: Comfort,
});

type Letter = { id: string; mood: string; title: string; body: string };

function Comfort() {
  const [letters, setLetters] = useState<Letter[]>([]);
  const [active, setActive] = useState<Letter | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("comfort_letters").select("*").order("created_at");
      setLetters((data as Letter[]) || []);
    })();
  }, []);

  return (
    <AppShell back="/home" activity="💌 In Comfort Corner">
      <div className="pt-4">
        <h1 className="text-2xl font-semibold">Comfort Corner</h1>
        <p className="mt-2 text-muted-foreground">Little letters, whenever you need one.</p>

        <div className="mt-6 grid gap-3">
          {letters.map((l) => (
            <button
              key={l.id}
              onClick={() => setActive(l)}
              className="qm-glass text-left rounded-2xl border border-white/10 p-5 flex items-center gap-3 hover:brightness-110 active:scale-[0.99]"
            >
              <div className="text-2xl">💌</div>
              <div className="text-base">{l.title}</div>
            </button>
          ))}
          {letters.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No letters yet.</p>
          )}
        </div>

        {active && (
          <div
            className="fixed inset-0 z-20 flex items-end sm:items-center justify-center bg-black/60 p-4"
            onClick={() => setActive(null)}
          >
            <div
              className="qm-glass qm-fade-in w-full max-w-md rounded-3xl border border-white/10 p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-3xl text-center">💌</div>
              <h2 className="mt-2 text-lg font-semibold text-center">{active.title}</h2>
              <p className="mt-4 whitespace-pre-wrap text-foreground/95 leading-relaxed">
                {active.body}
              </p>
              <button
                onClick={() => setActive(null)}
                className="mt-6 w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}