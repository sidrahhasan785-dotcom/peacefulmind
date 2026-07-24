import { useMemo } from "react";

type Star = { x: number; y: number; size: number; delay: number };
type Particle = { x: number; y: number; size: number; delay: number; duration: number };

function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

export function NightSky({ moon = true, className = "" }: { moon?: boolean; className?: string }) {
  const { stars, particles } = useMemo(() => {
    const rand = seededRand(42);
    const stars: Star[] = Array.from({ length: 90 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      size: rand() * 2 + 0.5,
      delay: rand() * 4,
    }));
    const particles: Particle[] = Array.from({ length: 14 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      size: rand() * 60 + 40,
      delay: rand() * 8,
      duration: 10 + rand() * 10,
    }));
    return { stars, particles };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #1a2a55 0%, #0B132B 60%, #05070f 100%)",
      }}
      aria-hidden
    >
      {stars.map((s, i) => (
        <span
          key={i}
          className="qm-star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {particles.map((p, i) => (
        <span
          key={`p${i}`}
          className="qm-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
      {moon && (
        <div
          className="qm-moon absolute rounded-full"
          style={{
            width: 160,
            height: 160,
            top: "6%",
            right: "8%",
          }}
        />
      )}
    </div>
  );
}