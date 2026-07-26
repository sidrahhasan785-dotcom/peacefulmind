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

  return (
    <AppShell showMoon>
      <div className="pt-6">
        <h1 className="text-3xl font-semibold tracking-tight">{s.greeting}</h1>
        <p className="mt-2 text-muted-foreground max-w-sm">{s.subtitle}</p>
        {profile && (
          <p className="mt-1 text-xs text-accent">Hi, {profile.display_name}.</p>
        )}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-3">
        <Tile to="/breathe" icon="🫁" label="Breathe With Me" />
        <Tile to="/hold" icon="🫂" label="Hold My Hand" />
        <Tile to="/journal" icon="📝" label="Empty Your Mind" />
        <Tile to="/comfort" icon="💌" label="Comfort Corner" />
        <Tile to="/sounds" icon="🎵" label="Sleep Sounds" />
        <Tile to="/heart" icon="💖" label="Heart Constellation" />
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