import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

const { fontFamily: montserrat } = loadMontserrat("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const { fontFamily: poppins } = loadPoppins("normal", { weights: ["400", "600", "700"], subsets: ["latin"] });

const GOLD = "#f5c842";
const DARK = "#0a0a12";

// ─── Scene 0: Platform Intro ───
const Scene0Intro = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({ frame: frame - 5, fps, config: { damping: 15 } });
  const titleSpring = spring({ frame: frame - 25, fps, config: { damping: 18 } });
  const line1Op = interpolate(frame, [50, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line1Y = interpolate(spring({ frame: frame - 50, fps, config: { damping: 20 } }), [0, 1], [30, 0]);
  const line2Op = interpolate(frame, [75, 95], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line2Y = interpolate(spring({ frame: frame - 75, fps, config: { damping: 20 } }), [0, 1], [30, 0]);
  const line3Op = interpolate(frame, [100, 120], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line3Y = interpolate(spring({ frame: frame - 100, fps, config: { damping: 20 } }), [0, 1], [30, 0]);
  const badgeScale = spring({ frame: frame - 130, fps, config: { damping: 12, stiffness: 120 } });

  const bgRotate = interpolate(frame, [0, 180], [0, 360], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      {/* Animated radial bg */}
      <AbsoluteFill style={{
        background: `conic-gradient(from ${bgRotate}deg at 50% 50%, rgba(245,200,66,0.06) 0%, transparent 30%, rgba(245,200,66,0.04) 50%, transparent 70%, rgba(245,200,66,0.06) 100%)`,
      }} />
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse at center, rgba(245,200,66,0.08) 0%, transparent 60%)",
      }} />

      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)", textAlign: "center", width: "80%",
      }}>
        {/* Logo */}
        <Img src={staticFile("images/logo.png")} style={{
          width: 180, height: 180, borderRadius: "50%",
          border: `5px solid ${GOLD}80`, margin: "0 auto 20px",
          transform: `scale(${interpolate(logoScale, [0, 1], [0, 1])})`,
          boxShadow: "0 10px 60px rgba(245,200,66,0.4)",
        }} />

        {/* Title */}
        <div style={{
          fontFamily: montserrat, fontSize: 80, fontWeight: 900,
          background: `linear-gradient(170deg, ${GOLD}, #e8a032)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          transform: `scale(${interpolate(titleSpring, [0, 1], [0.6, 1])})`,
          opacity: interpolate(titleSpring, [0, 0.3], [0, 1]),
        }}>
          HN DRIVER
        </div>

        {/* Platform description lines */}
        <div style={{
          fontFamily: poppins, fontSize: 30, color: "rgba(255,255,255,0.85)",
          marginTop: 30, lineHeight: 1.6,
        }}>
          <div style={{ opacity: line1Op, transform: `translateY(${line1Y}px)` }}>
            🚗 Plateforme intelligente de transport et livraison
          </div>
          <div style={{ opacity: line2Op, transform: `translateY(${line2Y}px)`, marginTop: 10 }}>
            🍽️ Courses · Repas · Colis — tout dans une seule app
          </div>
          <div style={{ opacity: line3Op, transform: `translateY(${line3Y}px)`, marginTop: 10 }}>
            📍 Basée à Tanger · Vision internationale 🇲🇦 🇪🇸 🇫🇷
          </div>
        </div>

        {/* Badge */}
        <div style={{
          marginTop: 35, display: "inline-block",
          padding: "14px 40px", borderRadius: 50,
          background: `linear-gradient(135deg, ${GOLD}, #e8a032)`,
          fontFamily: montserrat, fontSize: 26, fontWeight: 900, color: DARK,
          transform: `scale(${badgeScale})`,
          boxShadow: "0 8px 30px rgba(245,200,66,0.4)",
        }}>
          0% commission pour les nouveaux chauffeurs
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 1: Tangier Hero ───
const Scene1Tangier = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgScale = interpolate(frame, [0, 180], [1.15, 1.25], { extrapolateRight: "clamp" });
  const titleSpring = spring({ frame: frame - 15, fps, config: { damping: 18 } });
  const titleY = interpolate(titleSpring, [0, 1], [80, 0]);
  const titleOp = interpolate(frame, [15, 45], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subOp = interpolate(frame, [40, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const subY = interpolate(spring({ frame: frame - 40, fps, config: { damping: 20 } }), [0, 1], [40, 0]);
  const badgeScale = spring({ frame: frame - 80, fps, config: { damping: 12, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img src={staticFile("images/tangier-city.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,10,18,0.3) 0%, rgba(10,10,18,0.7) 60%, rgba(10,10,18,0.95) 100%)" }} />
      
      <div style={{ position: "absolute", bottom: "15%", left: "8%", right: "8%" }}>
        <div style={{
          fontFamily: montserrat, fontSize: 82, fontWeight: 900, color: "white",
          transform: `translateY(${titleY}px)`, opacity: titleOp, lineHeight: 1.1,
          textShadow: "0 4px 40px rgba(0,0,0,0.5)",
        }}>
          HN DRIVER
        </div>
        <div style={{
          fontFamily: poppins, fontSize: 36, fontWeight: 600,
          color: "rgba(255,255,255,0.85)", marginTop: 16,
          transform: `translateY(${subY}px)`, opacity: subOp,
        }}>
          La plateforme N°1 de transport et livraison à Tanger
        </div>
        <div style={{
          marginTop: 30, display: "inline-block",
          padding: "14px 40px", borderRadius: 50,
          background: `linear-gradient(135deg, ${GOLD}, #e8a032)`,
          fontFamily: montserrat, fontSize: 28, fontWeight: 900, color: DARK,
          transform: `scale(${badgeScale})`,
          boxShadow: "0 8px 30px rgba(245,200,66,0.4)",
        }}>
          🎉 100% GRATUIT — Inscrivez-vous !
        </div>
      </div>

      {/* Logo */}
      <Img src={staticFile("images/logo.png")} style={{
        position: "absolute", top: 30, left: 40,
        width: 140, height: 140, borderRadius: "50%",
        border: `4px solid ${GOLD}60`,
        boxShadow: "0 8px 40px rgba(245,200,66,0.3)",
        opacity: interpolate(frame, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }} />
    </AbsoluteFill>
  );
};

// ─── Scene 2: Livraison Express ───
const Scene2Delivery = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgScale = interpolate(frame, [0, 180], [1.1, 1.2], { extrapolateRight: "clamp" });
  const bgX = interpolate(frame, [0, 180], [0, -30], { extrapolateRight: "clamp" });

  const items = [
    { text: "Livraison en 30 min", icon: "⚡", delay: 30 },
    { text: "Restaurants & Magasins", icon: "🍽️", delay: 55 },
    { text: "Suivi en temps réel", icon: "📍", delay: 80 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      {/* Left: Food image */}
      <div style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%", overflow: "hidden" }}>
        <Img src={staticFile("images/moroccan-food.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${bgScale}) translateX(${bgX}px)`,
        }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 60%, rgba(10,10,18,1) 100%)" }} />
      </div>

      {/* Right: Content */}
      <div style={{ position: "absolute", right: "5%", top: "15%", width: "42%" }}>
        <div style={{
          fontFamily: montserrat, fontSize: 22, fontWeight: 700, color: GOLD,
          letterSpacing: 4, textTransform: "uppercase",
          opacity: interpolate(frame, [5, 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          Livraison Express
        </div>
        <div style={{
          fontFamily: montserrat, fontSize: 58, fontWeight: 900, color: "white",
          lineHeight: 1.15, marginTop: 16,
          opacity: interpolate(frame, [15, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
          transform: `translateY(${interpolate(spring({ frame: frame - 15, fps, config: { damping: 18 } }), [0, 1], [50, 0])}px)`,
        }}>
          Vos plats préférés, livrés chez vous
        </div>

        <div style={{ marginTop: 50, display: "flex", flexDirection: "column", gap: 24 }}>
          {items.map((item, i) => {
            const s = spring({ frame: frame - item.delay, fps, config: { damping: 15 } });
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", gap: 20,
                padding: "18px 28px", borderRadius: 16,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderLeft: `4px solid ${GOLD}`,
                transform: `translateX(${interpolate(s, [0, 1], [80, 0])}px)`,
                opacity: interpolate(s, [0, 1], [0, 1]),
              }}>
                <span style={{ fontSize: 36 }}>{item.icon}</span>
                <span style={{ fontFamily: poppins, fontSize: 26, fontWeight: 600, color: "white" }}>{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 3: Transport Privé ───
const Scene3Ride = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgScale = interpolate(frame, [0, 180], [1.1, 1.2], { extrapolateRight: "clamp" });

  const titleSpring = spring({ frame: frame - 10, fps, config: { damping: 18 } });
  const priceSpring = spring({ frame: frame - 70, fps, config: { damping: 12, stiffness: 100 } });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <AbsoluteFill style={{ transform: `scale(${bgScale})` }}>
        <Img src={staticFile("images/ride-service.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(10,10,18,0.4) 0%, rgba(10,10,18,0.85) 70%, rgba(10,10,18,0.98) 100%)" }} />

      <div style={{ position: "absolute", bottom: "12%", left: "8%", right: "8%" }}>
        <div style={{
          fontFamily: montserrat, fontSize: 22, fontWeight: 700, color: GOLD,
          letterSpacing: 4, textTransform: "uppercase",
          opacity: interpolate(frame, [5, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          Transport Privé
        </div>
        <div style={{
          fontFamily: montserrat, fontSize: 62, fontWeight: 900, color: "white",
          lineHeight: 1.15, marginTop: 12,
          transform: `translateY(${interpolate(titleSpring, [0, 1], [60, 0])}px)`,
          opacity: interpolate(titleSpring, [0, 0.3], [0, 1]),
        }}>
          Votre chauffeur privé à Tanger
        </div>
        <div style={{
          fontFamily: poppins, fontSize: 30, color: "rgba(255,255,255,0.75)", marginTop: 16,
          opacity: interpolate(frame, [35, 55], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          Confort, sécurité et prix compétitifs — 24h/24
        </div>

        <div style={{
          marginTop: 30, display: "inline-flex", alignItems: "center", gap: 16,
          padding: "16px 40px", borderRadius: 20,
          background: "rgba(245,200,66,0.12)", border: `2px solid ${GOLD}50`,
          transform: `scale(${interpolate(priceSpring, [0, 1], [0.5, 1])})`,
          opacity: interpolate(priceSpring, [0, 0.3], [0, 1]),
        }}>
          <span style={{ fontSize: 40 }}>🎁</span>
          <span style={{ fontFamily: montserrat, fontSize: 28, fontWeight: 900, color: GOLD }}>
            50 MAD de crédit offert
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 4: Livreur & Client ───
const Scene4People = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const leftScale = interpolate(frame, [0, 180], [1.05, 1.15], { extrapolateRight: "clamp" });
  const rightScale = interpolate(frame, [0, 180], [1.1, 1.2], { extrapolateRight: "clamp" });

  const stats = [
    { label: "Chauffeurs actifs", value: "+500", delay: 40 },
    { label: "Commandes livrées", value: "+10 000", delay: 65 },
    { label: "Clients satisfaits", value: "98%", delay: 90 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      {/* Split images */}
      <div style={{ position: "absolute", left: 0, top: 0, width: "50%", height: "100%", overflow: "hidden" }}>
        <Img src={staticFile("images/delivery-driver.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover", transform: `scale(${leftScale})`,
        }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 50%, rgba(10,10,18,0.8) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(10,10,18,0.9) 100%)" }} />
      </div>
      <div style={{ position: "absolute", right: 0, top: 0, width: "50%", height: "100%", overflow: "hidden" }}>
        <Img src={staticFile("images/customer-delivery.jpg")} style={{
          width: "100%", height: "100%", objectFit: "cover", transform: `scale(${rightScale})`,
        }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(270deg, transparent 50%, rgba(10,10,18,0.8) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 50%, rgba(10,10,18,0.9) 100%)" }} />
      </div>

      {/* Stats overlay */}
      <div style={{
        position: "absolute", bottom: "10%", left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 50,
      }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: frame - stat.delay, fps, config: { damping: 14 } });
          return (
            <div key={i} style={{
              textAlign: "center",
              transform: `scale(${interpolate(s, [0, 1], [0.5, 1])})`,
              opacity: interpolate(s, [0, 0.3], [0, 1]),
            }}>
              <div style={{ fontFamily: montserrat, fontSize: 60, fontWeight: 900, color: GOLD }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: poppins, fontSize: 22, color: "rgba(255,255,255,0.7)", marginTop: 6 }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Title */}
      <div style={{
        position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)",
        textAlign: "center",
        opacity: interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
      }}>
        <div style={{ fontFamily: montserrat, fontSize: 52, fontWeight: 900, color: "white" }}>
          Une communauté qui grandit
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Scene 5: CTA Final ───
const Scene5CTA = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bgScale = interpolate(frame, [0, 180], [1.1, 1.3], { extrapolateRight: "clamp" });
  const logoSpring = spring({ frame: frame - 10, fps, config: { damping: 15 } });
  const titleSpring = spring({ frame: frame - 30, fps, config: { damping: 18 } });
  const ctaSpring = spring({ frame: frame - 60, fps, config: { damping: 10, stiffness: 100 } });
  const pulse = Math.sin(frame / 12) * 0.04 + 1;
  const urlOp = interpolate(frame, [90, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: DARK }}>
      <AbsoluteFill style={{ transform: `scale(${bgScale})`, opacity: 0.3 }}>
        <Img src={staticFile("images/app-phone.jpg")} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(245,200,66,0.08) 0%, ${DARK} 70%)` }} />

      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
      }}>
        <Img src={staticFile("images/logo.png")} style={{
          width: 200, height: 200, borderRadius: "50%",
          border: `5px solid ${GOLD}80`, margin: "0 auto 30px",
          transform: `scale(${interpolate(logoSpring, [0, 1], [0, 1])})`,
          boxShadow: "0 10px 60px rgba(245,200,66,0.4)",
        }} />
        <div style={{
          fontFamily: montserrat, fontSize: 72, fontWeight: 900,
          background: `linear-gradient(170deg, ${GOLD}, #e8a032)`,
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          transform: `scale(${interpolate(titleSpring, [0, 1], [0.7, 1])})`,
          opacity: interpolate(titleSpring, [0, 0.3], [0, 1]),
        }}>
          HN DRIVER
        </div>
        <div style={{
          fontFamily: poppins, fontSize: 32, color: "rgba(255,255,255,0.7)", marginTop: 10,
          opacity: interpolate(frame, [45, 65], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}>
          Transport & Livraison — 100% Gratuit
        </div>

        <div style={{
          marginTop: 40,
          padding: "20px 70px", borderRadius: 60,
          background: `linear-gradient(135deg, ${GOLD}, #e8a032)`,
          fontFamily: montserrat, fontSize: 34, fontWeight: 900, color: DARK,
          transform: `scale(${interpolate(ctaSpring, [0, 1], [0, 1]) * pulse})`,
          boxShadow: "0 10px 50px rgba(245,200,66,0.4)",
          display: "inline-block",
        }}>
          Téléchargez l'app maintenant !
        </div>

        <div style={{
          marginTop: 35, fontFamily: montserrat, fontSize: 38, fontWeight: 700,
          color: "white", opacity: urlOp,
          letterSpacing: 2,
          padding: "10px 40px", borderRadius: 12,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          display: "inline-block",
        }}>
          www.hn-driver.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ─── Main Composition ───
export const PromoFR = () => {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={180}><Scene0Intro /></Sequence>
      <Sequence from={180} durationInFrames={180}><Scene1Tangier /></Sequence>
      <Sequence from={360} durationInFrames={180}><Scene2Delivery /></Sequence>
      <Sequence from={540} durationInFrames={180}><Scene3Ride /></Sequence>
      <Sequence from={720} durationInFrames={180}><Scene4People /></Sequence>
      <Sequence from={900} durationInFrames={180}><Scene5CTA /></Sequence>

      {/* Persistent brand overlay */}
      <div style={{
        position: "absolute", top: 20, left: 30, zIndex: 100,
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <Img src={staticFile("images/logo.png")} style={{
          width: 60, height: 60, borderRadius: "50%",
          border: `2px solid ${GOLD}60`,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        }} />
        <div style={{
          fontFamily: montserrat, fontSize: 20, fontWeight: 700,
          color: "white", textShadow: "0 2px 10px rgba(0,0,0,0.8)",
        }}>
          www.hn-driver.com
        </div>
      </div>
    </AbsoluteFill>
  );
};
