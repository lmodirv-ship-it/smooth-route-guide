import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, User as UserIcon,
  Phone, Loader2, Car, ShoppingBag, Store as StoreIcon, Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackConversion } from "@/components/TrackingScripts";
import { lovable } from "@/integrations/lovable/index";
import {
  getAuthTimeoutMessage,
  getUserRolesWithTimeout,
  isServiceTimeoutError,
  signInWithPasswordWithTimeout,
  signUpWithTimeout,
  useAuthReady,
} from "@/hooks/useAuthReady";
import logo from "@/assets/hn-driver-badge.png";

type RoleId = "driver" | "client" | "delivery" | "admin" | "agent" | "store_owner";
type StoredRole = RoleId | "user";

const roleConfig: Record<string, { label: string; color: string; icon: any }> = {
  driver: { label: "حساب سائق", color: "text-primary", icon: Car },
  client: { label: "حساب عميل", color: "text-info", icon: UserIcon },
  delivery: { label: "حساب سائق توصيل", color: "text-success", icon: ShoppingBag },
  admin: { label: "حساب مسؤول", color: "text-destructive", icon: UserIcon },
  agent: { label: "حساب مركز اتصال", color: "text-warning", icon: Phone },
  store_owner: { label: "حساب صاحب محل", color: "text-accent-foreground", icon: StoreIcon },
};

const roleDashboard: Record<StoredRole, string> = {
  driver: "/driver",
  client: "/customer",
  delivery: "/driver/delivery",
  admin: "/admin",
  agent: "/call-center",
  store_owner: "/delivery/my-store",
  user: "/customer",
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { role: roleParam } = useParams();
  const role = (roleParam as RoleId) || "client";
  const config = roleConfig[role] || roleConfig.client;

  const [isLogin, setIsLogin] = useState(true);
  const [authMethod, setAuthMethod] = useState<"email" | "phone">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const { ready, session } = useAuthReady();

  useEffect(() => {
    let mounted = true;

    if (!ready || !session) {
      return () => {
        mounted = false;
      };
    }

    const syncSession = async () => {
      try {
        const roles = await getUserRolesWithTimeout(session.user.id);
        if (!mounted) return;

        const userRoles = roles as StoredRole[];

        if (role && userRoles.includes(role as StoredRole)) {
          localStorage.setItem("hn_user_role", role);
          navigate(roleDashboard[role] || roleDashboard.user, { replace: true });
          return;
        }

        const savedRole = localStorage.getItem("hn_user_role") as StoredRole | null;
        const firstRole = userRoles[0] ?? savedRole ?? "user";
        navigate(roleDashboard[firstRole] || roleDashboard.user, { replace: true });
      } catch {
        if (!mounted) return;
        const savedRole = (localStorage.getItem("hn_user_role") as StoredRole | null) ?? null;
        const fallbackRole = role || savedRole || "user";
        navigate(roleDashboard[fallbackRole] || roleDashboard.user, { replace: true });
      }
    };

    void syncSession();

    return () => {
      mounted = false;
    };
  }, [navigate, ready, role, session]);

  // Do not auto-open face auth on blur; keep login non-blocking.
  const handleEmailBlur = () => {
    return;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }

    // Face verification is optional here; password login should never be blocked.

    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signInWithPasswordWithTimeout({ email, password });
        if (error) throw error;
        toast({ title: "تم تسجيل الدخول بنجاح ✅" });
        trackEvent("login", { method: "email", role });
      } else {
        if (!name) {
          toast({ title: "يرجى إدخال الاسم", variant: "destructive" });
          setLoading(false);
          return;
        }

        const redirectTo = `https://www.hn-driver.com/login`;
        const { data: signUpData, error } = await signUpWithTimeout({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: { name, phone, requested_role: role },
          },
        });

        if (error) throw error;

        // Process referral code if provided
        if (referralCode.trim() && signUpData?.user) {
          const { data: referrerProfile } = await supabase
            .from("profiles")
            .select("id")
            .eq("referral_code", referralCode.trim().toUpperCase())
            .single();
          if (referrerProfile) {
            await supabase.from("referrals").insert({
              referrer_id: referrerProfile.id,
              referred_id: signUpData.user.id,
              referral_code: referralCode.trim().toUpperCase(),
            });
          }
        }

        // Sync new user to MailBluster
        if (signUpData?.user) {
          supabase.functions.invoke("mailbluster-sync", {
            body: {
              action: "sync_user",
              email,
              name,
              phone,
              role: role || "user",
            },
          }).catch(() => {/* silent — non-blocking */});

          // Send welcome email
          supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "welcome-signup",
              recipientEmail: email,
              idempotencyKey: `welcome-${signUpData.user.id}`,
              templateData: { name: name || undefined },
            },
          }).catch(() => {/* silent — non-blocking */});
        }

        if (error) throw error;

        toast({
          title: "تم إنشاء الحساب بنجاح ✅",
        });
        trackEvent("sign_up", { method: "email", role });
        trackConversion();
      }
    } catch (err: any) {
      let msg = err?.message || "حدث خطأ غير متوقع";
      if (msg.includes("Invalid login credentials")) msg = "بريد أو كلمة مرور غير صحيحة";
      if (msg.includes("User already registered")) msg = "هذا البريد مسجل مسبقاً";
      if (msg.includes("Password should be at least")) msg = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
      if (msg.includes("password") && msg.includes("characters")) msg = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
      if (isServiceTimeoutError(err)) msg = getAuthTimeoutMessage(isLogin ? "login" : "signup");
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneUnavailable = () => {
    toast({
      title: "غير متاح حالياً",
      description: "تسجيل الدخول برقم الهاتف لم يتم ترحيله بعد، استخدم البريد الإلكتروني حالياً.",
      variant: "destructive",
    });
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 gradient-hero particles-bg relative">
      <button
        type="button"
        onClick={() => navigate("/welcome")}
        className="self-start mb-6 relative z-10"
        style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
      >
        <ArrowRight className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8 relative z-10"
      >
        <div className="relative">
          <img src={logo} alt="HN Driver" className="w-16 h-16 mb-3" />
          <div className="absolute inset-0 w-16 h-16 rounded-full bg-primary/10 blur-xl" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          {isLogin ? "تسجيل الدخول" : "إنشاء حساب جديد"}
        </h1>
        <span className={`text-sm mt-1 font-medium ${config.color}`}>{config.label}</span>
      </motion.div>

      <div className="flex gap-2 w-full max-w-sm mx-auto mb-4 relative z-10">
        <button
          type="button"
          onClick={() => setAuthMethod("email")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${authMethod === "email" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          style={{ touchAction: "manipulation" }}
        >
          <Mail className="w-4 h-4 inline-block ml-1.5" />
          بريد إلكتروني
        </button>
        <button
          type="button"
          onClick={() => { setAuthMethod("phone"); handlePhoneUnavailable(); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${authMethod === "phone" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          style={{ touchAction: "manipulation" }}
        >
          <Phone className="w-4 h-4 inline-block ml-1.5" />
          رقم الهاتف
        </button>
      </div>

      {authMethod === "email" ? (
        <motion.form
          key="email-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onSubmit={handleEmailSubmit}
          className="flex flex-col gap-4 w-full max-w-sm mx-auto relative z-10"
        >
          {!isLogin && (
            <>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground text-right block">الاسم الكامل</label>
                <div className="relative">
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="أدخل اسمك"
                    className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right" />
                  <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground text-right block">رقم الهاتف</label>
                <div className="relative">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="05XXXXXXXX" type="tel"
                    className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right" />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground text-right block">رمز الإحالة (اختياري)</label>
                <div className="relative">
                  <Input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="REF######"
                    className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right font-mono tracking-wider" />
                  <Gift className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
                </div>
                <p className="text-xs text-muted-foreground text-right">إذا دعاك صديق، أدخل رمزه للحصول على مكافأة 🎁</p>
              </div>
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground text-right block">البريد الإلكتروني</label>
            <div className="relative">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} onBlur={handleEmailBlur} placeholder="example@email.com" type="email"
                className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right" />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground text-right block">كلمة المرور</label>
            <div className="relative">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="أدخل كلمة مرور بسيطة"
                type={showPassword ? "text" : "password"}
                className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right" />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
            {!isLogin && (
              <p className="text-xs text-muted-foreground text-right">6 أحرف على الأقل — بدون تعقيدات</p>
            )}
          </div>

          {isLogin && (
            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-sm text-primary hover:text-primary/80 transition-colors text-right"
              style={{ touchAction: "manipulation" }}
            >
              نسيت كلمة المرور؟
            </button>
          )}

          <Button type="submit" disabled={loading}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-lg mt-2 hover:opacity-90 transition-opacity glow-primary">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : isLogin ? "دخول" : "إنشاء حساب"}
          </Button>

          <div className="flex items-center gap-3 my-2">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">أو</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button type="button" variant="outline"
            className="w-full h-12 rounded-xl border-border text-foreground hover:bg-secondary flex items-center justify-center gap-2"
            onClick={async () => {
              setLoading(true);
              try {
                const result = await lovable.auth.signInWithOAuth("google", {
                  redirect_uri: window.location.origin,
                });
                if (result.error) {
                  toast({ title: "خطأ في تسجيل الدخول عبر Google", variant: "destructive" });
                }
              } catch {
                toast({ title: "خطأ غير متوقع", variant: "destructive" });
              } finally {
                setLoading(false);
              }
            }}
            style={{ touchAction: "manipulation" }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            تسجيل الدخول عبر Google
          </Button>

          <Button type="button" variant="outline"
            className="w-full h-12 rounded-xl border-border text-foreground hover:bg-secondary"
            onClick={() => setIsLogin(!isLogin)}
            style={{ touchAction: "manipulation" }}>
            {isLogin ? "إنشاء حساب جديد" : "لدي حساب بالفعل"}
          </Button>
        </motion.form>
      ) : (
        <motion.div
          key="phone-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 w-full max-w-sm mx-auto relative z-10"
        >
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground text-right block">رقم الهاتف</label>
            <div className="relative">
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0555123456"
                type="tel"
                className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right"
              />
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>
          <Button
            type="button"
            onClick={handlePhoneUnavailable}
            variant="outline"
            className="w-full h-12 rounded-xl border-border text-foreground hover:bg-secondary"
            style={{ touchAction: "manipulation" }}
          >
            تسجيل الهاتف غير متاح حالياً
          </Button>
        </motion.div>
      )}

    </div>
  );
};

export default AuthPage;
