import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { cairo, montserrat } from "../fonts";

export const Scene1Identity = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, 900], [1, 1.15], { extrapolateRight: "clamp" });
  const bgX = interpolate(frame, [0, 900], [0, -50], { extrapolateRight: "clamp" });

  const logoScale = spring({ frame: frame - 15, fps, config: { damping: 15, stiffness: 80 } });
  const logoOpacity = interpolate(frame, [15, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const titleY = interpolate(spring({ frame: frame - 40, fps, config: { damping: 20 } }), [0, 1], [60, 0]);
  const titleOpacity = interpolate(frame, [40, 60], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const subtitleOpacity = interpolate(frame, [70, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subtitleY = interpolate(spring({ frame: frame - 70, fps, config: { damping: 20 } }), [0, 1], [40, 0]);

  const taglineOpacity = interpolate(frame, [110, 140], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const lineWidth = interpolate(frame, [50, 90], [0, 300], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const overlayOpacity = interpolate(frame, [0, 30], [1, 0.55], { extrapolateRight: "clamp" });

  const badge1 = spring({ frame: frame - 160, fps, config: { damping: 12 } });
  const badge2 = spring({ frame: frame - 190, fps, config: { damping: 12 } });

  const shimmerX = interpolate(frame, [200, 300], [-400, 2400], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // End card fade
  const endFade = interpolate(frame, [820, 870], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Background image with parallax */}
      <AbsoluteFill style={{ transform: `scale(${bgScale}) translateX(${bgX}px)` }}>
        <Img src={staticFile("images/tangier-aerial.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Dark overlay */}
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(10,10,15,${overlayOpacity}) 0%, rgba(10,10,15,0.3) 40%, rgba(10,10,15,0.85) 100%)` }} />

      {/* Ambient glow */}
      <div style={{
        position: "absolute", bottom: "20%", left: "50%", transform: "translateX(-50%)",
        width: 800, height: 400, borderRadius: "50%",
        background: "radial-gradient(ellipse, rgba(232,160,50,0.12) 0%, transparent 70%)",
        opacity: interpolate(frame, [40, 80], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }} />

      <AbsoluteFill style={{ opacity: endFade }}>
        {/* Logo */}
        <div style={{
          position: "absolute", top: "18%", left: "50%",
          transform: `translateX(-50%) scale(${logoScale})`,
          opacity: logoOpacity,
        }}>
          <Img src={staticFile("images/logo.png")} style={{
            width: 180, height: 180, borderRadius: "50%",
            border: "4px solid rgba(232,160,50,0.5)",
            boxShadow: "0 0 60px rgba(232,160,50,0.3)",
          }} />
        </div>

        {/* Title */}
        <div style={{
          position: "absolute", top: "42%", left: "50%",
          transform: `translateX(-50%) translateY(${titleY}px)`,
          opacity: titleOpacity, textAlign: "center",
        }}>
          <div style={{
            fontFamily: montserrat, fontSize: 120, fontWeight: 900,
            letterSpacing: "0.08em",
            background: "linear-gradient(170deg, #f5c842 0%, #e8a032 40%, #d4881e 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 4px 20px rgba(232,160,50,0.4))",
          }}>
            HN DRIVER
          </div>
          {/* Golden line */}
          <div style={{
            width: lineWidth, height: 4, borderRadius: 2,
            background: "linear-gradient(90deg, transparent, #f5c842, transparent)",
            margin: "10px auto 0",
          }} />
        </div>

        {/* Subtitle Arabic */}
        <div style={{
          position: "absolute", top: "60%", left: "50%",
          transform: `translateX(-50%) translateY(${subtitleY}px)`,
          opacity: subtitleOpacity, textAlign: "center",
          fontFamily: cairo, fontSize: 52, fontWeight: 700,
          color: "rgba(255,255,255,0.95)",
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          direction: "rtl",
        }}>
          من قلب طنجة.. نبدأ الحكاية
        </div>

        {/* Tagline */}
        <div style={{
          position: "absolute", top: "72%", left: "50%",
          transform: "translateX(-50%)",
          opacity: taglineOpacity, textAlign: "center",
          fontFamily: cairo, fontSize: 30, fontWeight: 400,
          color: "rgba(255,255,255,0.6)",
          direction: "rtl",
        }}>
          منصة النقل والتوصيل الأقوى في الشمال
        </div>

        {/* Badges */}
        <div style={{
          position: "absolute", bottom: "10%", left: "50%",
          transform: "translateX(-50%)",
          display: "flex", gap: 30,
        }}>
          <div style={{
            transform: `scale(${badge1})`,
            padding: "16px 40px", borderRadius: 50,
            background: "rgba(232,160,50,0.15)", border: "1px solid rgba(232,160,50,0.4)",
            fontFamily: cairo, fontSize: 26, fontWeight: 700,
            color: "#f5c842", direction: "rtl",
          }}>
            🎁 رصيد 50 درهم مجاناً
          </div>
          <div style={{
            transform: `scale(${badge2})`,
            padding: "16px 40px", borderRadius: 50,
            background: "rgba(100,200,120,0.12)", border: "1px solid rgba(100,200,120,0.3)",
            fontFamily: cairo, fontSize: 26, fontWeight: 700,
            color: "#7ddf8a", direction: "rtl",
          }}>
            🚗 عمولة 0% للسائقين
          </div>
        </div>
      </AbsoluteFill>

      {/* Shimmer effect */}
      <div style={{
        position: "absolute", top: 0, left: shimmerX, width: 200, height: "100%",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
        transform: "skewX(-15deg)",
      }} />
    </AbsoluteFill>
  );
};
