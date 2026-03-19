import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, User, Headphones, Shield, LogOut, Download, Smartphone } from "lucide-react";
import QRCode from "react-qr-code";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import logo from "@/assets/hn-driver-logo.png";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";

type RoleId = "driver" | "client" | "delivery";

const roleDashboardPaths: Record<string, string> = {
  driver: "/driver",
  client: "/client",
  delivery: "/delivery",
  call_center: "/call-center",
  admin: "/admin",
};
const downloadPageUrl = "https://smooth-route-guide.lovable.app/welcome#mobile-download";

const Welcome = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<RoleId | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            setUserRole(snap.data().role as RoleId);
          }
        } catch {
          // ignore
        }
      } else {
        setCurrentUser(null);
        setUserRole(null);
      }
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.removeItem("hn_user_role");
    setCurrentUser(null);
    setUserRole(null);
  };

  const handleRoleSelect = async (roleId: RoleId) => {
    localStorage.setItem("hn_user_role", roleId);
    setChecking(true);

    try {
      const user = auth.currentUser;
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        const savedRole = snap.exists() ? (snap.data().role as RoleId) : roleId;
        navigate(roleDashboardPaths[savedRole] || roleDashboardPaths[roleId]);
      } else {
        navigate(`/auth/${roleId}`);
      }
    } catch {
      navigate(`/auth/${roleId}`);
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
      title: "سائق",
      desc: "سجل كسائق وابدأ بالربح",
      glowClass: "glow-ring-orange",
      iconColor: "text-primary",
    },
    {
      id: "client" as const,
      icon: User,
      title: "عميل",
      desc: "اطلب رحلة بسهولة وأمان",
      glowClass: "glow-ring-blue",
      iconColor: "text-info",
    },
    {
      id: "delivery" as const,
      icon: null,
      customLogo: deliveryLogo,
      title: "توصيل",
      desc: "أرسل طرودك بسرعة وأمان",
      glowClass: "glow-ring-green",
      iconColor: "text-success",
    },
  ];

  const mobilePlatforms = [
    {
      title: "Android APK",
      desc: "جاهز بعد بناء نسخة Android من المشروع ومزامنتها.",
    },
    {
      title: "iPhone / iOS",
      desc: "جاهز للنشر كتطبيق iPhone عبر Xcode وApple App Store.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-between px-6 py-10 gradient-hero particles-bg relative gap-8 safe-mobile-top safe-mobile-bottom">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center pt-8 relative z-10"
      >
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
        <h1 className="text-4xl font-bold font-display text-gradient-primary mt-4 tracking-wider">HN DRIVER</h1>
        <p className="text-muted-foreground mt-1 text-sm">اختر نوع حسابك للمتابعة</p>

        <button
          type="button"
          onClick={scrollToMobileDownload}
          className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-5 py-2.5 text-sm font-semibold text-foreground shadow-lg shadow-primary/10 transition-all hover:border-primary/40 hover:bg-card"
        >
          <Download className="h-4 w-4 text-primary" />
          تحميل التطبيق للجوال
        </button>

        {currentUser && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 flex flex-col items-center gap-2"
          >
            <p className="text-xs text-success">
              ✓ مسجل كـ {currentUser.email || currentUser.phoneNumber}
              {userRole && ` (${userRole === "driver" ? "سائق" : userRole === "client" ? "عميل" : "توصيل"})`}
            </p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-destructive hover:text-destructive/80 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              استخدام حساب آخر
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
            aria-label={`الدخول كـ ${role.title}`}
          >
            <div className="absolute inset-0 gradient-primary opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none" />
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

      <motion.section
        id="mobile-download"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55 }}
        className="relative z-10 w-full max-w-sm rounded-3xl border border-border bg-card/75 p-5 shadow-2xl shadow-primary/10 backdrop-blur"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">نسخة Native للهاتف</h2>
            <p className="text-xs text-muted-foreground">تم تجهيز المشروع ليعمل على Android و iPhone.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {mobilePlatforms.map((platform) => (
            <div key={platform.title} className="rounded-2xl border border-border bg-background/70 p-4">
              <p className="text-sm font-semibold text-foreground">{platform.title}</p>
              <p className="mt-1 text-xs leading-6 text-muted-foreground">{platform.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
          <p className="text-xs leading-6 text-muted-foreground">
            لتوليد النسخ الفعلية: Export to GitHub ← npm install ← npx cap add android أو ios ← npm run build ← npx cap sync.
          </p>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-background/70 p-4 text-center">
          <p className="text-sm font-semibold text-foreground">امسح الكود بالجوال</p>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">
            افتح صفحة التحميل مباشرة على هاتفك من خلال QR code.
          </p>
          <div className="mx-auto mt-4 flex w-fit rounded-2xl bg-background p-3 shadow-lg shadow-primary/10">
            <QRCode
              value={downloadPageUrl}
              size={132}
              bgColor="hsl(var(--background))"
              fgColor="hsl(var(--foreground))"
            />
          </div>
          <a
            href={downloadPageUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-xs text-primary underline-offset-4 hover:underline"
          >
            فتح رابط التحميل
          </a>
        </div>
      </motion.section>

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
