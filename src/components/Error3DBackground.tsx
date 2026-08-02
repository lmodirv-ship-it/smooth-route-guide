import natureScene from "@/assets/nature-scene.jpg";

// Static, calm nature background used by the 403 / 500 pages (no motion, fixed colors).
export default function Error3DBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-background">
      <img
        src={natureScene}
        alt=""
        width={1920}
        height={1088}
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* soft warm light */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 78% 42%, hsl(38 100% 70% / 0.18), transparent 55%)" }}
      />
      {/* vignette for text contrast */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 50%, transparent 35%, hsl(220 40% 6% / 0.55) 100%)" }}
      />
    </div>
  );
}
