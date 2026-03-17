import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import splashLogo from "@/assets/designs/iindex.jpeg";

const Splash = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => {
      const unsub = onAuthStateChanged(auth, async (user) => {
        unsub();
        const savedRole = localStorage.getItem("hn_user_role");

        if (!user) {
          navigate(savedRole ? `/auth/${savedRole}` : "/welcome", { replace: true });
          return;
        }

        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          const role = snap.exists() ? snap.data().role : savedRole || "client";
          if (role === "driver") navigate("/driver", { replace: true });
          else if (role === "delivery") navigate("/delivery", { replace: true });
          else if (role === "admin") navigate("/admin", { replace: true });
          else if (role === "call_center") navigate("/call-center", { replace: true });
          else navigate("/client", { replace: true });
        } catch {
          navigate("/welcome", { replace: true });
        }
      });
    }, 3500);

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[200px] h-[200px] rounded-full bg-info/5 blur-[80px]" />
      </div>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 2.5 : 0, opacity: phase >= 1 ? 0.06 : 0 }}
          transition={{ duration: 1.8, ease: "easeOut" }}
          className="w-48 h-48 rounded-full border-2 border-primary absolute"
        />
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 4.5 : 0, opacity: phase >= 1 ? 0.03 : 0 }}
          transition={{ duration: 2.5, ease: "easeOut", delay: 0.3 }}
          className="w-48 h-48 rounded-full border border-primary absolute"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.3 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, scale: phase >= 1 ? 1 : 0.3 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="relative">
          <motion.img
            src={splashLogo}
            alt="HN Driver"
            className="w-72 h-auto mx-auto rounded-3xl drop-shadow-2xl"
            animate={{
              filter: phase >= 1
                ? ["drop-shadow(0 0 30px hsl(32, 95%, 55%, 0.4))", "drop-shadow(0 0 50px hsl(32, 95%, 55%, 0.6))", "drop-shadow(0 0 30px hsl(32, 95%, 55%, 0.4))"]
                : "none"
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 15 }}
        transition={{ duration: 0.6 }}
        className="text-muted-foreground mt-6 text-center text-sm tracking-wide relative z-10"
      >
        منصة التوصيل الذكية
      </motion.p>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 2 ? 1 : 0 }}
        transition={{ duration: 0.5 }}
        className="absolute bottom-14 flex gap-2"
      >
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-primary animate-pulse" style={{ animationDelay: `${i * 0.3}s` }} />
        ))}
      </motion.div>
    </div>
  );
};

export default Splash;
