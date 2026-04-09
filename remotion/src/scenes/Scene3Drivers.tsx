import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { cairo, montserrat } from "../fonts";

export const Scene3Drivers = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, 900], [1, 1.1], { extrapolateRight: "clamp" });

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 20 } });
  const titleY = interpolate(titleSpring, [0, 1], [60, 0]);
  const titleOpacity = interpolate(frame, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const benefits = [
    { icon: "💰", title: "عمولة 0%", desc: "في البداية — اربح كل شيء", delay: 120 },
    { icon: "🕐", title: "حرية كاملة", desc: "اختر وقتك ومنطقتك", delay: 170 },
    { icon: "📞", title: "دعم 24/7", desc: "فريق دعم مغربي متخصص", delay: 220 },
    { icon: "📈", title: "نمو مستمر", desc: "مكافآت وترقيات شهرية", delay: 270 },
  ];

  const counterValue = Math.floor(interpolate(frame, [300, 500], [0, 10000], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  const counterOpacity = interpolate(frame, [300, 330], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const endFade = interpolate(frame, [820, 870], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0f" }}>
      {/* Driver bg */}
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img src={staticFile("images/driver-happy.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>

      {/* Overlay */}
      <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(10,10,15,0.92) 0%, rgba(10,10,15,0.6) 50%, rgba(10,10,15,0.3) 100%)" }} />

      <AbsoluteFill style={{ opacity: endFade }}>
        {/* Content - left side */}
        <div style={{
          position: "absolute", top: "10%", left: "5%",
          width: "50%", direction: "rtl",
        }}>
          {/* Title */}
          <div style={{
            transform: `translateY(${titleY}px)`, opacity: titleOpacity,
          }}>
            <div style={{
              fontFamily: cairo, fontSize: 72, fontWeight: 900,
              color: "white", lineHeight: 1.2,
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
            }}>
              فرص للسائقين
            </div>
            <div style={{
              fontFamily: cairo, fontSize: 30, fontWeight: 400,
              color: "rgba(255,255,255,0.6)", marginTop: 12,
            }}>
              انضم لعائلة HN Driver في طنجة
            </div>
            <div style={{
              width: 200, height: 4, borderRadius: 2, marginTop: 20,
              background: "linear-gradient(90deg, #f5c842, transparent)",
            }} />
          </div>

          {/* Benefits */}
          <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 20 }}>
            {benefits.map((b, i) => {
              const bSpring = spring({ frame: frame - b.delay, fps, config: { damping: 15 } });
              const bX = interpolate(bSpring, [0, 1], [-100, 0]);
              const bOpacity = interpolate(frame, [b.delay, b.delay + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={i} style={{
                  transform: `translateX(${bX}px)`, opacity: bOpacity,
                  display: "flex", alignItems: "center", gap: 20,
                  padding: "20px 30px", borderRadius: 20,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRight: "3px solid rgba(232,160,50,0.5)",
                }}>
                  <span style={{ fontSize: 42 }}>{b.icon}</span>
                  <div>
                    <div style={{ fontFamily: cairo, fontSize: 28, fontWeight: 900, color: "#f5c842" }}>{b.title}</div>
                    <div style={{ fontFamily: cairo, fontSize: 22, fontWeight: 400, color: "rgba(255,255,255,0.7)" }}>{b.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Counter */}
          <div style={{
            marginTop: 40, opacity: counterOpacity,
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: montserrat, fontSize: 80, fontWeight: 900,
              background: "linear-gradient(170deg, #f5c842, #e8a032)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              +{counterValue.toLocaleString()}
            </div>
            <div style={{ fontFamily: cairo, fontSize: 24, color: "rgba(255,255,255,0.5)" }}>
              سائق نشط على المنصة
            </div>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
