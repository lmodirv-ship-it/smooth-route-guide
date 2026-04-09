import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { cairo, montserrat } from "../fonts";

export const Scene2Tech = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phone float
  const phoneY = spring({ frame: frame - 20, fps, config: { damping: 15, stiffness: 60 } });
  const phoneScale = interpolate(phoneY, [0, 1], [0.7, 1]);
  const phoneOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const phoneFloat = Math.sin(frame / 30) * 8;

  // Features stagger
  const features = [
    { icon: "📱", text: "تسجيل سريع برقم الهاتف", delay: 100 },
    { icon: "🎁", text: "رصيد 50 درهم فوراً", delay: 140 },
    { icon: "🗺️", text: "GPS مباشر ودقيق", delay: 180 },
    { icon: "💳", text: "دفع نقدي أو إلكتروني", delay: 220 },
    { icon: "🤖", text: "مساعد ذكي 24/7", delay: 260 },
  ];

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 20 } });
  const titleY = interpolate(titleSpring, [0, 1], [50, 0]);

  // Ambient particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    x: (i * 137.5) % 100,
    y: (i * 73.3) % 100,
    size: 3 + (i % 4) * 2,
    speed: 0.3 + (i % 3) * 0.2,
  }));

  const endFade = interpolate(frame, [820, 870], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "linear-gradient(135deg, #0a0a1a 0%, #0f1025 40%, #0a0f1a 100%)" }}>
      {/* Grid pattern */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "linear-gradient(rgba(232,160,50,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,160,50,0.03) 1px, transparent 1px)",
        backgroundSize: "60px 60px",
        opacity: 0.5,
      }} />

      {/* Particles */}
      {particles.map((p, i) => {
        const py = (p.y + frame * p.speed * 0.1) % 110 - 5;
        return (
          <div key={i} style={{
            position: "absolute", left: `${p.x}%`, top: `${py}%`,
            width: p.size, height: p.size, borderRadius: "50%",
            background: i % 3 === 0 ? "rgba(232,160,50,0.3)" : "rgba(100,150,255,0.2)",
            boxShadow: `0 0 ${p.size * 3}px ${i % 3 === 0 ? "rgba(232,160,50,0.2)" : "rgba(100,150,255,0.15)"}`,
          }} />
        );
      })}

      <AbsoluteFill style={{ opacity: endFade }}>
        {/* Title */}
        <div style={{
          position: "absolute", top: "6%", left: "50%",
          transform: `translateX(-50%) translateY(${titleY}px)`,
          textAlign: "center", direction: "rtl",
        }}>
          <div style={{
            fontFamily: cairo, fontSize: 64, fontWeight: 900,
            color: "white",
            textShadow: "0 0 40px rgba(232,160,50,0.3)",
          }}>
            الحل والتكنولوجيا
          </div>
          <div style={{
            fontFamily: cairo, fontSize: 28, fontWeight: 400,
            color: "rgba(255,255,255,0.5)", marginTop: 8,
          }}>
            تطبيق ذكي بين يديك
          </div>
        </div>

        {/* Phone mockup */}
        <div style={{
          position: "absolute", top: "22%", left: "50%",
          transform: `translateX(-50%) scale(${phoneScale}) translateY(${phoneFloat}px)`,
          opacity: phoneOpacity,
        }}>
          <div style={{
            width: 500, height: 500, borderRadius: 40,
            overflow: "hidden",
            boxShadow: "0 20px 80px rgba(232,160,50,0.2), 0 0 120px rgba(100,150,255,0.1)",
            border: "2px solid rgba(232,160,50,0.2)",
          }}>
            <Img src={staticFile("images/app-showcase.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </div>

        {/* Features list */}
        <div style={{
          position: "absolute", bottom: "8%", left: "50%",
          transform: "translateX(-50%)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
          direction: "rtl",
        }}>
          {features.map((f, i) => {
            const fSpring = spring({ frame: frame - f.delay, fps, config: { damping: 15 } });
            const fScale = interpolate(fSpring, [0, 1], [0.5, 1]);
            const fOpacity = interpolate(frame, [f.delay, f.delay + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{
                transform: `scale(${fScale})`, opacity: fOpacity,
                display: "flex", alignItems: "center", gap: 16,
                padding: "14px 36px", borderRadius: 20,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <span style={{ fontSize: 32 }}>{f.icon}</span>
                <span style={{ fontFamily: cairo, fontSize: 26, fontWeight: 700, color: "white" }}>{f.text}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
