import { Link, useLocation } from "@tanstack/react-router";
import { Home, Wind, BookHeart, Music, Settings } from "lucide-react";

const items = [
  { to: "/home", label: "Home", Icon: Home },
  { to: "/breathe", label: "Breathe", Icon: Wind },
  { to: "/journal", label: "Journal", Icon: BookHeart },
  { to: "/sounds", label: "Sounds", Icon: Music },
  { to: "/settings", label: "Settings", Icon: Settings },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2 pointer-events-none"
    >
      <div className="qm-glass-strong pointer-events-auto mx-auto flex max-w-md items-center justify-around gap-1 rounded-full border border-white/10 px-2 py-1.5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]">
        {items.map(({ to, label, Icon }) => {
          const active = pathname === to || pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] transition-all ${
                active
                  ? "bg-white/10 text-foreground scale-105"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.7} />
              <span className="tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}