import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, User as UserIcon,
  Phone, Loader2, Car, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { createUserDocument, createRoleDocument, type UserRole } from "@/lib/firebaseServices";
import logo from "@/assets/hn-driver-logo.png";

type RoleId = "driver" | "client" | "delivery";

const roleConfig: Record<RoleId, { label: string; color: string; icon: any }> = {
  driver: { label: "حساب سائق", color: "text-primary", icon: Car },
  client: { label: "حساب عميل", color: "text-info", icon: UserIcon },
  delivery: { label: "حساب توصيل", color: "text-success", icon: ShoppingBag },
};

const roleDashboard: Record<RoleId, string> = {
  driver: "/driver",
  client: "/client",
  delivery: "/delivery",
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

  // Email fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  // Phone OTP fields
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          const userRole = (data.role as RoleId) || role;
          if (data.profileCompleted === false) {
            navigate("/complete-profile", { replace: true });
          } else {
            navigate(roleDashboard[userRole] || roleDashboard.client, { replace: true });
          }
        } else {
          navigate(roleDashboard[role], { replace: true });
        }
      }
    });
    return unsub;
  }, [navigate, role]);

  const saveUserToFirestore = async (uid: string, extra: Record<string, any> = {}) => {
    await setDoc(doc(db, "users", uid), {
      uid,
      role,
      fullName: extra.fullName || "",
      phone: extra.phone || "",
      email: extra.email || "",
      status: "active",
      profileCompleted: false,
      createdAt: serverTimestamp(),
    }, { merge: true });
  };

  // ─── Email/Password ───
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "تم تسجيل الدخول بنجاح ✅" });
      } else {
        if (!name) {
          toast({ title: "يرجى إدخال الاسم", variant: "destructive" });
          setLoading(false);
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await saveUserToFirestore(cred.user.uid, { fullName: name, phone, email });
        toast({ title: "تم إنشاء الحساب بنجاح ✅" });
      }
      // onAuthStateChanged will handle redirect
    } catch (err: any) {
      let msg = err.message;
      if (msg.includes("email-already-in-use")) msg = "هذا البريد مسجل مسبقاً";
      if (msg.includes("wrong-password") || msg.includes("invalid-credential")) msg = "بريد أو كلمة مرور غير صحيحة";
      if (msg.includes("weak-password")) msg = "كلمة المرور ضعيفة (6 أحرف على الأقل)";
      if (msg.includes("invalid-email")) msg = "بريد إلكتروني غير صالح";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // ─── Phone OTP ───
  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
        size: "invisible",
      });
    }
  };

  const handleSendOtp = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({ title: "أدخل رقم هاتف صحيح", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      setupRecaptcha();
      const formatted = phoneNumber.startsWith("+") ? phoneNumber : `+213${phoneNumber.replace(/^0/, "")}`;
      const result = await signInWithPhoneNumber(auth, formatted, (window as any).recaptchaVerifier);
      setConfirmResult(result);
      setOtpSent(true);
      toast({ title: "تم إرسال رمز التحقق 📱" });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || !confirmResult) return;
    setLoading(true);
    try {
      const cred = await confirmResult.confirm(otp);
      await saveUserToFirestore(cred.user.uid, { phone: cred.user.phoneNumber || phoneNumber });
      toast({ title: "تم التحقق بنجاح ✅" });
    } catch (err: any) {
      toast({ title: "رمز التحقق غير صحيح", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 gradient-hero particles-bg relative">
      <div id="recaptcha-container" />

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

      {/* Method Tabs */}
      <div className="flex gap-2 w-full max-w-sm mx-auto mb-4 relative z-10">
        <button
          type="button"
          onClick={() => { setAuthMethod("email"); setOtpSent(false); }}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${authMethod === "email" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          style={{ touchAction: "manipulation" }}
        >
          <Mail className="w-4 h-4 inline-block ml-1.5" />
          بريد إلكتروني
        </button>
        <button
          type="button"
          onClick={() => setAuthMethod("phone")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${authMethod === "phone" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          style={{ touchAction: "manipulation" }}
        >
          <Phone className="w-4 h-4 inline-block ml-1.5" />
          رقم الهاتف
        </button>
      </div>

      {/* ─── Email Form ─── */}
      {authMethod === "email" && (
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
            </>
          )}

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground text-right block">البريد الإلكتروني</label>
            <div className="relative">
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" type="email"
                className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right" />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground text-right block">كلمة المرور</label>
            <div className="relative">
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 text-right" />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-1/2 -translate-y-1/2">
                {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
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
            className="w-full h-12 rounded-xl border-border text-foreground hover:bg-secondary"
            onClick={() => setIsLogin(!isLogin)}
            style={{ touchAction: "manipulation" }}>
            {isLogin ? "إنشاء حساب جديد" : "لدي حساب بالفعل"}
          </Button>
        </motion.form>
      )}

      {/* ─── Phone OTP Form ─── */}
      {authMethod === "phone" && (
        <motion.div
          key="phone-form"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 w-full max-w-sm mx-auto relative z-10"
        >
          {!otpSent ? (
            <>
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
                onClick={handleSendOtp}
                disabled={loading}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-lg mt-2 hover:opacity-90 transition-opacity glow-primary"
                style={{ touchAction: "manipulation" }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال رمز التحقق"}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground text-right block">رمز التحقق (OTP)</label>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  type="number"
                  maxLength={6}
                  className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl text-center text-xl tracking-[0.5em]"
                />
              </div>
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-lg mt-2 hover:opacity-90 transition-opacity glow-primary"
                style={{ touchAction: "manipulation" }}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تحقق"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => { setOtpSent(false); setOtp(""); }}
                className="w-full h-12 rounded-xl border-border text-foreground hover:bg-secondary"
                style={{ touchAction: "manipulation" }}
              >
                تغيير الرقم
              </Button>
            </>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AuthPage;
