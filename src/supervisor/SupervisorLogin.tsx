import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Mail, Lock, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import FaceAuthGate from "@/components/FaceAuthGate";
import FaceRegisterPrompt from "@/components/FaceRegisterPrompt";

const SupervisorLogin = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [faceCheckActive, setFaceCheckActive] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [showFaceRegister, setShowFaceRegister] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setChecking(false); return; }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);

      const hasAccess = (roles || []).some((r) => r.role === "moderator");
      if (hasAccess) {
        navigate("/", { replace: true });
      } else {
        await supabase.auth.signOut();
        setChecking(false);
      }
    };
    checkSession();
  }, [navigate]);

  const handleEmailBlur = () => {
    if (email && email.includes("@") && !faceVerified) {
      setFaceCheckActive(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    if (!faceVerified && !faceCheckActive) {
      setFaceCheckActive(true);
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

      const hasAccess = (roles || []).some((r) => r.role === "moderator");
      if (!hasAccess) {
        await supabase.auth.signOut();
        toast({
          title: "غير مصرح",
          description: "ليس لديك صلاحية الدخول كمشرف",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      toast({ title: "تم تسجيل الدخول بنجاح ✅" });
      const { data: fp } = await supabase.from("face_auth_profiles").select("id").eq("email", email.toLowerCase().trim()).maybeSingle();
      if (!fp) { setShowFaceRegister(true); return; }
      navigate("/", { replace: true });
    } catch (err: any) {
      let msg = err?.message || "حدث خطأ غير متوقع";
      if (msg.includes("Invalid login credentials")) msg = "بريد أو كلمة مرور غير صحيحة";
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
    <div className="min-h-screen flex items-center justify-center bg-background px-4" dir="rtl">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">دخول المشرف</h1>
          <p className="text-sm text-muted-foreground">HN Driver — Supervisor</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground block">البريد الإلكتروني</label>
            <div className="relative">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                placeholder="supervisor@example.com"
                type="email"
                className="bg-secondary/80 border-border h-12 rounded-xl pr-11"
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground block">كلمة المرور</label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                type={showPassword ? "text" : "password"}
                className="bg-secondary/80 border-border h-12 rounded-xl pr-11"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="w-5 h-5 text-muted-foreground" /> : <Eye className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-lg"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "تسجيل الدخول"}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          الوصول مقتصر على المشرفين فقط
        </p>
      </div>

      {faceCheckActive && (
        <FaceAuthGate
          email={email}
          onVerified={() => { setFaceCheckActive(false); setFaceVerified(true); }}
          onSkip={() => { setFaceCheckActive(false); setFaceVerified(true); }}
        />
      )}
      {showFaceRegister && (
        <FaceRegisterPrompt onClose={() => { setShowFaceRegister(false); navigate("/", { replace: true }); }} />
      )}
    </div>
  );
};

export default SupervisorLogin;
