import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, ArrowRight, User as UserIcon, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/hn-driver-logo.png";

const getRoleHome = (role: string) => {
  if (role === "admin") return "/admin";
  if (role === "driver") return "/driver";
  if (role === "delivery") return "/delivery";
  return "/client";
};

const Login = () => {
  const navigate = useNavigate();
  const { role: roleParam } = useParams();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || roleParam || "driver";
  const [showPassword, setShowPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (active && session) {
        navigate(getRoleHome(role), { replace: true });
      }
    };

    void checkSession();

    return () => {
      active = false;
    };
  }, [navigate, role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("لم يتم العثور على المستخدم");

        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
        const userRoles = roles?.map((r) => r.role) || [];

        if (userRoles.includes("admin")) {
          navigate("/admin");
        } else if (userRoles.includes("driver")) {
          navigate("/driver");
        } else {
          navigate(getRoleHome(role));
        }

        toast({ title: "تم تسجيل الدخول بنجاح ✅" });
      } else {
        if (!name) {
          toast({ title: "يرجى إدخال الاسم", variant: "destructive" });
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, phone },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast({ title: "تم إنشاء الحساب ✅", description: "يرجى التحقق من بريدك الإلكتروني لتفعيل الحساب" });
        setIsLogin(true);
      }
    } catch (error: any) {
      let msg = error.message;
      if (msg.includes("Invalid login")) msg = "بريد إلكتروني أو كلمة مرور غير صحيحة";
      if (msg.includes("already registered")) msg = "هذا البريد مسجل مسبقاً";
      if (msg.includes("Password should be")) msg = "كلمة المرور يجب أن تكون 6 أحرف على الأقل";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 gradient-hero particles-bg relative">
      <button onClick={() => navigate("/welcome")} className="self-start mb-6 relative z-10">
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
        <span className={`text-sm mt-1 font-medium ${role === "driver" ? "text-primary" : "text-info"}`}>
          {role === "driver" ? "حساب سائق" : role === "admin" ? "حساب مسؤول" : role === "delivery" ? "حساب توصيل" : "حساب عميل"}
        </span>
      </motion.div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        onSubmit={handleSubmit}
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
          onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "إنشاء حساب جديد" : "لدي حساب بالفعل"}
        </Button>
      </motion.form>
    </div>
  );
};

export default Login;
