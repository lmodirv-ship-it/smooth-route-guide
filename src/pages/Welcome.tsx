import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, User, Headphones, Shield, LogOut, Download, Package, Store as StoreIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { dashboardForRole, ROLE_LABELS } from "@/lib/routes";
import { useI18n } from "@/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import logo from "@/assets/hn-driver-badge.png";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";
import NativeDownloadSection from "@/components/welcome/NativeDownloadSection";

type RoleId = "driver" | "client" | "delivery" | "store_owner";

const Welcome = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [checking, setChecking] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ email?: string | null; phone?: string | null } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const syncSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setCurrentUser(null);
        setUserRole(null);
        return;
      }

      setCurrentUser({
        email: session.user.email,
        phone: session.user.phone,
      });

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1);

      setUserRole(roles?.[0]?.role ?? null);
    };

    void syncSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      void syncSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("hn_user_role");
    setCurrentUser(null);
    setUserRole(null);
  };

  const handleRoleSelect = async (roleId: RoleId) => {
    localStorage.setItem("hn_user_role", roleId);
    setChecking(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/auth/${roleId}`);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .limit(1);

      const dbRole = roles?.[0]?.role ?? null;
      if (dbRole && dbRole !== "user") {
        navigate(dashboardForRole(dbRole));
        return;
      }

      navigate(dashboardForRole(roleId));
    } finally {
      setChecking(false);
    }
  };

  const scrollToMobileDownload = () => {
    document.getElementById("mobile-download")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const roles = [
    {
      id: "driver" as const,
      icon: Car,
      title: t.welcome.driverTitle,
      desc: t.welcome.driverDesc,
      glowClass: "glow-ring-orange",
      iconColor: "text-primary",
    },
    {
      id: "client" as const,
      icon: User,
      title: t.welcome.clientTitle,
      desc: t.welcome.clientDesc,
      glowClass: "glow-ring-blue",
      iconColor: "text-info",
    },
    {
      id: "delivery" as const,
      icon: Package,
      customLogo: deliveryLogo,
      title: t.welcome.deliveryTitle,
      desc: t.welcome.deliveryDesc,
      glowClass: "glow-ring-green",
      iconColor: "text-success",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-10 gradient-hero particles-bg relative gap-8 safe-mobile-top safe-mobile-bottom" dir={dir}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center pt-8 relative z-10"
      >
        {/* Language Switcher */}
        <div className="absolute top-0 left-0">
          <LanguageSwitcher />
        </div>

        <div className="relative flex items-center justify-center">
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
          <motion.div
            className="absolute w-52 h-52 rounded-full bg-primary/10 blur-2xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
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
        <h1 className="text-4xl font-bold font-display text-gradient-primary mt-4 tracking-wider">{t.welcome.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t.welcome.subtitle}</p>

        <button
          type="button"
          onClick={scrollToMobileDownload}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-5 py-2.5 text-sm font-semibold text-foreground shadow-lg shadow-primary/10 transition-all hover:border-primary/40 hover:bg-card"
        >
          <Download className="h-4 w-4 text-primary" />
          {t.common.downloadApp}
        </button>

        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex flex-col items-center gap-2"
          >
            <p className="text-xs text-success">
              ✓ {t.welcome.loggedAs} {currentUser.email || currentUser.phone || t.common.client}
              {userRole && ` (${t.roles[userRole as keyof typeof t.roles] || ROLE_LABELS[userRole] || userRole})`}
            </p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              {t.welcome.useOtherAccount}
            </button>
          </motion.div>
        )}
      </motion.div>

      <div className="flex flex-col gap-4 w-full max-w-sm relative z-10">
        {roles.map((role, i) => (
          <motion.button
            key={role.id}
            type="button"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + i * 0.15 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => void handleRoleSelect(role.id)}
            disabled={checking}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="group relative z-10 w-full overflow-hidden rounded-2xl p-5 text-right gradient-card border border-border hover:border-primary/40 transition-all duration-300 disabled:opacity-50 cursor-pointer select-none active:scale-[0.97]"
            aria-label={role.title}
          >
            <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />
            <div className="flex items-center gap-4">
              {"customLogo" in role && role.customLogo ? (
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

      <NativeDownloadSection />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex gap-6 items-center relative z-10"
      >
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-xs">{t.common.secure}</span>
          <Shield className="w-3.5 h-3.5 text-success" />
        </div>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="text-xs">{t.common.support247}</span>
          <Headphones className="w-3.5 h-3.5 text-info" />
        </div>
        <p className="text-xs text-muted-foreground">{t.common.termsAgree}</p>
      </motion.div>
    </div>
  );
};

export default Welcome;
