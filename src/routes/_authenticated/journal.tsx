import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/journal")({
  head: () => ({ meta: [{ title: "Empty Your Mind — QuietMind" }] }),
  component: Journal,
});

type Entry = { id: string; body: string; created_at: string };

function Journal() {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false });
    setEntries((data as Entry[]) || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("journal_entries")
      .insert({ body: text.trim(), user_id: u.user!.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    setText("");
    toast.success("Saved — only for you.");
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    await supabase.from("journal_entries").delete().eq("id", id);
    load();
  }

  return (
    <AppShell back="/home" activity="📝 Writing">
      <div className="pt-4">
        <h1 className="text-2xl font-semibold">Empty your mind</h1>
        <p className="mt-2 text-accent italic">
          Jo bhi chal raha hai tere dimaag me… idhar likh de, baccha. 🤍
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Let it all out..."
          className="mt-4 w-full min-h-[220px] rounded-2xl qm-glass border border-white/10 p-4 text-foreground outline-none focus:ring-2 focus:ring-primary resize-y"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            disabled={saving || !text.trim()}
            className="flex-1 rounded-xl bg-primary text-primary-foreground py-3 font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => setText("")}
            className="rounded-xl qm-glass px-4 text-sm text-muted-foreground"
          >
            Clear
          </button>
        </div>

        <h2 className="mt-8 text-sm uppercase tracking-wider text-muted-foreground">
          Your saved entries
        </h2>
        <div className="mt-3 space-y-3">
          {entries.length === 0 && (
            <p className="text-sm text-muted-foreground italic">
              Nothing here yet. This space is only yours.
            </p>
          )}
          {entries.map((e) => (
            <div key={e.id} className="qm-glass rounded-2xl border border-white/5 p-4">
              <div className="text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString()}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-foreground">{e.body}</p>
              <button
                onClick={() => remove(e.id)}
                className="mt-2 text-xs text-destructive"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}