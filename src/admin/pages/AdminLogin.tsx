import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import {
  getAuthTimeoutMessage,
  getUserRolesWithTimeout,
  isServiceTimeoutError,
  signInWithPasswordWithTimeout,
  signOutWithTimeout,
  useAuthReady,
} from "@/hooks/useAuthReady";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { ready, session } = useAuthReady();

  useEffect(() => {
    let mounted = true;

    if (!ready) {
      setChecking(true);
      return () => { mounted = false; };
    }

    if (!session) {
      setChecking(false);
      return () => { mounted = false; };
    }

    void (async () => {
      try {
        const roles = await getUserRolesWithTimeout(session.user.id);
        if (!mounted) return;
        if (roles.some((r) => r === "admin")) {
          navigate("/admin", { replace: true });
          return;
        }
        await signOutWithTimeout();
      } catch {
        if (!mounted) return;
      } finally {
        if (mounted) setChecking(false);
      }
    })();

    return () => { mounted = false; };
  }, [navigate, ready, session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await signInWithPasswordWithTimeout({ email, password });
      if (error) throw error;

      const roles = await getUserRolesWithTimeout(data.user.id);
      if (!roles.some((r) => r === "admin")) {
        await signOutWithTimeout();
        toast({ title: "غير مصرح", description: "هذا الحساب ليس لديه صلاحيات المسؤول", variant: "destructive" });
        setLoading(false);
        return;
      }
      toast({ title: "تم تسجيل الدخول بنجاح ✅" });
      navigate("/admin", { replace: true });
    } catch (err: any) {
      let msg = err?.message || "حدث خطأ غير متوقع";
      if (msg.includes("Invalid login credentials")) msg = "بريد أو كلمة مرور غير صحيحة";
      if (isServiceTimeoutError(err)) msg = getAuthTimeoutMessage("login");
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
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
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        <div className="backdrop-blur-xl bg-card/80 border border-border/50 rounded-3xl shadow-2xl p-8 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center space-y-4"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto shadow-lg shadow-primary/25">
              <ShieldCheck className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">لوحة الإدارة</h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground font-medium">HN Driver — Admin Panel</p>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            </div>
          </motion.div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground block">البريد الإلكتروني</label>
              <div className="relative group">
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" type="email"
                  className="bg-secondary/50 border-border/50 h-13 rounded-xl pr-12 text-base transition-all duration-200 focus:bg-secondary/80 focus:border-primary/50" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground block">كلمة المرور</label>
              <div className="relative group">
                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  type={showPassword ? "text" : "password"}
                  className="bg-secondary/50 border-border/50 h-13 rounded-xl pr-12 pl-12 text-base transition-all duration-200 focus:bg-secondary/80 focus:border-primary/50" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-primary" />
                </div>
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading}
              className="w-full h-13 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="flex items-center gap-2"><ShieldCheck className="w-5 h-5" />دخول</span>
              )}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
