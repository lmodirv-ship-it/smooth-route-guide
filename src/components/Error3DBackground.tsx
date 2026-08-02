import { useEffect, useState } from "react";

type StyleKey = "edge" | "neon" | "nature";

const STYLES: Record<StyleKey, {
  glowA: string; glowB: string; grid: string; shape: string; overlay: string;
}> = {
  edge: {
    glowA: "hsl(var(--primary) / 0.22)",
    glowB: "hsl(var(--accent) / 0.20)",
    grid: "hsl(var(--primary) / 0.35)",
    shape: "hsl(var(--primary) / 0.30)",
    overlay: "radial-gradient(ellipse at 50% 100%, hsl(var(--primary) / 0.10), transparent 60%)",
  },
  neon: {
    glowA: "hsl(300 90% 60% / 0.28)",
    glowB: "hsl(190 95% 55% / 0.28)",
    grid: "hsl(300 95% 65% / 0.40)",
    shape: "hsl(190 95% 60% / 0.45)",
    overlay: "linear-gradient(to top, hsl(280 90% 50% / 0.18), transparent 65%)",
  },
  nature: {
    glowA: "hsl(140 60% 45% / 0.26)",
    glowB: "hsl(45 80% 60% / 0.22)",
    grid: "hsl(140 55% 50% / 0.30)",
    shape: "hsl(90 50% 55% / 0.35)",
    overlay: "linear-gradient(to top, hsl(150 55% 30% / 0.20), transparent 65%)",
  },
};

const ORDER: StyleKey[] = ["edge", "neon", "nature"];

// Decorative animated 3D background that cycles between Edge / Neon / Nature styles.
export default function Error3DBackground() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % ORDER.length), 6000);
    return () => clearInterval(t);
  }, []);
  const key = ORDER[i];
  const s = STYLES[key];
  const isNature = key === "nature";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-background">
      <div className="absolute inset-0 transition-all duration-1000" style={{ background: s.overlay }} />

      {/* depth glows */}
      <div
        className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full blur-[120px] transition-all duration-1000"
        style={{ background: s.glowA }}
      />
      <div
        className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full blur-[120px] transition-all duration-1000"
        style={{ background: s.glowB }}
      />

      {!isNature && (
        <>
          {/* perspective grid floor */}
          <div
            className="absolute inset-x-0 bottom-0 h-[65%] opacity-40"
            style={{
              perspective: "600px",
              maskImage: "linear-gradient(to top, black, transparent)",
              WebkitMaskImage: "linear-gradient(to top, black, transparent)",
            }}
          >
            <div
              className="absolute inset-0 origin-bottom animate-[grid-move_14s_linear_infinite] transition-all duration-1000"
              style={{
                transform: "rotateX(72deg)",
                backgroundImage: `linear-gradient(${s.grid} 1px, transparent 1px), linear-gradient(90deg, ${s.grid} 1px, transparent 1px)`,
                backgroundSize: "60px 60px",
              }}
            />
          </div>

          {/* floating 3D shapes */}
          <div
            className="absolute left-[12%] top-[22%] h-24 w-24 rotate-45 rounded-2xl border shadow-2xl animate-[float-3d_9s_ease-in-out_infinite] transition-all duration-1000"
            style={{ borderColor: s.shape, background: s.glowA }}
          />
          <div
            className="absolute right-[14%] top-[30%] h-16 w-16 rotate-12 rounded-xl border shadow-xl animate-[float-3d_11s_ease-in-out_infinite_reverse] transition-all duration-1000"
            style={{ borderColor: s.shape, background: s.glowB }}
          />
          <div
            className="absolute right-[28%] bottom-[24%] h-12 w-12 -rotate-12 rounded-lg border animate-[float-3d_13s_ease-in-out_infinite] transition-all duration-1000"
            style={{ borderColor: s.shape, background: s.glowA }}
          />
        </>
      )}

      {isNature && <NatureScene />}

      <style>{`
        @keyframes grid-move { from { background-position: 0 0; } to { background-position: 0 60px; } }
        @keyframes float-3d {
          0%,100% { transform: translate3d(0,0,0) rotate(45deg) scale(1); }
          50% { transform: translate3d(0,-28px,0) rotate(60deg) scale(1.08); }
        }
        @keyframes cloud-drift { from { transform: translateX(-20%); } to { transform: translateX(120%); } }
        @keyframes bird-fly {
          0% { transform: translate3d(-10vw, 0, 0) scale(0.7); }
          50% { transform: translate3d(45vw, -40px, 0) scale(1); }
          100% { transform: translate3d(110vw, -10px, 0) scale(0.8); }
        }
        @keyframes wing-flap { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(0.4); } }
        @keyframes river-flow { from { background-position: 0 0; } to { background-position: 300px 0; } }
        @keyframes sway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
      `}</style>
    </div>
  );
}

/* Real nature photography with a slow cinematic Ken Burns motion and soft light haze. */
function NatureScene() {
  return (
    <div className="absolute inset-0 animate-fade-in overflow-hidden">
      <img
        src={natureScene}
        alt=""
        width={1920}
        height={1088}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover animate-[ken-burns_28s_ease-in-out_infinite_alternate]"
      />
      {/* warm light haze */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 78% 42%, hsl(38 100% 70% / 0.28), transparent 55%)" }}
      />
      {/* depth vignette for text contrast */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 35%, hsl(220 40% 6% / 0.55) 100%)" }}
      />
      <style>{`
        @keyframes ken-burns {
          from { transform: scale(1) translate3d(0,0,0); }
          to { transform: scale(1.12) translate3d(-1.5%, -1%, 0); }
        }
      `}</style>
    </div>
  );
}
