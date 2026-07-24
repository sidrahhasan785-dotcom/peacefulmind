import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — QuietMind" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile } = useProfile();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  async function changePw() {
    if (pw.length < 6) return toast.error("At least 6 characters.");
    if (pw !== pw2) return toast.error("Passwords don't match.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    setPw("");
    setPw2("");
    toast.success("Password updated.");
  }

  return (
    <AppShell back="/home">
      <div className="pt-4 space-y-6 max-w-md">
        <h1 className="text-2xl font-semibold">Settings</h1>

        {profile && (
          <div className="qm-glass rounded-2xl border border-white/10 p-4">
            <div className="text-sm text-muted-foreground">Signed in as</div>
            <div className="text-lg">{profile.display_name}</div>
            <div className="text-xs text-accent">Role: {profile.role}</div>
          </div>
        )}

        <div className="qm-glass rounded-2xl border border-white/10 p-4 space-y-3">
          <div className="text-sm font-medium">Change password / PIN</div>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl bg-secondary/60 border border-border px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            placeholder="Confirm"
            className="w-full rounded-xl bg-secondary/60 border border-border px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={changePw}
            disabled={busy}
            className="w-full rounded-xl bg-primary text-primary-foreground py-2 disabled:opacity-60"
          >
            {busy ? "Saving..." : "Update"}
          </button>
        </div>

        <div className="qm-glass rounded-2xl border border-white/10 p-4 text-sm text-muted-foreground">
          <div className="text-foreground font-medium">QuietMind</div>
          <p className="mt-1">A private space made with love, for two.</p>
          <p className="mt-1 text-xs">Dark mode always. Your quiet is protected.</p>
        </div>
      </div>
    </AppShell>
  );
}