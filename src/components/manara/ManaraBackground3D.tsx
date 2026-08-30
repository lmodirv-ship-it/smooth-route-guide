// ============= Manara 3D animated background =============
// Pure-CSS perspective grid + floating light orbs giving real depth.

const ORBS = [
  { size: 220, x: "8%", y: "12%", depth: 0.6, delay: 0, opacity: 0.22 },
  { size: 120, x: "82%", y: "8%", depth: 1, delay: 1.4, opacity: 0.3 },
  { size: 160, x: "70%", y: "62%", depth: 0.8, delay: 2.6, opacity: 0.2 },
  { size: 90, x: "18%", y: "70%", depth: 1.1, delay: 0.8, opacity: 0.28 },
  { size: 140, x: "45%", y: "30%", depth: 0.5, delay: 3.4, opacity: 0.16 },
];

const STARS = Array.from({ length: 40 }, (_, i) => ({
  x: (i * 37 + 13) % 100,
  y: (i * 53 + 7) % 100,
  size: 1 + (i % 3),
  delay: (i % 10) * 0.5,
  duration: 3 + (i % 5),
}));

/** Full-screen animated 3D-feel background: perspective floor grid + glowing orbs + twinkling stars. */
const ManaraBackground3D = () => (
  <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
    <style>{`
      @keyframes manara-grid-scroll { from { background-position-y: 0; } to { background-position-y: 80px; } }
      @keyframes manara-orb-float { 0%,100% { transform: translate3d(0,0,0) scale(1); } 50% { transform: translate3d(0,-30px,0) scale(1.08); } }
      @keyframes manara-star-twinkle { 0%,100% { opacity: .1; transform: scale(.8); } 50% { opacity: .9; transform: scale(1.2); } }
      @media (prefers-reduced-motion: reduce) {
        .manara-bg-grid, .manara-bg-orb, .manara-bg-star { animation: none !important; }
      }
    `}</style>

    {/* Deep space gradient */}
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_55%),radial-gradient(ellipse_at_bottom,hsl(var(--primary)/0.08),transparent_50%)]" />

    {/* 3D perspective floor grid */}
    <div
      className="absolute inset-x-0 bottom-0 h-[55%]"
      style={{ perspective: "600px", perspectiveOrigin: "50% 0%" }}
    >
      <div
        className="manara-bg-grid absolute inset-[-50%] origin-top"
        style={{
          transform: "rotateX(64deg)",
          backgroundImage:
            "linear-gradient(hsl(var(--primary) / 0.16) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.16) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          animation: "manara-grid-scroll 4s linear infinite",
          maskImage: "linear-gradient(to bottom, transparent, black 35%, black 90%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 35%, black 90%, transparent)",
        }}
      />
    </div>

    {/* Floating glowing orbs (parallax depth) */}
    {ORBS.map((orb, i) => (
      <div
        key={`orb-${i}`}
        className="manara-bg-orb absolute rounded-full bg-primary blur-3xl"
        style={{
          width: orb.size,
          height: orb.size,
          left: orb.x,
          top: orb.y,
          opacity: orb.opacity,
          animation: `manara-orb-float ${Math.round(9 * orb.depth + 6)}s ease-in-out ${orb.delay}s infinite`,
        }}
      />
    ))}

    {/* Twinkling stars */}
    {STARS.map((star, i) => (
      <span
        key={`star-${i}`}
        className="manara-bg-star absolute rounded-full bg-primary"
        style={{
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,
          boxShadow: "0 0 6px 1px hsl(var(--primary) / 0.6)",
          animation: `manara-star-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
        }}
      />
    ))}
  </div>
);

export default ManaraBackground3D;
