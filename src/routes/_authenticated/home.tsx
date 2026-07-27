import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useProfile } from "@/hooks/useProfile";
import { Onboarding } from "@/components/Onboarding";
import { Wind, HandHeart, BookHeart, Mail, Music, Sparkles, Shield, ChevronRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

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
  const [loading, setLoading] = useState(true);
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
      setLoading(false);
    })();
  }, []);

  return (
    <AppShell showMoon>
      <Onboarding />
      <section className="pt-6">
        {loading ? (
          <>
            <div className="qm-skeleton h-9 w-3/4" />
            <div className="qm-skeleton mt-3 h-4 w-full max-w-sm" />
            <div className="qm-skeleton mt-2 h-4 w-2/3" />
          </>
        ) : (
          <>
            <h1 className="text-3xl font-semibold tracking-tight qm-shimmer-text">
              {s.greeting}
            </h1>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              {s.subtitle}
            </p>
            {profile && (
              <p className="mt-2 text-xs uppercase tracking-[0.15em] text-accent/80">
                Hi, {profile.display_name}
              </p>
            )}
          </>
        )}
      </section>

      <section className="mt-8 grid grid-cols-1 gap-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="qm-skeleton h-[76px] w-full rounded-2xl" />
            ))
          : TILES.map((t) => (
              <Tile key={t.to} to={t.to} Icon={t.Icon} label={t.label} hint={t.hint} />
            ))}
      </section>

      {profile?.role === "admin" && (
        <div className="mt-6 flex justify-center">
          <Link
            to="/admin"
            className="qm-glass inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-accent transition hover:brightness-125"
          >
            <Shield size={14} />
            Admin dashboard
          </Link>
        </div>
      )}
    </AppShell>
  );
}

const TILES: { to: string; Icon: LucideIcon; label: string; hint: string }[] = [
  { to: "/breathe", Icon: Wind, label: "Breathe With Me", hint: "A gentle 4·7·8 rhythm" },
  { to: "/hold", Icon: HandHeart, label: "Hold My Hand", hint: "Press and be held" },
  { to: "/journal", Icon: BookHeart, label: "Empty Your Mind", hint: "Private thoughts" },
  { to: "/comfort", Icon: Mail, label: "Comfort Corner", hint: "Letters for tough days" },
  { to: "/sounds", Icon: Music, label: "Sleep Sounds", hint: "Rain, ocean, night" },
  { to: "/heart", Icon: Sparkles, label: "Heart Constellation", hint: "A little magic ✨" },
];

function Tile({
  to,
  Icon,
  label,
  hint,
}: {
  to: string;
  Icon: LucideIcon;
  label: string;
  hint: string;
}): ReactNode {
  return (
    <Link
      to={to}
      className="qm-tile flex items-center gap-4 rounded-2xl p-4"
    >
      <div className="qm-tile-icon shrink-0">
        <Icon size={22} strokeWidth={1.8} className="text-primary-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-base font-medium leading-tight">{label}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>
      </div>
      <ChevronRight size={18} className="text-muted-foreground/60" />
    </Link>
  );
}