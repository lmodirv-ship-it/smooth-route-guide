import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Loader2, ShieldCheck, Sparkles, LogIn, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { dashboardForRole } from "@/lib/routes";
import {
  getUserRolesWithTimeout,
  signInWithPasswordWithTimeout,
  useAuthReady,
} from "@/hooks/useAuthReady";

/** أولوية الأدوار عند امتلاك المستخدم أكثر من دور. */
const ROLE_PRIORITY = [
  "admin",
  "moderator",
  "agent",
  "smart_admin_assistant",
  "store_owner",
  "delivery",
  "driver",
  "user",
];

function pickRole(roles: string[]): string | null {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
  return roles[0] ?? null;
}

const AdminLogin = () => {
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codeMode, setCodeMode] = useState(false);
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);

  const { ready, session } = useAuthReady();

  /** يوجّه المستخدم إلى صفحته حسب دوره — بدون أي رسائل. */
  const routeByRole = async (userId: string) => {
    let roles: string[] = [];
    try {
      roles = await getUserRolesWithTimeout(userId);
    } catch {
      roles = [];
    }
    const role = pickRole(roles);
    if (!role) {
      navigate("/auth", { replace: true });
      return;
    }
    navigate(dashboardForRole(role), { replace: true });
  };

  useEffect(() => {
    let mounted = true;
    if (!ready) { setChecking(true); return () => { mounted = false; }; }
    if (!session) { setChecking(false); return () => { mounted = false; }; }

    void (async () => {
      await routeByRole(session.user.id);
      if (mounted) setChecking(false);
    })();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, session]);

  /** إرسال رمز مكوّن من 6 أرقام إلى البريد المكتوب. */
  const sendCode = async (targetEmail?: string) => {
    const normalized = (targetEmail ?? email).trim().toLowerCase();
    if (!normalized) return;
    setSending(true);
    try {
      await supabase.functions.invoke("send-login-code", { body: { email: normalized } });
    } catch {
      /* لا نعرض أي رسالة */
    } finally {
      setSending(false);
      setCodeMode(true);
      setCode("");
    }
  };

  /** الدخول بكلمة المرور. */
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (!normalized || !password) return;

    setLoading(true);
    try {
      const { data, error } = await signInWithPasswordWithTimeout({
        email: normalized,
        password,
      });
      if (error || !data.user) {
        navigate("/auth", { replace: true });
        return;
      }
      await routeByRole(data.user.id);
    } catch {
      navigate("/auth", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  /** الدخول برمز التحقق. */
  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = email.trim().toLowerCase();
    if (code.length !== 6 || !normalized) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-login-code", {
        body: { email: normalized, code },
      });

      if (error || !data?.ok || !data?.token_hash) {
        // عدم التطابق ⇒ إرسال رمز جديد تلقائياً إلى نفس البريد
        setCode("");
        await sendCode(normalized);
        return;
      }

      const { data: sessionData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash as string,
        type: "email",
      });

      if (verifyError || !sessionData.user) {
        setCode("");
        await sendCode(normalized);
        return;
      }

      await routeByRole(sessionData.user.id);
    } catch {
      setCode("");
      await sendCode(normalized);
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
              <h1 className="text-3xl font-bold text-foreground tracking-tight">تسجيل الدخول</h1>
              <div className="flex items-center justify-center gap-2 mt-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <p className="text-sm text-muted-foreground font-medium">دخول آمن حسب الدور والصلاحيات</p>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
            </div>
          </motion.div>

          <form onSubmit={codeMode ? handleCodeLogin : handlePasswordLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground block">البريد الإلكتروني</label>
              <div className="relative group">
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  type="email"
                  autoFocus
                  className="bg-secondary/50 border-border/50 h-13 rounded-xl pr-12 text-base transition-all duration-200 focus:bg-secondary/80 focus:border-primary/50"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>

            {codeMode ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">رمز الدخول (6 أرقام)</label>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="••••••"
                  inputMode="numeric"
                  dir="ltr"
                  autoFocus
                  className="bg-secondary/50 border-border/50 h-13 rounded-xl text-center text-2xl tracking-[0.5em] font-bold"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground block">كلمة المرور</label>
                <div className="relative group">
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    className="bg-secondary/50 border-border/50 h-13 rounded-xl pr-12 text-base transition-all duration-200 focus:bg-secondary/80 focus:border-primary/50"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-primary" />
                  </div>
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || (codeMode ? code.length !== 6 : !password)}
              className="w-full h-13 rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold text-lg shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="flex items-center gap-2"><LogIn className="w-5 h-5" />دخول</span>
              )}
            </Button>

            <Button
              type="button"
              variant="ghost"
              disabled={sending || !email.trim()}
              onClick={() => void sendCode()}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                codeMode ? "إعادة إرسال الرمز إلى البريد" : "نسيت كلمة المرور؟ إرسال الرمز إلى البريد"
              )}
            </Button>

            {codeMode && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setCodeMode(false); setCode(""); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                العودة إلى كلمة المرور
              </Button>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;
