import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — QuietMind" }] }),
  component: Admin,
});

type Letter = { id: string; mood: string; title: string; body: string };
type Message = { id: string; text: string; sort_order: number };
type MediaRow = { id: string; kind: string; category: string | null; title: string; storage_path: string };

function Admin() {
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const [pinOk, setPinOk] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!loading && profile && profile.role !== "admin") navigate({ to: "/home" });
  }, [loading, profile, navigate]);

  async function verifyPin() {
    if (!profile) return;
    // Re-verify PIN by signing in silently — proves current session PIN
    const { error } = await supabase.auth.signInWithPassword({
      email: `${profile.username.toLowerCase()}@quietmind.local`,
      password: pin,
    });
    if (error) return toast.error("Wrong PIN.");
    setPinOk(true);
  }

  if (!profile || profile.role !== "admin") {
    return (
      <AppShell back="/home">
        <p className="pt-10 text-center text-muted-foreground">Not authorised.</p>
      </AppShell>
    );
  }

  if (!pinOk) {
    return (
      <AppShell back="/home" title="Admin">
        <div className="pt-10 max-w-sm mx-auto qm-glass rounded-2xl border border-white/10 p-6">
          <h2 className="text-lg font-semibold text-center">Enter your PIN to continue</h2>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-4 w-full rounded-xl bg-secondary/60 border border-border px-4 py-3 tracking-widest text-center outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={verifyPin}
            className="mt-3 w-full rounded-xl bg-primary text-primary-foreground py-3"
          >
            Unlock
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell back="/home" title="Admin Dashboard">
      <div className="pt-4 space-y-8 max-w-2xl mx-auto pb-10">
        <SettingsBlock />
        <UploadBlock />
        <MediaListBlock />
        <LettersBlock />
        <MessagesBlock />
      </div>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="qm-glass rounded-2xl border border-white/10 p-5">
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {children}
    </section>
  );
}

function SettingsBlock() {
  const [greeting, setGreeting] = useState("");
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("*");
      const map = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
      setGreeting(map.home_greeting || "");
      setSubtitle(map.home_subtitle || "");
    })();
  }, []);

  async function save() {
    const { error } = await supabase.from("app_settings").upsert([
      { key: "home_greeting", value: greeting, updated_at: new Date().toISOString() },
      { key: "home_subtitle", value: subtitle, updated_at: new Date().toISOString() },
    ]);
    if (error) toast.error(error.message);
    else toast.success("Home updated.");
  }

  return (
    <Card title="Home screen">
      <label className="text-xs text-muted-foreground">Greeting</label>
      <input
        value={greeting}
        onChange={(e) => setGreeting(e.target.value)}
        className="mt-1 w-full rounded-xl bg-secondary/60 border border-border px-3 py-2"
      />
      <label className="mt-3 block text-xs text-muted-foreground">Subtitle</label>
      <textarea
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        className="mt-1 w-full rounded-xl bg-secondary/60 border border-border px-3 py-2 min-h-[70px]"
      />
      <button onClick={save} className="mt-3 rounded-xl bg-primary text-primary-foreground px-4 py-2">
        Save
      </button>
    </Card>
  );
}

function UploadBlock() {
  const [kind, setKind] = useState("sleep");
  const [category, setCategory] = useState("Rain");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function upload() {
    if (!file || !title) return toast.error("Add a title and choose a file.");
    setUploading(true);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${kind}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("quietmind-media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) {
      setUploading(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("quietmind-media").getPublicUrl(path);
    const { error: insErr } = await supabase.from("media").insert({
      kind,
      category: kind === "sleep" ? category : null,
      title,
      storage_path: path,
      public_url: pub.publicUrl,
    });
    setUploading(false);
    if (insErr) return toast.error(insErr.message);
    toast.success("Uploaded.");
    setTitle("");
    setFile(null);
  }

  return (
    <Card title="Upload media">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-xl bg-secondary/60 border border-border px-3 py-2"
        >
          <option value="sleep">Sleep sound</option>
          <option value="music">Music (Hold My Hand)</option>
          <option value="voice">Voice note</option>
          <option value="breathing">Breathing audio</option>
          <option value="wallpaper">Wallpaper</option>
        </select>
        {kind === "sleep" && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl bg-secondary/60 border border-border px-3 py-2"
          >
            {["Rain", "Ocean", "Night", "Nature"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="mt-2 w-full rounded-xl bg-secondary/60 border border-border px-3 py-2"
      />
      <input
        type="file"
        accept={kind === "wallpaper" ? "image/*" : "audio/*"}
        onChange={(e) => setFile(e.target.files?.[0] || null)}
        className="mt-2 block w-full text-sm text-muted-foreground"
      />
      <button
        onClick={upload}
        disabled={uploading}
        className="mt-3 rounded-xl bg-primary text-primary-foreground px-4 py-2 disabled:opacity-60"
      >
        {uploading ? "Uploading..." : "Upload"}
      </button>
    </Card>
  );
}

function MediaListBlock() {
  const [items, setItems] = useState<MediaRow[]>([]);
  async function load() {
    const { data } = await supabase
      .from("media")
      .select("id,kind,category,title,storage_path")
      .order("created_at", { ascending: false });
    setItems((data as MediaRow[]) || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function del(m: MediaRow) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    await supabase.storage.from("quietmind-media").remove([m.storage_path]);
    await supabase.from("media").delete().eq("id", m.id);
    load();
  }

  return (
    <Card title="Uploaded content">
      <div className="space-y-2 max-h-[300px] overflow-y-auto">
        {items.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate text-sm">{m.title}</div>
              <div className="text-xs text-muted-foreground">
                {m.kind}
                {m.category ? ` · ${m.category}` : ""}
              </div>
            </div>
            <button onClick={() => del(m)} className="text-destructive text-sm">
              Delete
            </button>
          </div>
        ))}
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing uploaded yet.</p>}
      </div>
    </Card>
  );
}

function LettersBlock() {
  const [items, setItems] = useState<Letter[]>([]);
  const [mood, setMood] = useState("sad");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("comfort_letters").select("*").order("created_at");
    setItems((data as Letter[]) || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!title || !body) return toast.error("Title and body required.");
    if (editing) {
      await supabase.from("comfort_letters").update({ mood, title, body, updated_at: new Date().toISOString() }).eq("id", editing);
    } else {
      await supabase.from("comfort_letters").insert({ mood, title, body });
    }
    setEditing(null);
    setTitle("");
    setBody("");
    setMood("sad");
    load();
  }
  async function del(id: string) {
    if (!confirm("Delete letter?")) return;
    await supabase.from("comfort_letters").delete().eq("id", id);
    load();
  }
  function edit(l: Letter) {
    setEditing(l.id);
    setTitle(l.title);
    setBody(l.body);
    setMood(l.mood);
  }

  return (
    <Card title="Comfort Corner letters">
      <div className="grid grid-cols-2 gap-2">
        <select value={mood} onChange={(e) => setMood(e.target.value)} className="rounded-xl bg-secondary/60 border border-border px-3 py-2">
          {["sad", "overthinking", "sleep", "miss"].map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="rounded-xl bg-secondary/60 border border-border px-3 py-2" />
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Body" className="mt-2 w-full min-h-[120px] rounded-xl bg-secondary/60 border border-border px-3 py-2" />
      <div className="mt-2 flex gap-2">
        <button onClick={save} className="rounded-xl bg-primary text-primary-foreground px-4 py-2">
          {editing ? "Update" : "Add letter"}
        </button>
        {editing && (
          <button onClick={() => { setEditing(null); setTitle(""); setBody(""); }} className="rounded-xl qm-glass px-4 py-2 text-sm">
            Cancel
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {items.map((l) => (
          <div key={l.id} className="rounded-lg bg-secondary/40 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{l.title}</div>
              <div className="flex gap-3 text-xs">
                <button onClick={() => edit(l)} className="text-accent">Edit</button>
                <button onClick={() => del(l.id)} className="text-destructive">Delete</button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2">{l.body}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MessagesBlock() {
  const [items, setItems] = useState<Message[]>([]);
  const [text, setText] = useState("");

  async function load() {
    const { data } = await supabase.from("hold_messages").select("*").order("sort_order");
    setItems((data as Message[]) || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!text.trim()) return;
    await supabase.from("hold_messages").insert({ text: text.trim(), sort_order: items.length + 1 });
    setText("");
    load();
  }
  async function del(id: string) {
    await supabase.from("hold_messages").delete().eq("id", id);
    load();
  }

  return (
    <Card title="Hold My Hand messages">
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="New comforting message" className="flex-1 rounded-xl bg-secondary/60 border border-border px-3 py-2" />
        <button onClick={add} className="rounded-xl bg-primary text-primary-foreground px-4">Add</button>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
            <span>{m.text}</span>
            <button onClick={() => del(m.id)} className="text-destructive text-xs">Delete</button>
          </div>
        ))}
      </div>
    </Card>
  );
}