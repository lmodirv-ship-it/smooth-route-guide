import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, getSafeWindowOrigin, sanitizeEmail } from "@/lib/inputSecurity";
import logo from "@/assets/hn-driver-badge.png";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = sanitizeEmail(email);

    if (!cleanEmail) {
      toast({ title: "يرجى إدخال البريد الإلكتروني", variant: "destructive" });
      return;
    }

    if (!emailSchema.safeParse(cleanEmail).success) {
      toast({ title: "بريد إلكتروني غير صالح", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${getSafeWindowOrigin()}/reset-password`,
      });
      if (error) throw error;
      setEmail(cleanEmail);
      setSent(true);
      toast({ title: "تم إرسال رابط إعادة التعيين ✅" });
    } catch (err: any) {
      const msg = err?.message || "تعذر إرسال رابط الاستعادة";
      toast({ title: "خطأ", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col px-6 py-8 gradient-hero particles-bg relative" dir="rtl">
      <button
        type="button"
        onClick={() => navigate(-1)}
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
        <h1 className="text-2xl font-bold text-foreground">استعادة كلمة المرور</h1>
        <p className="text-sm text-muted-foreground mt-1">أدخل بريدك الإلكتروني لإرسال رابط إعادة التعيين</p>
      </motion.div>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto relative z-10 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-success" />
          </div>
          <h2 className="text-lg font-bold text-foreground">تم الإرسال بنجاح</h2>
          <p className="text-sm text-muted-foreground">
            تم إرسال رابط إعادة تعيين كلمة المرور إلى<br />
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="text-xs text-muted-foreground">تحقق من صندوق الوارد أو مجلد البريد غير المرغوب فيه</p>
          <Button
            onClick={() => navigate(-1)}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold mt-4"
          >
            العودة لتسجيل الدخول
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
            <label className="text-sm text-muted-foreground block">البريد الإلكتروني</label>
            <div className="relative">
              <Input
                value={email}
                onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
                placeholder="example@email.com"
                type="email"
                className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11"
              />
              <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold text-lg mt-2 hover:opacity-90 transition-opacity glow-primary"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "إرسال رابط الاستعادة"}
          </Button>
        </motion.form>
      )}
    </div>
  );
};

export default ForgotPassword;
