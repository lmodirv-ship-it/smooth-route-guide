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

/* A layered nature scene: sky, sun, clouds, mountains, flying birds and a flowing river. */
function NatureScene() {
  return (
    <div className="absolute inset-0 animate-fade-in">
      {/* sky */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(to bottom, hsl(200 85% 62%) 0%, hsl(195 70% 72%) 40%, hsl(45 80% 78%) 70%, hsl(150 45% 45%) 100%)" }}
      />
      {/* sun */}
      <div
        className="absolute right-[18%] top-[14%] h-24 w-24 rounded-full"
        style={{ background: "radial-gradient(circle, hsl(48 100% 72%), hsl(40 100% 60% / 0.15) 70%, transparent)", boxShadow: "0 0 90px hsl(45 100% 65% / 0.8)" }}
      />
      {/* clouds */}
      {[
        { top: "12%", size: 120, dur: 42, delay: 0, o: 0.85 },
        { top: "24%", size: 80, dur: 55, delay: 8, o: 0.7 },
        { top: "34%", size: 160, dur: 68, delay: 18, o: 0.6 },
      ].map((c, idx) => (
        <div
          key={idx}
          className="absolute"
          style={{
            top: c.top,
            width: c.size,
            height: c.size * 0.35,
            opacity: c.o,
            borderRadius: "9999px",
            background: "hsl(0 0% 100% / 0.9)",
            filter: "blur(6px)",
            animation: `cloud-drift ${c.dur}s linear ${c.delay}s infinite`,
          }}
        />
      ))}

      {/* mountains */}
      <svg className="absolute inset-x-0 bottom-[38%] w-full" viewBox="0 0 1200 240" preserveAspectRatio="none" style={{ height: "26%" }}>
        <path d="M0,240 L180,80 L320,240 Z" fill="hsl(150 25% 42%)" />
        <path d="M220,240 L430,40 L640,240 Z" fill="hsl(150 30% 34%)" />
        <path d="M540,240 L760,110 L980,240 Z" fill="hsl(150 25% 40%)" />
        <path d="M880,240 L1080,70 L1200,240 Z" fill="hsl(150 30% 30%)" />
        <path d="M400,60 L430,40 L462,62 L430,74 Z" fill="hsl(0 0% 100% / 0.85)" />
        <path d="M1054,88 L1080,70 L1108,90 L1080,100 Z" fill="hsl(0 0% 100% / 0.8)" />
      </svg>

      {/* trees */}
      {[8, 16, 88, 94].map((left, idx) => (
        <div key={idx} className="absolute bottom-[36%] origin-bottom" style={{ left: `${left}%`, animation: `sway ${5 + idx}s ease-in-out infinite` }}>
          <div className="mx-auto h-10 w-1.5 rounded-sm" style={{ background: "hsl(25 45% 28%)" }} />
          <div className="absolute -top-8 left-1/2 h-12 w-12 -translate-x-1/2 rounded-full" style={{ background: "hsl(140 45% 32%)" }} />
        </div>
      ))}

      {/* river */}
      <div
        className="absolute inset-x-0 bottom-0 h-[40%]"
        style={{
          background: "linear-gradient(to bottom, hsl(200 70% 52%), hsl(210 75% 38%))",
          clipPath: "polygon(35% 0, 65% 0, 100% 100%, 0 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, hsl(0 0% 100% / 0.35) 0 2px, transparent 2px 40px)",
            animation: "river-flow 6s linear infinite",
          }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "repeating-linear-gradient(90deg, hsl(0 0% 100% / 0.25) 0 3px, transparent 3px 70px)",
            animation: "river-flow 11s linear infinite reverse",
          }}
        />
      </div>
      {/* river banks */}
      <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{ background: "hsl(120 40% 34%)", clipPath: "polygon(0 0, 35% 0, 0 100%)" }} />
      <div className="absolute inset-x-0 bottom-0 h-[40%]" style={{ background: "hsl(120 40% 30%)", clipPath: "polygon(65% 0, 100% 0, 100% 100%)" }} />

      {/* birds */}
      {[
        { top: "18%", dur: 22, delay: 0, scale: 1 },
        { top: "26%", dur: 28, delay: 4, scale: 0.75 },
        { top: "13%", dur: 34, delay: 9, scale: 0.6 },
        { top: "31%", dur: 26, delay: 14, scale: 0.5 },
      ].map((b, idx) => (
        <div key={idx} className="absolute left-0" style={{ top: b.top, animation: `bird-fly ${b.dur}s linear ${b.delay}s infinite` }}>
          <svg width={34 * b.scale} height={16 * b.scale} viewBox="0 0 34 16" style={{ animation: `wing-flap ${0.6 + idx * 0.1}s ease-in-out infinite`, transformOrigin: "center" }}>
            <path d="M1 10 C 7 1, 12 1, 17 8 C 22 1, 27 1, 33 10" fill="none" stroke="hsl(220 25% 20%)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}
