import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { auth } from "@/lib/firebase";
import logo from "@/assets/hn-driver-logo.png";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingCode, setCheckingCode] = useState(true);
  const [isCodeValid, setIsCodeValid] = useState(false);
  const [sent, setSent] = useState(false);

  const oobCode = useMemo(() => searchParams.get("oobCode") || "", [searchParams]);

  useEffect(() => {
    const checkCode = async () => {
      if (!oobCode) {
        setIsCodeValid(false);
        setCheckingCode(false);
        return;
      }

      try {
        await verifyPasswordResetCode(auth, oobCode);
        setIsCodeValid(true);
      } catch {
        setIsCodeValid(false);
      } finally {
        setCheckingCode(false);
      }
    };

    void checkCode();
  }, [oobCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "كلمة المرور ضعيفة", description: "يجب أن تكون 6 أحرف على الأقل", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "كلمتا المرور غير متطابقتين", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(auth, oobCode, password);
      setSent(true);
      toast({ title: "تم تحديث كلمة المرور بنجاح ✅" });
    } catch (err: any) {
      let msg = err?.message || "تعذر إعادة تعيين كلمة المرور";
      if (msg.includes("expired-action-code") || msg.includes("invalid-action-code")) {
        msg = "رابط إعادة التعيين غير صالح أو منتهي الصلاحية";
      }
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 gradient-hero particles-bg relative" dir="rtl">
      <button
        type="button"
        onClick={() => navigate("/login")}
        className="self-start mb-6 relative z-10"
        style={{ touchAction: "manipulation" }}
      >
        <ArrowRight className="w-6 h-6 text-muted-foreground hover:text-foreground transition-colors rotate-180" />
      </button>

      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center mb-8 relative z-10"
      >
        <img src={logo} alt="HN" className="w-16 h-16 mb-3" />
        <h1 className="text-2xl font-bold text-foreground">إعادة تعيين كلمة المرور</h1>
        <p className="text-sm text-muted-foreground mt-1 text-center">
          أدخل كلمة المرور الجديدة لإكمال استعادة الحساب
        </p>
      </motion.div>

      {checkingCode ? (
        <div className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto relative z-10 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">جارٍ التحقق من رابط إعادة التعيين...</p>
        </div>
      ) : sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto relative z-10 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم تغيير كلمة المرور</h2>
          <p className="text-sm text-muted-foreground">يمكنك الآن تسجيل الدخول باستخدام كلمة المرور الجديدة.</p>
          <Button
            onClick={() => navigate("/login", { replace: true })}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold mt-4"
          >
            العودة إلى تسجيل الدخول
          </Button>
        </motion.div>
      ) : !isCodeValid ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto relative z-10 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <Lock className="w-10 h-10 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground">الرابط غير صالح</h2>
          <p className="text-sm text-muted-foreground">قد يكون الرابط منتهي الصلاحية أو تم استخدامه مسبقًا.</p>
          <Button
            onClick={() => navigate("/forgot-password")}
            variant="outline"
            className="w-full h-12 rounded-xl border-border text-foreground hover:bg-secondary"
          >
            طلب رابط جديد
          </Button>
        </motion.div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 w-full max-w-sm mx-auto relative z-10"
        >
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground block">كلمة المرور الجديدة</label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 pl-11"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground block">تأكيد كلمة المرور الجديدة</label>
            <div className="relative">
              <Input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                type={showConfirmPassword ? "text" : "password"}
                className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11 pl-11"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-lg mt-2 hover:opacity-90 transition-opacity glow-primary"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "حفظ كلمة المرور الجديدة"}
          </Button>
        </motion.form>
      )}
    </div>
  );
};

export default ResetPassword;
