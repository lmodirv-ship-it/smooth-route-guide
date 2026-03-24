import { useI18n } from "@/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Package, BarChart3, Zap, Shield, DollarSign, MapPin, ArrowRight, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import logo from "@/assets/hn-driver-logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

export default function LandingPage() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const lt = t.landing;

  const services = [
    { icon: Car, title: lt.rideTitle, desc: lt.rideDesc, color: "text-primary" },
    { icon: Package, title: lt.deliveryTitle, desc: lt.deliveryDesc, color: "text-success" },
    { icon: BarChart3, title: lt.businessTitle, desc: lt.businessDesc, color: "text-info" },
  ];

  const features = [
    { icon: Zap, title: lt.why1Title, desc: lt.why1Desc },
    { icon: Shield, title: lt.why2Title, desc: lt.why2Desc },
    { icon: DollarSign, title: lt.why3Title, desc: lt.why3Desc },
    { icon: MapPin, title: lt.why4Title, desc: lt.why4Desc },
  ];

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="HN Driver" className="w-9 h-9 rounded-full" />
            <span className="font-display text-xl font-bold text-gradient-primary tracking-wide">HN DRIVER</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher variant="ghost" />
            <Button variant="ghost" onClick={() => navigate("/login")} className="text-foreground">
              {t.common.login}
            </Button>
            <Button onClick={() => navigate("/auth/client")} className="gradient-primary text-primary-foreground font-semibold rounded-full px-6">
              {t.common.signup}
            </Button>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-3">
            <LanguageSwitcher variant="outline" />
            <Button variant="ghost" onClick={() => { navigate("/login"); setMenuOpen(false); }}>{t.common.login}</Button>
            <Button onClick={() => { navigate("/auth/client"); setMenuOpen(false); }} className="gradient-primary text-primary-foreground">{t.common.signup}</Button>
          </motion.div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-80" />
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-info/5 blur-3xl" />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
              🚀 Now available in Tangier
            </span>
          </motion.div>

          <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="text-4xl md:text-6xl lg:text-7xl font-bold font-display leading-tight">
            <span className="text-gradient-primary">{lt.heroTitle}</span>
          </motion.h1>

          <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {lt.heroSubtitle}
          </motion.p>

          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/welcome")} className="gradient-primary text-primary-foreground font-bold text-lg rounded-full px-10 py-6 glow-primary">
              {lt.heroCta}
              <ArrowRight className="w-5 h-5 ms-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="rounded-full px-10 py-6 border-border text-foreground hover:bg-secondary">
              {t.common.login}
            </Button>
          </motion.div>

          {/* Stats */}
          <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4} className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { value: "10K+", label: dir === "rtl" ? "مستخدم" : "Users" },
              { value: "500+", label: dir === "rtl" ? "سائق" : "Drivers" },
              { value: "50K+", label: dir === "rtl" ? "رحلة" : "Rides" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-primary">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Services ─── */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center font-display mb-16">
            {lt.servicesTitle}
          </motion.h2>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {services.map((s, i) => (
              <motion.div key={s.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} className="group relative rounded-2xl p-8 bg-card border border-border hover:border-primary/30 transition-all duration-300">
                <div className="absolute inset-0 rounded-2xl gradient-primary opacity-0 group-hover:opacity-5 transition-opacity" />
                <div className={`w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-5 ${s.color}`}>
                  <s.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why HN Driver ─── */}
      <section className="py-20 md:py-28 bg-secondary/30">
        <div className="container mx-auto px-4">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center font-display mb-16">
            {lt.whyTitle}
          </motion.h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} className="text-center p-6 rounded-2xl bg-card/50 border border-border hover:border-primary/20 transition-colors">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold font-display mb-6">
              <span className="text-gradient-primary">{lt.ctaTitle}</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">{lt.ctaSubtitle}</p>
            <Button size="lg" onClick={() => navigate("/auth/client")} className="gradient-primary text-primary-foreground font-bold text-lg rounded-full px-12 py-6 glow-primary">
              {lt.ctaButton}
              <ArrowRight className="w-5 h-5 ms-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="HN Driver" className="w-7 h-7 rounded-full" />
            <span className="text-sm text-muted-foreground">{lt.footerRights}</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">{lt.footerTerms}</a>
            <a href="#" className="hover:text-foreground transition-colors">{lt.footerPrivacy}</a>
            <a href="#" className="hover:text-foreground transition-colors">{lt.footerContact}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
