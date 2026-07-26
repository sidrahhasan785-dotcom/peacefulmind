import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { listUsers, deleteUser } from "@/lib/quietmind.functions";
import { adminListJournal, adminDeleteJournal } from "@/lib/quietmind.functions";

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

  useEffect(() => {
    if (!loading && profile && profile.role !== "admin") navigate({ to: "/home" });
  }, [loading, profile, navigate]);

  if (!profile || profile.role !== "admin") {
    return (
      <AppShell back="/home">
        <p className="pt-10 text-center text-muted-foreground">Not authorised.</p>
      </AppShell>
    );
  }

  return (
    <AppShell back="/home" title="Admin Dashboard">
      <div className="pt-4 space-y-8 max-w-2xl mx-auto pb-10">
        <UsersBlock />
        <SettingsBlock />
        <HeartConstellationBlock />
        <UploadBlock />
        <MediaListBlock />
        <JournalAdminBlock />
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

type HcSettings = {
  hc_enabled: string;
  hc_colors: string;
  hc_count: string;
  hc_speed: string;
  hc_message: string;
  hc_song_path: string;
};

function HeartConstellationBlock() {
  const [s, setS] = useState<HcSettings>({
    hc_enabled: "true",
    hc_colors: "#ff6b9d,#c084fc,#f9a8d4",
    hc_count: "24",
    hc_speed: "1",
    hc_message: "",
    hc_song_path: "",
  });
  const [songTitle, setSongTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await supabase.from("app_settings").select("key,value");
    const m = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
    setS({
      hc_enabled: m.hc_enabled ?? "true",
      hc_colors: m.hc_colors ?? "#ff6b9d,#c084fc,#f9a8d4",
      hc_count: m.hc_count ?? "24",
      hc_speed: m.hc_speed ?? "1",
      hc_message: m.hc_message ?? "",
      hc_song_path: m.hc_song_path ?? "",
    });
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    setBusy(true);
    const rows = (Object.keys(s) as (keyof HcSettings)[]).map((k) => ({
      key: k,
      value: s[k],
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("app_settings").upsert(rows);
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Heart Constellation saved.");
  }

  async function uploadSong() {
    if (!file || !songTitle) return toast.error("Add a title and choose an audio file.");
    setBusy(true);
    const ext = file.name.split(".").pop() || "mp3";
    const path = `heart/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("quietmind-media")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) {
      setBusy(false);
      return toast.error(upErr.message);
    }
    const { data: pub } = supabase.storage.from("quietmind-media").getPublicUrl(path);
    await supabase.from("media").insert({
      kind: "music",
      category: "Heart Constellation",
      title: songTitle,
      storage_path: path,
      public_url: pub.publicUrl,
      user_id: null,
    });
    // If there was a previous song, remove its storage file.
    if (s.hc_song_path && s.hc_song_path !== path) {
      await supabase.storage.from("quietmind-media").remove([s.hc_song_path]).catch(() => {});
    }
    await supabase.from("app_settings").upsert([
      { key: "hc_song_path", value: path, updated_at: new Date().toISOString() },
    ]);
    setS((prev) => ({ ...prev, hc_song_path: path }));
    setFile(null);
    setSongTitle("");
    setBusy(false);
    toast.success("Song uploaded.");
  }

  return (
    <Card title="Heart Constellation">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={s.hc_enabled === "true"}
          onChange={(e) => setS({ ...s, hc_enabled: e.target.checked ? "true" : "false" })}
        />
        Enabled for all users
      </label>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground">Heart count</label>
          <input
            type="number"
            min={6}
            max={60}
            value={s.hc_count}
            onChange={(e) => setS({ ...s, hc_count: e.target.value })}
            className="mt-1 w-full rounded-xl bg-secondary/60 border border-border px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Animation speed (0.3–3)</label>
          <input
            type="number"
            step="0.1"
            min={0.3}
            max={3}
            value={s.hc_speed}
            onChange={(e) => setS({ ...s, hc_speed: e.target.value })}
            className="mt-1 w-full rounded-xl bg-secondary/60 border border-border px-3 py-2"
          />
        </div>
      </div>

      <label className="mt-3 block text-xs text-muted-foreground">Heart colours (comma-separated hex)</label>
      <input
        value={s.hc_colors}
        onChange={(e) => setS({ ...s, hc_colors: e.target.value })}
        placeholder="#ff6b9d,#c084fc,#f9a8d4"
        className="mt-1 w-full rounded-xl bg-secondary/60 border border-border px-3 py-2"
      />
      <div className="mt-2 flex gap-2">
        {s.hc_colors.split(",").map((c, i) => (
          <span key={i} className="w-6 h-6 rounded-full border border-white/20" style={{ background: c.trim() }} />
        ))}
      </div>

      <label className="mt-3 block text-xs text-muted-foreground">Ending message</label>
      <textarea
        value={s.hc_message}
        onChange={(e) => setS({ ...s, hc_message: e.target.value })}
        className="mt-1 w-full rounded-xl bg-secondary/60 border border-border px-3 py-2 min-h-[80px]"
      />

      <div className="mt-4 rounded-xl border border-white/10 bg-secondary/30 p-3">
        <div className="text-xs text-muted-foreground mb-2">Song</div>
        {s.hc_song_path ? (
          <div className="text-xs text-accent break-all">Current: {s.hc_song_path}</div>
        ) : (
          <div className="text-xs text-muted-foreground italic">No song uploaded.</div>
        )}
        <input
          value={songTitle}
          onChange={(e) => setSongTitle(e.target.value)}
          placeholder="Song title"
          className="mt-2 w-full rounded-xl bg-secondary/60 border border-border px-3 py-2"
        />
        <input
          type="file"
          accept="audio/*"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-2 block w-full text-sm text-muted-foreground"
        />
        <button
          onClick={uploadSong}
          disabled={busy}
          className="mt-2 rounded-xl qm-glass px-3 py-2 text-sm disabled:opacity-60"
        >
          Upload song
        </button>
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="mt-4 rounded-xl bg-primary text-primary-foreground px-4 py-2 disabled:opacity-60"
      >
        Save settings
      </button>
    </Card>
  );
}

type JournalRow = { id: string; body: string; user_id: string; created_at: string; username: string; display_name: string };

function JournalAdminBlock() {
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<JournalRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { entries } = await adminListJournal({ data: { search } });
      setRows(entries as JournalRow[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load journal");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function del(id: string) {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    try {
      await adminDeleteJournal({ data: { entry_id: id } });
      setRows((prev) => prev.filter((r) => r.id !== id));
      toast.success("Deleted.");
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  }

  return (
    <Card title={`Journal management (${rows.length})`}>
      <div className="flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by username or name"
          className="flex-1 rounded-xl bg-secondary/60 border border-border px-3 py-2"
          onKeyDown={(e) => e.key === "Enter" && load()}
        />
        <button onClick={load} className="rounded-xl qm-glass px-3 py-2 text-sm">
          Search
        </button>
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No entries.</p>
      ) : (
        <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg bg-secondary/40 px-3 py-2">
              <div className="flex items-center justify-between text-xs">
                <span>
                  <span className="text-foreground">@{r.username}</span>{" "}
                  <span className="text-muted-foreground">· {new Date(r.created_at).toLocaleString()}</span>
                </span>
                <button onClick={() => del(r.id)} className="text-destructive">Delete</button>
              </div>
              <p className="mt-1 text-sm whitespace-pre-wrap line-clamp-6">{r.body}</p>
            </div>
          ))}
        </div>
      )}
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
    // Admin uploads are official app content — user_id stays NULL so every user sees it.
    const { error: insErr } = await supabase.from("media").insert({
      kind,
      category: kind === "sleep" ? category : null,
      title,
      storage_path: path,
      public_url: pub.publicUrl,
      user_id: null,
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
      .select("id,kind,category,title,storage_path,user_id")
      .is("user_id", null)
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
    <Card title="Official uploaded content">
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

type AppUser = { id: string; username: string; display_name: string; created_at: string; last_seen: string | null; role: string };

function UsersBlock() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const { users } = await listUsers();
      setUsers(users as AppUser[]);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function remove(u: AppUser) {
    if (!confirm(`Permanently delete ${u.username}? All of their data will be removed.`)) return;
    try {
      await deleteUser({ data: { user_id: u.id } });
      toast.success(`${u.username} deleted.`);
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Delete failed");
    }
  }

  return (
    <Card title={`Users (${users.length})`}>
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto">
          {users.map((u) => (
            <div key={u.id} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-sm">
                  <span className="text-foreground">{u.display_name}</span>{" "}
                  <span className="text-muted-foreground">@{u.username}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  joined {new Date(u.created_at).toLocaleDateString()}
                  {u.last_seen ? ` · seen ${new Date(u.last_seen).toLocaleDateString()}` : ""}
                </div>
              </div>
              <button onClick={() => remove(u)} className="text-destructive text-sm">
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
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