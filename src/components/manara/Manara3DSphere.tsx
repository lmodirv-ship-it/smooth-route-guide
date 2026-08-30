import { useMemo } from "react";

interface Manara3DSphereProps {
  /** Percentage of the viewport height the sphere stage should occupy. */
  heightPercent?: number;
  /** Seconds for one full rotation. */
  speed?: number;
  labels?: string[];
}

const RING_COUNT = 14;
const PARTICLE_COUNT = 24;

/** Pure-CSS 3D glowing wireframe sphere — radiant, brighter, dynamic hue-shifting. */
const Manara3DSphere = ({ heightPercent = 70, speed = 24, labels = [] }: Manara3DSphereProps) => {
  const rings = useMemo(() => Array.from({ length: RING_COUNT }, (_, i) => (180 / RING_COUNT) * i), []);
  const height = Math.min(Math.max(heightPercent, 20), 100);

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        angle: (360 / PARTICLE_COUNT) * i,
        delay: (i % 6) * 0.7,
        size: 4 + (i % 3) * 2,
        radius: 54 + (i % 4) * 10,
      })),
    []
  );

  return (
    <div
      className="relative flex w-full items-center justify-center overflow-hidden"
      style={{ height: `${height}vh` }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes manara-spin { from { transform: rotateX(-18deg) rotateY(0deg); } to { transform: rotateX(-18deg) rotateY(360deg); } }
        @keyframes manara-orbit { from { transform: rotateZ(0deg); } to { transform: rotateZ(360deg); } }
        @keyframes manara-pulse { 0%,100% { opacity: .6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
        @keyframes manara-core { 0%,100% { opacity: .95; transform: scale(1); filter: brightness(1.3); } 50% { opacity: 1; transform: scale(1.15); filter: brightness(2); } }
        @keyframes manara-rays { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes manara-ray-pulse { 0%,100% { opacity: .25; } 50% { opacity: .7; } }
        @keyframes manara-spark { 0% { opacity: 0; transform: rotate(var(--a)) translateX(30%) scale(.4); } 40% { opacity: 1; } 100% { opacity: 0; transform: rotate(var(--a)) translateX(var(--r)) scale(1.3); } }
        /* Dynamic color cycle — rotates hue through the full spectrum */
        @keyframes manara-hue { from { filter: hue-rotate(0deg) saturate(1.3); } to { filter: hue-rotate(360deg) saturate(1.3); } }
        @keyframes manara-breathe { 0%,100% { filter: hue-rotate(0deg) brightness(1.1) saturate(1.4); } 50% { filter: hue-rotate(180deg) brightness(1.6) saturate(1.8); } }
        @media (prefers-reduced-motion: reduce) {
          .manara-globe, .manara-orbit, .manara-rays-wrap, .manara-spark, .manara-hue-cycle { animation: none !important; }
        }
      `}</style>

      {/* Whole scene cycles colors dynamically */}
      <div
        className="manara-hue-cycle absolute inset-0 flex items-center justify-center"
        style={{ animation: "manara-hue 18s linear infinite" }}
      >
        {/* Rotating light rays */}
        <div
          className="manara-rays-wrap pointer-events-none absolute inset-0"
          style={{ animation: "manara-rays 60s linear infinite" }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={`ray-${i}`}
              className="absolute left-1/2 top-1/2 h-[150%] w-[4px] origin-center"
              style={{
                transform: `translate(-50%, -50%) rotate(${(180 / 12) * i}deg)`,
                background:
                  "linear-gradient(to bottom, transparent, hsl(var(--primary) / 0.55) 30%, hsl(var(--primary) / 0.55) 70%, transparent)",
                filter: "blur(3px)",
                animation: `manara-ray-pulse ${4 + i * 0.5}s ease-in-out infinite`,
              }}
            />
          ))}
        </div>

        {/* Ambient radiant glow layers — brighter */}
        <div
          className="pointer-events-none absolute h-[95%] w-[95%] rounded-full bg-primary/35 blur-3xl"
          style={{ animation: "manara-pulse 6s ease-in-out infinite" }}
        />
        <div
          className="pointer-events-none absolute h-[60%] w-[60%] rounded-full bg-primary/55 blur-2xl"
          style={{ animation: "manara-pulse 4s ease-in-out infinite reverse" }}
        />

        {/* Sphere stage */}
        <div className="relative aspect-square h-[86%] max-w-full" style={{ perspective: "1200px" }}>
          {/* Luminous core — intense */}
          <div
            className="pointer-events-none absolute inset-[15%] rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.65) 35%, hsl(var(--primary) / 0.2) 65%, transparent 100%)",
              boxShadow:
                "0 0 80px 30px hsl(var(--primary) / 0.65), 0 0 180px 70px hsl(var(--primary) / 0.35)",
              animation: "manara-core 5s ease-in-out infinite",
            }}
          />

          <div
            className="manara-globe relative h-full w-full"
            style={{ transformStyle: "preserve-3d", animation: `manara-spin ${speed}s linear infinite` }}
          >
            {/* Meridian rings — high glow */}
            {rings.map((deg) => (
              <div
                key={`m-${deg}`}
                className="absolute inset-0 rounded-full border-2 border-primary/70"
                style={{
                  transform: `rotateY(${deg}deg)`,
                  transformStyle: "preserve-3d",
                  boxShadow:
                    "0 0 20px hsl(var(--primary) / 0.8), inset 0 0 20px hsl(var(--primary) / 0.5)",
                }}
              />
            ))}
            {/* Latitude rings — high glow */}
            {rings.slice(0, 7).map((_, i) => {
              const t = (i + 1) / 8;
              const scale = Math.sin(Math.PI * t);
              const offset = Math.cos(Math.PI * t);
              return (
                <div
                  key={`l-${i}`}
                  className="absolute inset-0 rounded-full border-2 border-primary/60"
                  style={{
                    transform: `rotateX(90deg) translateZ(${offset * -50}%) scale(${scale})`,
                    boxShadow: "0 0 16px hsl(var(--primary) / 0.7)",
                  }}
                />
              );
            })}
            {/* Blazing center */}
            <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-primary to-primary/30 blur-sm" />
            <div className="absolute inset-[40%] rounded-full bg-primary blur-md" />
            <div className="absolute inset-[46%] rounded-full bg-white/80 blur-sm" />
          </div>

          {/* Spark particles */}
          {particles.map((p, i) => (
            <span
              key={`sp-${i}`}
              className="manara-spark pointer-events-none absolute left-1/2 top-1/2 rounded-full bg-primary"
              style={
                {
                  width: p.size,
                  height: p.size,
                  boxShadow: "0 0 14px 3px hsl(var(--primary) / 0.9)",
                  "--a": `${p.angle}deg`,
                  "--r": `${p.radius}%`,
                  animation: `manara-spark ${3.5 + (i % 5)}s linear ${p.delay}s infinite`,
                } as React.CSSProperties
              }
            />
          ))}

          {/* Orbiting labels */}
          {labels.length > 0 && (
            <div
              className="manara-orbit pointer-events-none absolute inset-0"
              style={{ animation: `manara-orbit ${Math.round(speed * 1.8)}s linear infinite` }}
            >
              {labels.slice(0, 6).map((label, i) => {
                const angle = (360 / Math.min(labels.length, 6)) * i;
                return (
                  <div
                    key={label + i}
                    className="absolute inset-0"
                    style={{ transform: `rotate(${angle}deg)` }}
                  >
                    <span
                      className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-primary/50 bg-background/60 px-3 py-1 text-[11px] font-medium text-foreground shadow-[0_0_14px_hsl(var(--primary)/0.5)] backdrop-blur"
                      style={{ transform: `translate(-50%, -50%) rotate(${-angle}deg)` }}
                    >
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Manara3DSphere;
