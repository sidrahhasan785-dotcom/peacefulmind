import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { signUp, resolveLogin } from "@/lib/quietmind.functions";
import { NightSky } from "@/components/NightSky";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — QuietMind" },
      { name: "description", content: "Enter your calm, private space." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) navigate({ to: "/home" });
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = username.trim();
    if (!u || !password) return toast.error("Enter your username and password.");
    setBusy(true);
    try {
      if (mode === "signup") {
        const name = fullName.trim();
        if (!name) throw new Error("Please enter your full name.");
        if (!/^[a-zA-Z0-9_]{3,30}$/.test(u))
          throw new Error("Username: 3–30 letters, numbers or underscore.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const { email } = await signUp({ data: { full_name: name, username: u, password } });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        toast.success("Welcome to QuietMind.");
      } else {
        const { email } = await resolveLogin({ data: { username: u } });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error("Wrong username or password.");
      }
      navigate({ to: "/home" });
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <NightSky />
      <div className="qm-fade-in w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto qm-moon rounded-full" style={{ width: 84, height: 84 }} />
          <h1 className="mt-6 text-4xl font-semibold tracking-tight qm-shimmer-text">QuietMind</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {mode === "login" ? "Welcome back. Breathe. You're home." : "Create the space that holds you."}
          </p>
        </div>

        <div className="qm-glass-strong rounded-3xl border border-white/10 p-7 shadow-2xl">
          <div className="mb-6 flex rounded-full bg-white/5 p-1 text-sm">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-full py-2 transition ${
                  mode === m
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  placeholder="Your name"
                  className={inputCls}
                />
              </Field>
            )}
            <Field label="Username" hint={mode === "signup" ? "3–30 letters, numbers or underscore" : undefined}>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                autoComplete="username"
                placeholder="your_username"
                className={inputCls}
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  className={inputCls}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-accent"
                >
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </Field>

            <button
              type="submit"
              disabled={busy}
              className="qm-btn-premium w-full rounded-xl py-3.5 font-medium disabled:opacity-60"
            >
              {busy ? "One moment…" : mode === "login" ? "Enter QuietMind" : "Create my space"}
            </button>
          </form>

          <p className="mt-6 text-center text-[11px] uppercase tracking-widest text-muted-foreground/70">
            Private · Peaceful · Yours
          </p>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-foreground placeholder:text-muted-foreground/60 outline-none transition focus:ring-2 focus:ring-primary focus:border-primary/40";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-muted-foreground/70">{hint}</p>}
    </div>
  );
}