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
      { name: "description", content: "Sign in or create your calm, private space." },
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
        const { email } = await signUp({
          data: { full_name: name, username: u, password },
        });
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
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
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <NightSky />
      <div className="qm-glass qm-fade-in w-full max-w-sm rounded-3xl border border-white/10 p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl">🌙</div>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">QuietMind</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "login" ? "Welcome back. You're safe here." : "Create your calm, private space."}
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
                Full name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
                className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
                placeholder="Your name"
              />
            </div>
          )}
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
              placeholder="your_username"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {mode === "login" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
            className="text-accent underline underline-offset-2"
          >
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}