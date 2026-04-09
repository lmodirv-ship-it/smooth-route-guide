import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { cairo, montserrat } from "../fonts";

export const Scene4Global = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, 900], [1.1, 1.25], { extrapolateRight: "clamp" });
  const bgY = interpolate(frame, [0, 900], [0, -40], { extrapolateRight: "clamp" });

  const titleSpring = spring({ frame: frame - 20, fps, config: { damping: 18 } });
  const titleScale = interpolate(titleSpring, [0, 1], [0.6, 1]);
  const titleOpacity = interpolate(frame, [20, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const cities = [
    { name: "طنجة 🇲🇦", delay: 100, color: "#f5c842" },
    { name: "مدريد 🇪🇸", delay: 180, color: "#ff6b6b" },
    { name: "باريس 🇫🇷", delay: 260, color: "#6bb5ff" },
  ];

  const ctaSpring = spring({ frame: frame - 400, fps, config: { damping: 12, stiffness: 100 } });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0, 1]);

  const arrowProgress = interpolate(frame, [130, 350], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // End logo
  const endLogoSpring = spring({ frame: frame - 600, fps, config: { damping: 15 } });
  const endLogoScale = interpolate(endLogoSpring, [0, 1], [0, 1]);
  const endLogoOpacity = interpolate(frame, [600, 640], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const finalPulse = Math.sin(frame / 15) * 0.03 + 1;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050510" }}>
      {/* Background */}
      <AbsoluteFill style={{ transform: `scale(${bgScale}) translateY(${bgY}px)` }}>
        <Img src={staticFile("images/global-vision.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(5,5,16,0.7) 0%, rgba(5,5,16,0.4) 40%, rgba(5,5,16,0.85) 100%)" }} />

      {/* Title */}
      <div style={{
        position: "absolute", top: "10%", left: "50%",
        transform: `translateX(-50%) scale(${titleScale})`,
        opacity: titleOpacity, textAlign: "center", direction: "rtl",
      }}>
        <div style={{
          fontFamily: cairo, fontSize: 72, fontWeight: 900,
          color: "white", lineHeight: 1.2,
          textShadow: "0 0 60px rgba(232,160,50,0.3)",
        }}>
          الرؤية العالمية
        </div>
        <div style={{
          fontFamily: cairo, fontSize: 34, fontWeight: 400,
          color: "rgba(255,255,255,0.6)", marginTop: 10,
        }}>
          انطلقنا من طنجة.. لنصل إلى قلب أوروبا
        </div>
      </div>

      {/* Cities path */}
      <div style={{
        position: "absolute", top: "38%", left: "50%",
        transform: "translateX(-50%)",
        display: "flex", alignItems: "center", gap: 60,
      }}>
        {cities.map((city, i) => {
          const cSpring = spring({ frame: frame - city.delay, fps, config: { damping: 12 } });
          const cScale = interpolate(cSpring, [0, 1], [0, 1]);
          const cOpacity = interpolate(frame, [city.delay, city.delay + 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 40 }}>
              <div style={{
                transform: `scale(${cScale})`, opacity: cOpacity,
                padding: "24px 50px", borderRadius: 24,
                background: "rgba(255,255,255,0.06)",
                border: `2px solid ${city.color}40`,
                boxShadow: `0 0 40px ${city.color}20`,
                textAlign: "center",
              }}>
                <div style={{ fontFamily: cairo, fontSize: 40, fontWeight: 900, color: city.color }}>
                  {city.name}
                </div>
              </div>
              {i < cities.length - 1 && (
                <div style={{
                  width: 80, height: 3, borderRadius: 2,
                  background: `linear-gradient(90deg, ${city.color}80, ${cities[i + 1].color}80)`,
                  opacity: interpolate(arrowProgress, [i * 0.33, (i + 1) * 0.33], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div style={{
        position: "absolute", bottom: "22%", left: "50%",
        transform: `translateX(-50%) scale(${ctaScale * finalPulse})`,
        textAlign: "center",
      }}>
        <div style={{
          padding: "24px 80px", borderRadius: 60,
          background: "linear-gradient(135deg, #f5c842, #e8a032)",
          boxShadow: "0 10px 50px rgba(232,160,50,0.4)",
        }}>
          <span style={{
            fontFamily: cairo, fontSize: 36, fontWeight: 900,
            color: "#0a0a0f",
          }}>
            سجل الآن — كن جزءاً من العالمية
          </span>
        </div>
      </div>

      {/* End Logo */}
      <div style={{
        position: "absolute", bottom: "6%", left: "50%",
        transform: `translateX(-50%) scale(${endLogoScale})`,
        opacity: endLogoOpacity,
        display: "flex", alignItems: "center", gap: 20,
      }}>
        <Img src={staticFile("images/logo.png")} style={{
          width: 70, height: 70, borderRadius: "50%",
          border: "2px solid rgba(232,160,50,0.4)",
        }} />
        <div style={{
          fontFamily: montserrat, fontSize: 40, fontWeight: 900,
          background: "linear-gradient(170deg, #f5c842, #e8a032)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          HN DRIVER
        </div>
      </div>
    </AbsoluteFill>
  );
};
