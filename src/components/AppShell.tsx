import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { NightSky } from "./NightSky";
import { BottomNav } from "./BottomNav";
import { useEffect, type ReactNode } from "react";
import { heartbeat } from "@/lib/quietmind.functions";

export function AppShell({
  children,
  title,
  back,
  activity,
  showMoon = true,
  hideBottomNav = false,
}: {
  children: ReactNode;
  title?: string;
  back?: string;
  activity?: string | null;
  showMoon?: boolean;
  hideBottomNav?: boolean;
}) {
  const navigate = useNavigate();
  useEffect(() => {
    heartbeat({ data: { activity: activity ?? null } }).catch(() => {});
    const iv = setInterval(() => {
      heartbeat({ data: { activity: activity ?? null } }).catch(() => {});
    }, 60_000);
    return () => clearInterval(iv);
  }, [activity]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen text-foreground">
      <NightSky moon={showMoon} />
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        {back ? (
          <Link to={back} className="qm-glass rounded-full px-3 py-2 text-sm">
            ← Back
          </Link>
        ) : (
          <span />
        )}
        {title && <div className="text-sm font-medium text-muted-foreground">{title}</div>}
        <button
          onClick={signOut}
          className="qm-glass rounded-full px-3 py-2 text-xs text-muted-foreground"
        >
          Sign out
        </button>
      </header>
      <main className="px-5 pb-[calc(env(safe-area-inset-bottom)+110px)] qm-fade-in">{children}</main>
      {!hideBottomNav && <BottomNav />}
    </div>
  );
}