import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, User, Headphones, Shield } from "lucide-react";
import logo from "@/assets/hn-driver-logo.png";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";

const Welcome = () => {
  const navigate = useNavigate();

  const handleRoleSelect = (roleId: string, path: string) => {
    localStorage.setItem("hn_user_role", roleId);
    navigate(path);
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
        <div className="relative">
          <img src={logo} alt="HN Driver" className="w-36 h-36 mb-3" />
          <div className="absolute inset-0 w-36 h-36 rounded-full bg-primary/10 blur-xl" />
        </div>
        <h1 className="text-3xl font-bold font-display text-gradient-primary">HN Driver</h1>
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
            className="group relative overflow-hidden rounded-2xl p-5 gradient-card border border-border hover:border-primary/40 transition-all duration-300"
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
