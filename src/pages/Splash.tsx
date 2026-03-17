import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logo from "@/assets/hn-driver-logo.png";

const Splash = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => navigate("/welcome"), 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gradient-hero particles-bg relative">
      {/* Glow rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 2.5 : 0, opacity: phase >= 1 ? 0.08 : 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="w-40 h-40 rounded-full border-2 border-primary absolute"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 4 : 0, opacity: phase >= 1 ? 0.04 : 0 }}
          transition={{ duration: 2, ease: "easeOut", delay: 0.3 }}
          className="w-40 h-40 rounded-full border border-primary absolute"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.5, y: 20 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, scale: phase >= 1 ? 1 : 0.5, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative">
          <img src={logo} alt="HN Driver" className="w-28 h-28 mx-auto mb-5 drop-shadow-2xl" />
          <div className="absolute inset-0 w-28 h-28 mx-auto rounded-full bg-primary/10 blur-2xl" />
        </div>
        <h1 className="text-5xl font-bold font-display text-gradient-primary tracking-wider">
          HN Driver
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 10 }}
          transition={{ duration: 0.5 }}
          className="text-muted-foreground mt-3 text-center text-sm"
        >
          منصة التوصيل الذكية
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="absolute bottom-12 flex gap-2"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-pulse"
            style={{ animationDelay: `${i * 0.3}s` }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default Splash;
