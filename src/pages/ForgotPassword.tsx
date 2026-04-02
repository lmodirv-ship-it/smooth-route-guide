import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Loader2, CheckCircle, MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { emailSchema, sanitizeEmail } from "@/lib/inputSecurity";
import { OFFICIAL_URL } from "@/config/domain";
import logo from "@/assets/hn-driver-badge.png";

type RecoveryMethod = "email" | "whatsapp" | "messenger";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [method, setMethod] = useState<RecoveryMethod>("email");

  const handleEmailSubmit = async () => {
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
      toast({ title: "خطأ", description: err?.message || "تعذر إرسال الرابط", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = () => {
    if (!phone.trim()) {
      toast({ title: "يرجى إدخال رقم الهاتف", variant: "destructive" });
      return;
    }
    const msg = encodeURIComponent(
      `مرحباً، أريد استعادة كلمة المرور لحسابي.\nرقم هاتفي: ${phone}`
    );
    // Support number — replace with your actual support WhatsApp
    window.open(`https://wa.me/212600000000?text=${msg}`, "_blank");
    setSent(true);
  };

  const handleMessenger = () => {
    if (!phone.trim()) {
      toast({ title: "يرجى إدخال رقم الهاتف", variant: "destructive" });
      return;
    }
    // Facebook page ID — replace with actual
    window.open(`https://m.me/hndriver`, "_blank");
    setSent(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (method === "email") handleEmailSubmit();
    else if (method === "whatsapp") handleWhatsApp();
    else if (method === "messenger") handleMessenger();
  };

  const methods: { id: RecoveryMethod; label: string; icon: any; desc: string }[] = [
    { id: "email", label: "البريد الإلكتروني", icon: Mail, desc: "إرسال رابط إعادة التعيين عبر Email" },
    { id: "whatsapp", label: "واتساب", icon: MessageCircle, desc: "تواصل مع الدعم عبر WhatsApp" },
    { id: "messenger", label: "مسنجر", icon: Phone, desc: "تواصل مع الدعم عبر Messenger" },
  ];

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
        <p className="text-sm text-muted-foreground mt-1">اختر طريقة استعادة حسابك</p>
      </motion.div>

      {sent ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4 w-full max-w-sm mx-auto relative z-10 text-center"
        >
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground">
            {method === "email" ? "تم الإرسال بنجاح" : "تم فتح المحادثة"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {method === "email" ? (
              <>
                تم إرسال رابط إعادة تعيين كلمة المرور إلى<br />
                <span className="font-medium text-foreground">{email}</span><br />
                تحقق من صندوق الوارد أو مجلد البريد غير المرغوب فيه
              </>
            ) : (
              <>
                تواصل مع فريق الدعم عبر {method === "whatsapp" ? "واتساب" : "مسنجر"} لاستعادة حسابك.
                <br />سيساعدك الفريق في إعادة تعيين كلمة المرور.
              </>
            )}
          </p>
          <Button
            onClick={() => { setSent(false); setMethod("email"); }}
            variant="outline"
            className="w-full h-11 rounded-xl border-border text-foreground mt-2"
          >
            تجربة طريقة أخرى
          </Button>
          <Button
            onClick={() => navigate(-1)}
            className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold"
          >
            العودة لتسجيل الدخول
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-4 w-full max-w-sm mx-auto relative z-10"
        >
          {/* Method selector */}
          <div className="space-y-2">
            {methods.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`w-full rounded-xl p-3 border flex items-center justify-between transition-all ${
                    method === m.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {method === m.id && <CheckCircle className="w-4 h-4 text-primary" />}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      method === m.id ? "bg-primary/20" : "bg-secondary"
                    }`}>
                      <Icon className={`w-4 h-4 ${method === m.id ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Input based on method */}
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {method === "email" ? (
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
            ) : (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground block">رقم الهاتف</label>
                <div className="relative">
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+212 6XX XXX XXX"
                    type="tel"
                    className="bg-secondary/80 border-border text-foreground placeholder:text-muted-foreground h-12 rounded-xl pr-11"
                    dir="ltr"
                  />
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className={`w-full h-12 rounded-xl font-bold text-lg transition-opacity ${
                method === "whatsapp"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : method === "messenger"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "gradient-primary text-primary-foreground glow-primary"
              }`}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : method === "email" ? (
                "إرسال رابط الاستعادة"
              ) : method === "whatsapp" ? (
                "فتح واتساب"
              ) : (
                "فتح مسنجر"
              )}
            </Button>
          </form>

          <p className="text-xs text-center text-muted-foreground mt-2">
            عبر البريد الإلكتروني ستتلقى رابطاً فورياً لإعادة التعيين.
            <br />
            عبر واتساب أو مسنجر سيساعدك فريق الدعم يدوياً.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default ForgotPassword;
