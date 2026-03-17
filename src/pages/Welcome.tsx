import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, User, Headphones, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/hn-driver-logo.png";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";

const Welcome = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  const handleRoleSelect = async (roleId: string, path: string) => {
    localStorage.setItem("hn_user_role", roleId);
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Already logged in — go to dashboard
        navigate(path);
      } else {
        // Not logged in — go to login with role
        navigate(`/login?role=${roleId}`);
      }
    } catch {
      navigate(`/login?role=${roleId}`);
    } finally {
      setChecking(false);
    }
  };

  const roles = [
    {
      id: "driver",
      icon: Car,
      title: "سائق",
      desc: "سجل كسائق وابدأ بالربح",
      path: "/driver",
      glowClass: "glow-ring-orange",
      iconColor: "text-primary",
    },
    {
      id: "client",
      icon: User,
      title: "عميل",
      desc: "اطلب رحلة بسهولة وأمان",
      path: "/client",
      glowClass: "glow-ring-blue",
      iconColor: "text-info",
    },
    {
      id: "delivery",
      icon: null,
      customLogo: deliveryLogo,
      title: "توصيل",
      desc: "أرسل طرودك بسرعة وأمان",
      path: "/delivery",
      glowClass: "glow-ring-green",
      iconColor: "text-success",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-10 gradient-hero particles-bg relative">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center pt-8 relative z-10"
      >
        <div className="relative flex items-center justify-center">
          {/* Outer glowing ring */}
          <motion.div
            className="absolute w-56 h-56 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, hsl(32, 95%, 55%), hsl(45, 95%, 65%), hsl(32, 95%, 55%))",
              padding: "3px",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          >
            <div className="w-full h-full rounded-full bg-background" />
          </motion.div>
          {/* Inner glow */}
          <motion.div
            className="absolute w-52 h-52 rounded-full bg-primary/10 blur-2xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Logo */}
          <motion.img
            src={logo}
            alt="HN Driver"
            className="w-48 h-48 rounded-full object-cover border-4 border-primary/30 shadow-2xl relative z-10"
            animate={{
              scale: [1, 1.04, 1],
              boxShadow: [
                "0 0 20px hsl(32, 95%, 55%, 0.2)",
                "0 0 40px hsl(32, 95%, 55%, 0.5)",
                "0 0 20px hsl(32, 95%, 55%, 0.2)",
              ],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>
        <h1 className="text-4xl font-bold font-display text-gradient-primary mt-4 tracking-wider">HN DRIVER</h1>
        <p className="text-muted-foreground mt-1 text-sm">اختر نوع حسابك للمتابعة</p>
      </motion.div>

      {/* Role Cards */}
      <div className="flex flex-col gap-4 w-full max-w-sm relative z-10">
        {roles.map((role, i) => (
          <motion.button
            key={role.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
            onClick={() => handleRoleSelect(role.id, role.path)}
            disabled={checking}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="group relative overflow-hidden rounded-2xl p-5 gradient-card border border-border hover:border-primary/40 transition-all duration-300 disabled:opacity-50 cursor-pointer select-none"
          >
            <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
            <div className="flex items-center gap-4">
              {role.customLogo ? (
                <img src={role.customLogo} alt={role.title} className="w-12 h-12 rounded-full object-cover border-2 border-success/30 shadow-lg shadow-success/20" />
              ) : (
                <div className={`icon-circle ${role.glowClass}`}>
                  <role.icon className={`w-6 h-6 ${role.iconColor}`} />
                </div>
              )}
              <div className="text-right flex-1">
                <h3 className="text-lg font-bold text-foreground">{role.title}</h3>
                <p className="text-sm text-muted-foreground">{role.desc}</p>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Features strip */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex gap-6 items-center relative z-10"
      >
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-xs">آمن</span>
          <Shield className="w-3.5 h-3.5 text-success" />
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-xs">دعم ٢٤/٧</span>
          <Headphones className="w-3.5 h-3.5 text-info" />
        </div>
        <p className="text-xs text-muted-foreground">بالمتابعة أنت توافق على الشروط والأحكام</p>
      </motion.div>
    </div>
  );
};

export default Welcome;
