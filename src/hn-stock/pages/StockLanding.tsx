import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Package, ArrowLeft, Phone, MapPin, Users, Zap, BarChart3, Shield,
  Clock, Layers, Link2, Mail, MessageCircle, Store, ChevronDown
} from "lucide-react";
import { useState, useEffect } from "react";

/* ─── Top Announcement Bar ─── */
const TopBar = () => {
  const [count, setCount] = useState(1641);
  useEffect(() => {
    const t = setInterval(() => setCount(c => c + (Math.random() > 0.5 ? 1 : -1)), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full bg-[#0c0f1a] border-b border-white/5 text-xs text-gray-400 py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1">
            <Phone className="w-3 h-3" /> 0668-546-358
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-bold">{count.toLocaleString()}</span> متصل الآن
          </span>
        </div>
        <span className="hidden sm:block">مستودعان استراتيجيان — طنجة للشمال، مراكش للجنوب</span>
        <div className="flex items-center gap-3">
          <button className="hover:text-white transition">سجّل مجاناً</button>
          <span>|</span>
          <button className="hover:text-white transition">دخول</button>
          <div className="flex gap-1 mr-2">
            {["EN", "FR"].map(l => (
              <span key={l} className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 hover:bg-white/10 cursor-pointer">{l}</span>
            ))}
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500 text-black font-bold">AR</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Navbar ─── */
const Navbar = () => {
  const navigate = useNavigate();
  const links = ["الخدمات", "كيف نعمل؟", "من نحن", "الأسعار", "تواصل معنا"];

  return (
    <nav className="sticky top-0 z-50 bg-[#0c0f1a]/95 backdrop-blur-md border-b border-white/5 py-3 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between" dir="rtl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
            <Package className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white">
            hn-driver<span className="text-amber-500">.site</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6">
          {links.map(link => (
            <a key={link} href={`#${link}`} className="text-sm text-gray-300 hover:text-amber-400 transition">{link}</a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex gap-1">
            {["EN", "FR"].map(l => (
              <span key={l} className="px-2 py-1 rounded text-xs bg-white/5 hover:bg-white/10 cursor-pointer text-gray-400">{l}</span>
            ))}
            <span className="px-2 py-1 rounded text-xs bg-amber-500 text-black font-bold">AR</span>
          </div>
          <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:text-white rounded-lg" onClick={() => navigate("/login")}>
            دخول التجار
          </Button>
          <Button size="sm" className="bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-lg" onClick={() => navigate("/login")}>
            افتح حساباً مجاناً
          </Button>
        </div>
      </div>
    </nav>
  );
};

/* ─── Hero Section ─── */
const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative py-20 md:py-32 px-4 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0c0f1a] via-[#111827] to-[#0c0f1a]" />
      {/* Glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]" />

      <div className="relative max-w-4xl mx-auto text-center" dir="rtl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-8">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-amber-400 text-sm font-medium">منصة لوجستيك B2B رقم 1 بالمغرب</span>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-black text-white leading-tight mb-6">
          منصة اللوجستيك{" "}
          <br className="hidden md:block" />
          الأقوى في{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 to-amber-600">
            المغرب للتجارة
          </span>
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-l from-amber-400 to-amber-600">
            الإلكترونية
          </span>
        </h1>

        {/* Description */}
        <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          من التخزين في طنجة ومراكش، إلى تأكيد الطلبات هاتفياً، الطباعة المخصصة
          بشعارك، والتوصيل السريع مع تحصيل COD — نحن ندير عملياتك لتركز أنت على
          زيادة مبيعاتك.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-xl px-8 text-base shadow-lg shadow-amber-500/20"
            onClick={() => navigate("/login")}
          >
            افتح حساب تاجر مجاناً
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded-xl px-8 text-base"
          >
            <Store className="w-4 h-4 ml-2" />
            تصفح متجرنا المدمج
          </Button>
        </div>
      </div>

      {/* Border frame decoration */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[calc(100%-5rem)] border border-amber-500/10 rounded-3xl pointer-events-none" />
    </section>
  );
};

/* ─── How it Works ─── */
const HowItWorks = () => {
  const steps = [
    { num: "01", title: "سجّل متجرك", desc: "افتح حسابك مجاناً وربط متجرك من hn-driver.online", color: "text-amber-400" },
    { num: "02", title: "أرسل منتجاتك", desc: "شحن بضائعك لمستودعنا في طنجة أو مراكش (الجنوب) حسب طلباتك", color: "text-cyan-400" },
    { num: "03", title: "نحن نتولى كل شيء", desc: "تأكيد هاتفي، تغليف مخصص، طباعة بشعارك، ثم التوصيل", color: "text-emerald-400" },
    { num: "04", title: "احصل على أرباحك", desc: "تحصيل COD ونحوّل لك أرباحك بعد خصم الرسوم", color: "text-purple-400" },
  ];

  return (
    <section id="كيف نعمل؟" className="py-20 px-4 bg-[#0c0f1a]">
      <div className="max-w-7xl mx-auto" dir="rtl">
        <div className="text-center mb-14">
          <span className="text-amber-400 text-sm font-medium">كيف يعمل النظام؟</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">4 خطوات فقط</h2>
          <p className="text-gray-400 mt-3">من التسجيل إلى التوصيل — رحلتك معنا بسيطة وواضحة</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.num} className="bg-[#111827] border border-white/5 rounded-2xl p-6 hover:border-amber-500/20 transition group">
              <span className={`text-5xl font-black ${step.color} opacity-30 group-hover:opacity-60 transition`}>{step.num}</span>
              <h3 className="text-white font-bold text-lg mt-3 mb-2">{step.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Why Choose Us ─── */
const WhyChooseUs = () => {
  const features = [
    { icon: Link2, title: "ربط آلي مع hn-driver.online", desc: "متجرك يرسل الطلبات لمنصتنا تلقائياً عبر API — بدون تدخل يدوي" },
    { icon: BarChart3, title: "لوحة تحكم مالية شاملة", desc: "راقب أرباحك ومرتجعاتك ورسوم التخزين بالدرهم المغربي في تقرير واحد" },
    { icon: Zap, title: "معالجة سريعة للطلبيات", desc: "من استلام الطلبية إلى الشحن في أقل من 24 ساعة — في أيام الذروة وغيرها" },
    { icon: Layers, title: "تغليف يعكس هوية التاجر", desc: "شعارك، ألوانك، شخصيتك — على كل علبة وكيس يصل لعميلك" },
    { icon: Clock, title: "دعم فني 24/7", desc: "فريق الدعم متاح على مدار الساعة عبر واتساب والهاتف لأي استفسار" },
    { icon: Shield, title: "بيانات آمنة ومحمية", desc: "قاعدة بيانات محلية مشفرة مع نسخ احتياطي يومي — بياناتك لا تغادر خوادمنا" },
  ];

  return (
    <section id="من نحن" className="py-20 px-4 bg-[#111827]">
      <div className="max-w-7xl mx-auto" dir="rtl">
        <div className="text-center mb-14">
          <span className="text-amber-400 text-sm font-medium">ميزاتنا التنافسية</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">لماذا تختارنا؟</h2>
          <p className="text-gray-400 mt-3">ما يميزنا عن غيرنا من شركات اللوجستيك</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="bg-[#0c0f1a] border border-white/5 rounded-2xl p-6 hover:border-amber-500/20 transition group">
              <div className="flex items-start gap-4">
                <div className="flex-1 text-right">
                  <h3 className="text-white font-bold text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition">
                  <f.icon className="w-5 h-5 text-amber-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Pricing Section ─── */
const PricingSection = () => {
  const plans = [
    {
      name: "الباقة الأساسية",
      price: "مجاناً",
      period: "",
      features: ["تخزين حتى 100 منتج", "تأكيد هاتفي للطلبات", "توصيل COD", "لوحة تحكم أساسية"],
      highlighted: false,
    },
    {
      name: "باقة النمو",
      price: "499",
      period: "درهم/شهر",
      features: ["تخزين حتى 1000 منتج", "تأكيد هاتفي + تغليف مخصص", "توصيل سريع COD", "لوحة تحكم مالية شاملة", "دعم أولوية"],
      highlighted: true,
    },
    {
      name: "باقة المؤسسات",
      price: "تواصل معنا",
      period: "",
      features: ["تخزين غير محدود", "حل لوجستي متكامل", "API مخصص", "مدير حساب شخصي", "تقارير متقدمة"],
      highlighted: false,
    },
  ];

  return (
    <section id="الأسعار" className="py-20 px-4 bg-[#0c0f1a]">
      <div className="max-w-7xl mx-auto" dir="rtl">
        <div className="text-center mb-14">
          <span className="text-amber-400 text-sm font-medium">خطط الأسعار</span>
          <h2 className="text-3xl md:text-4xl font-bold text-white mt-2">اختر الباقة المناسبة</h2>
          <p className="text-gray-400 mt-3">أسعار مرنة تناسب كل حجم أعمال</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 border transition ${
                plan.highlighted
                  ? "bg-gradient-to-b from-amber-500/10 to-[#111827] border-amber-500/30 scale-105"
                  : "bg-[#111827] border-white/5 hover:border-amber-500/20"
              }`}
            >
              <h3 className="text-white font-bold text-xl mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-amber-400">{plan.price}</span>
                {plan.period && <span className="text-gray-400 text-sm">{plan.period}</span>}
              </div>
              <ul className="space-y-3 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-gray-300 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button
                className={`w-full rounded-xl ${
                  plan.highlighted
                    ? "bg-gradient-to-l from-amber-500 to-amber-600 text-black font-bold hover:from-amber-600 hover:to-amber-700"
                    : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                }`}
              >
                ابدأ الآن
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── CTA Section ─── */
const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-20 px-4 bg-gradient-to-b from-[#111827] to-[#0c0f1a]">
      <div className="max-w-3xl mx-auto text-center" dir="rtl">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">ابدأ رحلتك اللوجستية اليوم</h2>
        <p className="text-gray-400 mb-8">انضم لمئات التجار الذين يثقون بـ hn-driver.site لتنمية أعمالهم</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            className="bg-gradient-to-l from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-xl px-8 shadow-lg shadow-amber-500/20"
            onClick={() => navigate("/login")}
          >
            افتح حساب تاجر مجاناً
            <ArrowLeft className="w-4 h-4 mr-2" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded-xl px-8"
            onClick={() => navigate("/login")}
          >
            دخول لوحة التحكم
          </Button>
        </div>
      </div>
    </section>
  );
};

/* ─── Footer ─── */
const Footer = () => (
  <footer className="bg-[#0c0f1a] border-t border-white/5 py-12 px-4" dir="rtl">
    <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Logo & desc */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
            <Package className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white">hn-driver<span className="text-amber-500">.site</span></span>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed">منصة اللوجستيك والتوزيع المتكاملة للتجارة الإلكترونية بالمغرب.</p>
        <a
          href="https://wa.me/212668546358"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-sm hover:bg-emerald-500/10 transition"
        >
          <MessageCircle className="w-4 h-4" />
          WhatsApp — 0668-546-358
        </a>
      </div>

      {/* Quick links */}
      <div>
        <h4 className="text-white font-bold mb-4">روابط سريعة</h4>
        <ul className="space-y-2 text-gray-400 text-sm">
          {["الخدمات", "كيف نعمل؟", "التسعير", "تواصل معنا"].map(l => (
            <li key={l}><a href={`#${l}`} className="hover:text-amber-400 transition">{l}</a></li>
          ))}
        </ul>
      </div>

      {/* Platform */}
      <div>
        <h4 className="text-white font-bold mb-4">المنصة</h4>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li><a href="/login" className="hover:text-amber-400 transition">لوحة التحكم</a></li>
          <li><a href="/login" className="hover:text-amber-400 transition">التسجيل</a></li>
          <li><a href="https://hn-driver.online" className="hover:text-amber-400 transition">متجر hn-driver.online</a></li>
        </ul>
      </div>

      {/* Contact */}
      <div>
        <h4 className="text-white font-bold mb-4">تواصل معنا</h4>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li className="flex items-center gap-2"><Mail className="w-4 h-4" /> lmodirv@gmail.ckm</li>
          <li className="flex items-center gap-2"><Phone className="w-4 h-4" /> 0668-546-358</li>
          <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> طنجة، المغرب — مستودع الشمال</li>
          <li className="flex items-center gap-2"><MapPin className="w-4 h-4" /> مراكش، المغرب — مستودع الجنوب</li>
        </ul>
      </div>
    </div>

    {/* Bottom bar */}
    <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between text-gray-500 text-xs">
      <span>© 2026 hn-driver.site — جميع الحقوق محفوظة</span>
      <div className="flex items-center gap-2 mt-2 sm:mt-0">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span>النظام يعمل بشكل طبيعي</span>
        <span className="mr-2">hn-driver.site</span>
      </div>
    </div>
  </footer>
);

/* ─── WhatsApp Floating Button ─── */
const WhatsAppButton = () => (
  <a
    href="https://wa.me/212668546358"
    target="_blank"
    rel="noopener noreferrer"
    className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-transform hover:scale-110"
  >
    <MessageCircle className="w-7 h-7 text-white" />
  </a>
);

/* ─── Main Landing Page ─── */
const StockLanding = () => {
  return (
    <div className="min-h-screen bg-[#0c0f1a] text-white">
      <TopBar />
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <WhyChooseUs />
      <PricingSection />
      <CTASection />
      <Footer />
      <WhatsAppButton />
    </div>
  );
};

export default StockLanding;
