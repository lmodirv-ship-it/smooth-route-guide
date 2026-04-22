import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Store, TrendingUp, Users, Zap, Shield, Globe, ArrowRight, CheckCircle2, Star, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PageMeta from "@/components/PageMeta";
import { trackEvent } from "@/components/TrackingScripts";
import { captureAttribution } from "@/lib/utm";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const benefits = [
  { icon: Users, title: "آلاف العملاء", desc: "وصول فوري لعملاء جدد" },
  { icon: TrendingUp, title: "زيادة المبيعات", desc: "نمو يصل إلى 40%" },
  { icon: Zap, title: "توصيل سريع", desc: "أسطول سائقين متفرغ" },
  { icon: Shield, title: "بدون تكاليف", desc: "تسجيل مجاني بالكامل" },
  { icon: Globe, title: "حضور رقمي", desc: "متجرك يظهر للعالم" },
  { icon: Star, title: "دعم متواصل", desc: "فريق دعم مخصص لمحلك" },
];

const JoinRestaurant = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ business_name: "", phone: "", city: "", category: "restaurant", address: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    captureAttribution();
    trackEvent("ViewContent", { content_name: "Join Restaurant Landing", content_category: "lead_gen" });
  }, []);

  const submit = async () => {
    if (!form.business_name || !form.phone) { toast.error("اسم المحل والهاتف مطلوبان"); return; }
    setLoading(true);
    const attr = JSON.parse(localStorage.getItem("hn_attribution") || "{}");
    const { error } = await supabase.from("hn_driver_leads").insert({
      business_name: form.business_name,
      phone: form.phone,
      city: form.city || null,
      address: form.address || null,
      category: form.category,
      segment: "store_signup",
      source: attr.utm_source || "organic",
      status: "new",
    });
    setLoading(false);
    if (error) { toast.error("حدث خطأ، حاول لاحقاً"); return; }
    trackEvent("Lead", { content_name: "Restaurant Signup", value: 100, currency: "MAD" });
    trackEvent("CompleteRegistration", { content_name: "Restaurant Lead" });
    toast.success("✅ تم تسجيل محلك! سنتواصل معك قريباً");
    setTimeout(() => navigate("/auth/store_owner?ref=join-restaurant"), 1500);
  };

  return (
    <div className="min-h-screen gradient-dark" dir="rtl">
      <PageMeta
        title="انضم كمطعم/متجر - HN Driver | زد مبيعاتك مع آلاف العملاء"
        description="سجل مطعمك أو متجرك في HN Driver واحصل على آلاف العملاء الجدد. تسجيل مجاني، توصيل سريع، نمو مضمون في المبيعات."
        keywords="مطعم, متجر, توصيل طعام, عمل تجاري, تسجيل متجر, HN Driver"
      />

      <section className="relative px-6 pt-20 pb-12 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-warning/10 via-transparent to-transparent" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-warning/10 border border-warning/20 mb-6">
            <ShoppingBag className="w-4 h-4 text-warning" />
            <span className="text-sm text-warning font-medium">+500 متجر شريك</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            وسّع <span className="text-warning">مبيعات</span> محلك
            <br />مع <span className="text-primary">HN Driver</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            انضم لأكبر منصة توصيل في المغرب. عملاء جدد، مبيعات أكبر، نمو مستمر.
          </p>
        </motion.div>
      </section>

      <section className="px-6 pb-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="max-w-md mx-auto glass-card rounded-2xl p-6 border border-warning/20">
          <h2 className="text-xl font-bold text-foreground mb-1 text-center">سجل محلك مجاناً</h2>
          <p className="text-sm text-muted-foreground text-center mb-5">بدون أي تكاليف ابتدائية</p>
          <div className="space-y-3">
            <Input placeholder="اسم المحل / المطعم" value={form.business_name}
              onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))}
              className="bg-secondary border-border h-11" />
            <Input placeholder="رقم الهاتف" type="tel" value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="bg-secondary border-border h-11" />
            <Input placeholder="المدينة" value={form.city}
              onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
              className="bg-secondary border-border h-11" />
            <Input placeholder="العنوان" value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="bg-secondary border-border h-11" />
            <select value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full h-11 rounded-md bg-secondary border border-border px-3 text-foreground">
              <option value="restaurant">مطعم</option>
              <option value="grocery">بقالة</option>
              <option value="pharmacy">صيدلية</option>
              <option value="retail">متجر تجزئة</option>
              <option value="other">أخرى</option>
            </select>
            <Button onClick={submit} disabled={loading}
              className="w-full gradient-primary text-primary-foreground h-12 text-base font-bold">
              {loading ? "جاري الإرسال..." : "سجل محلي الآن"} <ArrowRight className="w-4 h-4 mr-2" />
            </Button>
          </div>
        </motion.div>
      </section>

      <section className="px-6 py-12 bg-secondary/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
            مزايا <span className="text-warning">شراكتك</span> معنا
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {benefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }} viewport={{ once: true }}
                className="glass-card rounded-xl p-5 text-center">
                <b.icon className="w-8 h-8 text-warning mx-auto mb-3" />
                <h3 className="font-bold text-foreground text-sm mb-1">{b.title}</h3>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-6 py-16 text-center">
        <Store className="w-16 h-16 text-warning mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-3">جاهز لتوسيع تجارتك؟</h2>
        <Button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="gradient-primary text-primary-foreground h-12 px-8 text-base font-bold">
          سجل محلك الآن <ArrowRight className="w-4 h-4 mr-2" />
        </Button>
      </section>
    </div>
  );
};

export default JoinRestaurant;
