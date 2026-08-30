import { useMemo } from "react";

interface Manara3DSphereProps {
  /** Percentage of the viewport height the sphere stage should occupy. */
  heightPercent?: number;
  /** Seconds for one full rotation. */
  speed?: number;
  labels?: string[];
}

const RING_COUNT = 14;

/** Pure-CSS 3D rotating wireframe sphere used as the Manara page centerpiece. */
const Manara3DSphere = ({ heightPercent = 70, speed = 24, labels = [] }: Manara3DSphereProps) => {
  const rings = useMemo(() => Array.from({ length: RING_COUNT }, (_, i) => (180 / RING_COUNT) * i), []);
  const height = Math.min(Math.max(heightPercent, 20), 100);

  return (
    <div
      className="relative flex w-full items-center justify-center overflow-hidden"
      style={{ height: `${height}vh` }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes manara-spin { from { transform: rotateX(-18deg) rotateY(0deg); } to { transform: rotateX(-18deg) rotateY(360deg); } }
        @keyframes manara-orbit { from { transform: rotateZ(0deg); } to { transform: rotateZ(360deg); } }
        @keyframes manara-pulse { 0%,100% { opacity: .35; transform: scale(1); } 50% { opacity: .65; transform: scale(1.06); } }
        @media (prefers-reduced-motion: reduce) {
          .manara-globe, .manara-orbit { animation: none !important; }
        }
      `}</style>

      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute h-[75%] w-[75%] rounded-full bg-primary/20 blur-3xl"
        style={{ animation: "manara-pulse 6s ease-in-out infinite" }}
      />

      {/* Sphere stage */}
      <div className="relative aspect-square h-[86%] max-w-full" style={{ perspective: "1200px" }}>
        <div
          className="manara-globe relative h-full w-full"
          style={{ transformStyle: "preserve-3d", animation: `manara-spin ${speed}s linear infinite` }}
        >
          {/* Meridian rings */}
          {rings.map((deg) => (
            <div
              key={`m-${deg}`}
              className="absolute inset-0 rounded-full border border-primary/30"
              style={{ transform: `rotateY(${deg}deg)`, transformStyle: "preserve-3d" }}
            />
          ))}
          {/* Latitude rings */}
          {rings.slice(0, 7).map((_, i) => {
            const t = (i + 1) / 8;
            const scale = Math.sin(Math.PI * t);
            const offset = Math.cos(Math.PI * t);
            return (
              <div
                key={`l-${i}`}
                className="absolute inset-0 rounded-full border border-primary/20"
                style={{
                  transform: `rotateX(90deg) translateZ(${offset * -50}%) scale(${scale})`,
                }}
              />
            );
          })}
          {/* Core */}
          <div className="absolute inset-[30%] rounded-full bg-gradient-to-br from-primary/40 to-primary/5 blur-md" />
        </div>

        {/* Orbiting labels */}
        {labels.length > 0 && (
          <div
            className="manara-orbit pointer-events-none absolute inset-0"
            style={{ animation: `manara-orbit ${Math.round(speed * 1.8)}s linear infinite` }}
          >
            {labels.slice(0, 6).map((label, i) => {
              const angle = (360 / Math.min(labels.length, 6)) * i;
              return (
                <span
                  key={label + i}
                  className="absolute left-1/2 top-1/2 whitespace-nowrap rounded-full border border-border/60 bg-background/70 px-3 py-1 text-[11px] font-medium text-foreground/90 shadow-sm backdrop-blur"
                  style={{
                    transform: `rotate(${angle}deg) translate(0, -52%) translateY(-46vh) rotate(${-angle}deg)`,
                    transformOrigin: "center",
                    marginInlineStart: "-3rem",
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Manara3DSphere;
