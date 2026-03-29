import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Loader2, ShieldCheck, Sparkles, ScanFace } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import FaceAuthGate from "@/components/FaceAuthGate";
import FaceRegisterPrompt from "@/components/FaceRegisterPrompt";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [faceCheckActive, setFaceCheckActive] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [showFaceRegister, setShowFaceRegister] = useState(false);
  const [hasFaceProfile, setHasFaceProfile] = useState(false);
  const [checkingFace, setCheckingFace] = useState(false);
  const [loginMode, setLoginMode] = useState<"password" | "face">("password");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const isAdmin = (roles || []).some((r) => r.role === "admin");
      if (isAdmin) {
        navigate("/admin", { replace: true });
      } else {
        await supabase.auth.signOut();
        setChecking(false);
      }
    };
    checkSession();
  }, [navigate]);

  // Check if face profile exists when email changes
  const checkFaceProfile = useCallback(async (emailValue: string) => {
    if (!emailValue || !emailValue.includes("@")) {
      setHasFaceProfile(false);
      return;
    }
    setCheckingFace(true);
    const { data } = await supabase
      .from("face_auth_profiles")
      .select("id")
      .eq("email", emailValue.toLowerCase().trim())
      .maybeSingle();
    setHasFaceProfile(!!data);
    setCheckingFace(false);
  }, []);

  const handleEmailBlur = () => {
    checkFaceProfile(email);
  };

  const handleFaceLogin = () => {
    if (!email || !email.includes("@")) {
      toast({ title: "يرجى إدخال البريد الإلكتروني أولاً", variant: "destructive" });
      return;
    }
    setFaceCheckActive(true);
  };

  const handleFaceVerified = async () => {
    setFaceCheckActive(false);
    setFaceVerified(true);
    toast({ title: "✅ تم التحقق من الوجه بنجاح" });
    // If in face mode and password is filled, auto-login
    if (loginMode === "face" && password) {
      handleLoginWithCredentials();
    } else if (loginMode === "face") {
      toast({ title: "أدخل كلمة المرور للمتابعة", variant: "default" });
    }
  };

  const handleFaceSkipped = () => {
    setFaceCheckActive(false);
    // Face didn't match or was skipped — fallback to password
    if (loginMode === "face") {
      toast({ title: "⚠️ لم يتم التحقق من الوجه", description: "يرجى إدخال كلمة المرور", variant: "destructive" });
    }
    // Don't set faceVerified — they can still login with password
    setLoginMode("password");
  };

  const handleLoginWithCredentials = async () => {
    if (!email || !password) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);
      const isAdmin = (roles || []).some((r) => r.role === "admin");
      if (!isAdmin) {
        await supabase.auth.signOut();
        toast({ title: "غير مصرح", description: "هذا الحساب ليس لديه صلاحيات المسؤول", variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "تم تسجيل الدخول بنجاح ✅" });
      // Check if face profile exists, suggest registration
      const { data: faceProfile } = await supabase
        .from("face_auth_profiles")
        .select("id")
        .eq("email", email.toLowerCase().trim())
        .maybeSingle();
      if (!faceProfile) {
        setShowFaceRegister(true);
        return;
      }
      navigate("/admin", { replace: true });
    } catch (err: any) {
      let msg = err?.message || "حدث خطأ غير متوقع";
      if (msg.includes("Invalid login credentials")) msg = "بريد أو كلمة مرور غير صحيحة";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // If face profile exists and not yet verified, require face first
    if (hasFaceProfile && !faceVerified) {
      setFaceCheckActive(true);
      return;
    }
    handleLoginWithCredentials();
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background" dir="rtl">
      {/* Animated background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 200 + i * 80,
              height: 200 + i * 80,
              background: `radial-gradient(circle, hsl(var(--primary) / ${0.08 - i * 0.01}), transparent 70%)`,
              left: `${10 + i * 15}%`,
              top: `${5 + i * 12}%`,
            }}
            animate={{
              x: [0, 30 * (i % 2 === 0 ? 1 : -1), 0],
              y: [0, 20 * (i % 2 === 0 ? -1 : 1), 0],
              scale: [1, 1.1, 1],
            }}
            transition={{ duration: 8 + i * 2, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={`p-${i}`}
            className="absolute w-1 h-1 rounded-full bg-primary/20"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0] }}
            transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 5, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* Login card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl shadow-2xl p-8 space-y-6">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-3xl blur-xl -z-10" />

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-4"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto shadow-lg shadow-primary/25"
            >
              <ShieldCheck className="w-10 h-10 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">لوحة الإدارة</h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground font-medium">HN Driver — Admin Panel</p>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            </div>
          </motion.div>

          {/* Login Method Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setLoginMode("password")}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 ${
                loginMode === "password"
                  ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:bg-secondary/50"
              }`}
            >
              <Lock className="w-4 h-4" />
              <span className="text-sm font-bold">كلمة المرور</span>
            </button>
            <button
              onClick={() => {
                setLoginMode("face");
                if (email && email.includes("@")) checkFaceProfile(email);
              }}
              className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-xl border transition-all duration-300 ${
                loginMode === "face"
                  ? "border-primary bg-primary/10 text-primary shadow-lg shadow-primary/10"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:bg-secondary/50"
              }`}
            >
              <ScanFace className="w-4 h-4" />
              <span className="text-sm font-bold">Face ID</span>
            </button>
          </div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            {/* Email - always visible */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground block">البريد الإلكتروني</label>
              <div className="relative group">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={handleEmailBlur}
                  placeholder="admin@example.com"
                  type="email"
                  className="bg-secondary/50 border-border/50 h-13 rounded-xl pr-12 text-base transition-all duration-200 focus:bg-secondary/80 focus:border-primary/50 focus:shadow-lg focus:shadow-primary/5"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-focus-within:bg-primary/20 transition-colors">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {loginMode === "password" ? (
                <motion.div
                  key="password-mode"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-5"
                >
                  {/* Password field */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground block">كلمة المرور</label>
                    <div className="relative group">
                      <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        className="bg-secondary/50 border-border/50 h-13 rounded-xl pr-12 pl-12 text-base transition-all duration-200 focus:bg-secondary/80 focus:border-primary/50 focus:shadow-lg focus:shadow-primary/5"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-focus-within:bg-primary/20 transition-colors">
                        <Lock className="w-4 h-4 text-primary" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>

                  {/* Face verification badge */}
                  {hasFaceProfile && (
                    <div className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs ${
                      faceVerified
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                    }`}>
                      <ScanFace className="w-4 h-4" />
                      <span className="font-medium">
                        {faceVerified ? "✅ تم التحقق من الوجه" : "⚠️ يتطلب التحقق من الوجه للدخول"}
                      </span>
                    </div>
                  )}

                  {/* Submit button */}
                  <motion.div whileTap={{ scale: 0.98 }}>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="w-full h-13 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-xl hover:shadow-primary/30"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <span className="flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5" />
                          دخول
                        </span>
                      )}
                    </Button>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.div
                  key="face-mode"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  {/* Face ID Card */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleFaceLogin}
                    className="cursor-pointer p-6 rounded-2xl border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/50 hover:from-primary/10 hover:to-primary/15 transition-all duration-300 text-center group"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-primary/30 group-hover:shadow-xl group-hover:shadow-primary/40"
                    >
                      <ScanFace className="w-8 h-8 text-primary-foreground" />
                    </motion.div>
                    <p className="text-foreground font-bold text-lg">الدخول بالتعرف على الوجه</p>
                    <p className="text-muted-foreground text-sm mt-1">
                      {checkingFace ? "جارٍ التحقق..." : hasFaceProfile ? "اضغط لفتح الكاميرا والتحقق" : "لم يتم تسجيل بصمة الوجه بعد"}
                    </p>
                    {!hasFaceProfile && email && email.includes("@") && !checkingFace && (
                      <p className="text-amber-400 text-xs mt-2">⚠️ يجب تسجيل الدخول بكلمة المرور أولاً لتفعيل Face ID</p>
                    )}
                  </motion.div>

                  {/* Fallback password field for face mode */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground block">كلمة المرور (مطلوبة مع Face ID)</label>
                    <div className="relative group">
                      <Input
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        type={showPassword ? "text" : "password"}
                        className="bg-secondary/50 border-border/50 h-13 rounded-xl pr-12 pl-12 text-base transition-all duration-200 focus:bg-secondary/80 focus:border-primary/50"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-primary" />
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.form>

          {/* Footer */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pt-2">
            <div className="flex items-center gap-3 justify-center">
              <div className="h-px flex-1 bg-border/50" />
              <p className="text-xs text-muted-foreground whitespace-nowrap">🔒 الوصول مقتصر على المسؤولين فقط</p>
              <div className="h-px flex-1 bg-border/50" />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {faceCheckActive && (
        <FaceAuthGate
          email={email}
          onVerified={handleFaceVerified}
          onSkip={() => { setFaceCheckActive(false); setFaceVerified(true); }}
        />
      )}

      {showFaceRegister && (
        <FaceRegisterPrompt onClose={() => { setShowFaceRegister(false); navigate("/admin", { replace: true }); }} />
      )}
    </div>
  );
};

export default AdminLogin;
