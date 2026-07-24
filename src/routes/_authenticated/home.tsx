import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Home — QuietMind" },
      { name: "description", content: "Your calm home. Breathe, be held, or rest." },
    ],
  }),
  component: Home,
});

type Settings = { greeting: string; subtitle: string; wallpaper: string };

function Home() {
  const { profile } = useProfile();
  const [s, setS] = useState<Settings>({
    greeting: "Good Evening 🌙",
    subtitle: "You don't have to carry everything alone tonight.",
    wallpaper: "",
  });
  const [partner, setPartner] = useState<{ display_name: string; last_seen: string | null; activity: string | null } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("app_settings").select("key,value");
      if (data) {
        const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
        setS({
          greeting: map.home_greeting || "Good Evening 🌙",
          subtitle: map.home_subtitle || "You don't have to carry everything alone tonight.",
          wallpaper: map.wallpaper_url || "",
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,last_seen,activity")
        .neq("id", profile.id)
        .maybeSingle();
      if (data) setPartner(data);
    })();
    const iv = setInterval(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name,last_seen,activity")
        .neq("id", profile.id)
        .maybeSingle();
      if (data) setPartner(data);
    }, 30_000);
    return () => clearInterval(iv);
  }, [profile]);

  const partnerOnline =
    partner?.last_seen && Date.now() - new Date(partner.last_seen).getTime() < 90_000;

  return (
    <AppShell showMoon>
      <div className="pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{s.greeting}</h1>
        <p className="mt-2 text-muted-foreground max-w-sm">{s.subtitle}</p>
        {profile && (
          <p className="mt-1 text-xs text-accent">Hi, {profile.display_name}.</p>
        )}
        {partner && (
          <div className="mt-4 qm-glass rounded-2xl px-4 py-3 text-sm text-muted-foreground border border-white/5">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${partnerOnline ? "bg-emerald-400" : "bg-slate-500"}`}
              />
              <span className="text-foreground">{partner.display_name}</span>
              <span>·</span>
              <span>
                {partnerOnline
                  ? partner.activity
                    ? partner.activity
                    : "🟢 online"
                  : partner.last_seen
                    ? "🌙 last seen " + formatRelative(partner.last_seen)
                    : "not seen yet"}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3">
        <Tile to="/breathe" icon="🫁" label="Breathe With Me" />
        <Tile to="/hold" icon="🫂" label="Hold My Hand" />
        <Tile to="/journal" icon="📝" label="Empty Your Mind" />
        <Tile to="/comfort" icon="💌" label="Comfort Corner" />
        <Tile to="/sounds" icon="🎵" label="Sleep Sounds" />
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link
          to="/settings"
          className="qm-glass rounded-full px-4 py-2 text-sm text-muted-foreground"
        >
          Settings
        </Link>
        {profile?.role === "admin" && (
          <Link
            to="/admin"
            className="qm-glass rounded-full px-4 py-2 text-sm text-accent"
          >
            Admin
          </Link>
        )}
      </div>
    </AppShell>
  );
}

function Tile({ to, icon, label }: { to: string; icon: string; label: string }) {
  return (
    <Link
      to={to}
      className="qm-glass rounded-2xl border border-white/10 p-5 flex items-center gap-4 transition active:scale-[0.98] hover:brightness-110"
    >
      <div className="text-3xl">{icon}</div>
      <div className="text-lg font-medium">{label}</div>
    </Link>
  );
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleString();
}