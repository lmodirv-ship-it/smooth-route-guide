import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, DollarSign, Clock, Shield, TrendingUp, Users, ArrowRight, CheckCircle2, Star, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageMeta from "@/components/PageMeta";
import { trackEvent } from "@/components/TrackingScripts";
import { captureAttribution } from "@/lib/utm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const benefits = [
  { icon: DollarSign, title: "أرباح حقيقية", desc: "اربح حتى 8000 درهم شهرياً", color: "text-success" },
  { icon: Clock, title: "وقت مرن", desc: "اشتغل في الوقت الذي يناسبك", color: "text-info" },
  { icon: Shield, title: "تأمين كامل", desc: "حماية ودعم 24/7", color: "text-primary" },
  { icon: TrendingUp, title: "نمو مستمر", desc: "آلاف الطلبات يومياً", color: "text-warning" },
  { icon: Users, title: "مجتمع داعم", desc: "انضم لـ 1000+ سائق", color: "text-violet-500" },
  { icon: Globe, title: "حضور عالمي", desc: "نتوسع في 10 دول", color: "text-cyan-500" },
];

const steps = [
  "املأ النموذج (دقيقة واحدة)",
  "نتواصل معك خلال 24 ساعة",
  "ارفع وثائقك (رخصة + سيارة)",
  "ابدأ في تحقيق الأرباح",
];

const JoinDriver = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", city: "", email: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    captureAttribution();
    trackEvent("ViewContent", { content_name: "Join Driver Landing", content_category: "lead_gen" });
  }, []);

  const submit = async () => {
    if (!form.name || !form.phone) { toast.error("الاسم والهاتف مطلوبان"); return; }
    setLoading(true);
    const attr = JSON.parse(localStorage.getItem("hn_attribution") || "{}");
    const { error } = await supabase.from("hn_driver_leads").insert({
      business_name: form.name,
      phone: form.phone,
      city: form.city || null,
      segment: "driver_signup",
      source: attr.utm_source || "organic",
      status: "new",
    });
    setLoading(false);
    if (error) { toast.error("حدث خطأ، حاول لاحقاً"); return; }
    trackEvent("Lead", { content_name: "Driver Signup", value: 50, currency: "MAD" });
    trackEvent("CompleteRegistration", { content_name: "Driver Lead" });
    toast.success("✅ شكراً! سنتواصل معك قريباً");
    setTimeout(() => navigate("/auth/driver?ref=join-driver"), 1500);
  };

  return (
    <div className="min-h-screen gradient-dark" dir="rtl">
      <PageMeta
        title="انضم كسائق - HN Driver | اربح حتى 8000 درهم شهرياً"
        description="انضم لمنصة HN Driver كسائق واربح دخلاً مرناً. آلاف الطلبات يومياً، تأمين كامل، دعم 24/7. سجل الآن في أقل من دقيقة."
        keywords="سائق, عمل سائق, وظيفة سائق, ربح من السواقة, تطبيق سائق, HN Driver"
      />

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <Star className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">+1000 سائق نشط</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            كن <span className="text-primary">سائقاً</span> واربح
            <br />دخلاً <span className="text-success">حقيقياً</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            انضم لأسرع منصة نقل وتوصيل في المغرب والعالم. ابدأ في تحقيق الأرباح من اليوم.
          </p>
        </motion.div>
      </section>

      {/* Form */}
      <section className="px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="max-w-md mx-auto glass-card rounded-2xl p-6 border border-primary/20">
          <h2 className="text-xl font-bold text-foreground mb-1 text-center">سجل بياناتك الآن</h2>
          <p className="text-sm text-muted-foreground text-center mb-5">سنتواصل معك خلال 24 ساعة</p>
          <div className="space-y-3">
            <Input placeholder="الاسم الكامل" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="bg-secondary border-border h-11" />
            <Input placeholder="رقم الهاتف" type="tel" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="bg-secondary border-border h-11" />
            <Input placeholder="المدينة" value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="bg-secondary border-border h-11" />
            <Input placeholder="البريد الإلكتروني (اختياري)" type="email" value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="bg-secondary border-border h-11" />
            <Button onClick={submit} disabled={loading}
              className="w-full gradient-primary text-primary-foreground h-12 text-base font-bold">
              {loading ? "جاري الإرسال..." : "ابدأ الآن مجاناً"} <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-12 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            لماذا <span className="text-primary">HN Driver</span>؟
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {benefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }} viewport={{ once: true }}
                className="glass-card rounded-xl p-5 text-center">
                <b.icon className={`w-8 h-8 ${b.color} mx-auto mb-3`} />
                <h3 className="font-bold text-foreground text-sm mb-1">{b.title}</h3>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="px-6 py-12">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">كيف تبدأ؟</h2>
          <div className="space-y-3">
            {steps.map((s, i) => (
              <div key={i} className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center font-bold text-primary-foreground flex-shrink-0">{i + 1}</div>
                <span className="text-foreground">{s}</span>
                <CheckCircle2 className="w-5 h-5 text-success mr-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 text-center">
        <Car className="w-16 h-16 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-3">جاهز لبدء رحلتك؟</h2>
        <p className="text-muted-foreground mb-6">انضم لآلاف السائقين الذين يحققون دخلاً مع HN Driver</p>
        <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="gradient-primary text-primary-foreground h-12 px-8 text-base font-bold">
          سجل الآن <ArrowRight className="w-4 h-4 mr-2" />
        </Button>
      </section>
    </div>
  );
};

export default JoinDriver;
