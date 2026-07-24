import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAccounts } from "@/lib/quietmind.functions";
import { NightSky } from "@/components/NightSky";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — QuietMind" },
      { name: "description", content: "Sign in to your private, calming space." },
    ],
  }),
  component: AuthPage,
});

function emailFor(u: string) {
  return `${u.toLowerCase()}@quietmind.local`;
}

function AuthPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        navigate({ to: "/home" });
        return;
      }
      try {
        await bootstrapAccounts();
      } catch (e) {
        console.error("bootstrap failed", e);
      }
      setReady(true);
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !pin) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailFor(username.trim()),
      password: pin,
    });
    setBusy(false);
    if (error) {
      toast.error("Wrong username or PIN. Try again gently.");
      return;
    }
    // Check must_change_password on profile
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data: p } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", u.user.id)
        .maybeSingle();
      if (p?.must_change_password) {
        navigate({ to: "/set-password" });
        return;
      }
    }
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <NightSky />
      <div className="qm-glass qm-fade-in w-full max-w-sm rounded-3xl border border-white/10 p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-4xl">🌙</div>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">QuietMind</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Welcome back. You're safe here.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-4">
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
              placeholder="Sidrah or Priyanshu"
              disabled={!ready}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted-foreground mb-1">
              PIN / Password
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoComplete="current-password"
              inputMode="numeric"
              className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary tracking-widest"
              placeholder="••••••"
              disabled={!ready}
            />
          </div>
          <button
            type="submit"
            disabled={busy || !ready}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? "Signing in..." : "Enter"}
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">
          Priyanshu — first time? Use PIN <span className="font-mono text-accent">111111</span> and you'll set your own.
        </p>
      </div>
    </div>
  );
}