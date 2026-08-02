// Decorative animated 3D background used on error/welcome pages.
export default function Error3DBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden bg-background">
      {/* depth glows */}
      <div className="absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-primary/20 blur-[120px]" />
      <div className="absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-accent/20 blur-[120px]" />

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
          className="absolute inset-0 origin-bottom animate-[grid-move_14s_linear_infinite]"
          style={{
            transform: "rotateX(72deg)",
            backgroundImage:
              "linear-gradient(hsl(var(--primary) / 0.35) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.35) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* floating 3D cubes */}
      <div className="absolute left-[12%] top-[22%] h-24 w-24 rotate-45 rounded-2xl border border-primary/30 bg-primary/5 shadow-2xl animate-[float-3d_9s_ease-in-out_infinite]" />
      <div className="absolute right-[14%] top-[30%] h-16 w-16 rotate-12 rounded-xl border border-accent/30 bg-accent/5 shadow-xl animate-[float-3d_11s_ease-in-out_infinite_reverse]" />
      <div className="absolute right-[28%] bottom-[24%] h-12 w-12 -rotate-12 rounded-lg border border-primary/25 bg-primary/5 animate-[float-3d_13s_ease-in-out_infinite]" />

      <style>{`
        @keyframes grid-move { from { background-position: 0 0; } to { background-position: 0 60px; } }
        @keyframes float-3d {
          0%,100% { transform: translate3d(0,0,0) rotate(45deg) scale(1); }
          50% { transform: translate3d(0,-28px,0) rotate(60deg) scale(1.08); }
        }
      `}</style>
    </div>
  );
}
