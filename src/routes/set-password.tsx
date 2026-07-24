import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NightSky } from "@/components/NightSky";
import { toast } from "sonner";

export const Route = createFileRoute("/set-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Set your password — QuietMind" }] }),
  component: SetPasswordPage,
});

function SetPasswordPage() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) navigate({ to: "/auth" });
    })();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 6) return toast.error("Please choose at least 6 characters.");
    if (pw !== pw2) return toast.error("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setBusy(false);
      return toast.error(error.message);
    }
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      await supabase.from("profiles").update({ must_change_password: false }).eq("id", u.user.id);
    }
    setBusy(false);
    toast.success("Your password is set. Only you know it.");
    navigate({ to: "/home" });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <NightSky />
      <div className="qm-glass qm-fade-in w-full max-w-sm rounded-3xl border border-white/10 p-8 shadow-2xl">
        <h1 className="text-xl font-semibold text-foreground text-center">Choose your private password</h1>
        <p className="mt-2 text-sm text-muted-foreground text-center">
          Only you will know it. Not even Sidrah.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-xl bg-secondary/60 border border-border px-4 py-3 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            disabled={busy}
            className="w-full rounded-xl bg-primary text-primary-foreground py-3 font-medium disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}