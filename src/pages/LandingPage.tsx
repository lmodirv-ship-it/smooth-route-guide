import { useI18n } from "@/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Package, BarChart3, Zap, Shield, DollarSign, MapPin, ArrowRight, Menu, X, Users, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import logo from "@/assets/hn-driver-badge.png";
import heroSkyline from "@/assets/hero-skyline.jpg";
import heroEmblem from "@/assets/hero-emblem.png";
import heroDriver from "@/assets/hero-driver.png";
import heroCustomer from "@/assets/hero-customer.png";
import heroDelivery from "@/assets/hero-delivery.png";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" as const } }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut" as const } },
};

export default function LandingPage() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const lt = t.landing;

  const services = [
    { icon: Car, title: lt.rideTitle, desc: lt.rideDesc, glow: "glow-ring-orange" },
    { icon: Package, title: lt.deliveryTitle, desc: lt.deliveryDesc, glow: "glow-ring-blue" },
    { icon: BarChart3, title: lt.businessTitle, desc: lt.businessDesc, glow: "glow-ring-orange" },
  ];

  const features = [
    { icon: Zap, title: lt.why1Title, desc: lt.why1Desc },
    { icon: Shield, title: lt.why2Title, desc: lt.why2Desc },
    { icon: DollarSign, title: lt.why3Title, desc: lt.why3Desc },
    { icon: MapPin, title: lt.why4Title, desc: lt.why4Desc },
  ];

  const stats = [
    { value: "10K+", label: dir === "rtl" ? "أكثر من 10 آلاف" : "Users", icon: MapPin },
    { value: "500+", label: dir === "rtl" ? "أكثر من 500" : "Drivers", icon: Truck },
    { value: "50K+", label: dir === "rtl" ? "أكثر من 50 ألف" : "Rides", icon: Users },
  ];

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-strong">
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="HN Driver" className="w-9 h-9 rounded-full" />
            <span className="font-display text-xl font-bold text-gradient-primary tracking-wide">
              {dir === "rtl" ? "سائق HN" : "HN DRIVER"}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher variant="ghost" />
            <Button variant="ghost" onClick={() => navigate("/login")} className="text-foreground hover:text-primary">
              {t.common.login}
            </Button>
            <Button onClick={() => navigate("/auth/client")} className="gradient-primary text-primary-foreground font-semibold rounded-full px-6 glow-primary">
              {t.common.signup}
            </Button>
          </div>

          <button className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-t border-border bg-background px-4 py-4 flex flex-col gap-3">
            <LanguageSwitcher variant="outline" />
            <Button variant="ghost" onClick={() => { navigate("/login"); setMenuOpen(false); }}>{t.common.login}</Button>
            <Button onClick={() => { navigate("/auth/client"); setMenuOpen(false); }} className="gradient-primary text-primary-foreground">{t.common.signup}</Button>
          </motion.div>
        )}
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background skyline */}
        <div className="absolute inset-0">
          <img
            src={heroSkyline}
            alt=""
            className="w-full h-full object-cover"
            width={1920}
            height={1080}
          />
          {/* Dark overlay for readability */}
          <div className="absolute inset-0 bg-background/60" />
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-background to-transparent" />
          {/* Top gradient fade */}
          <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-background/80 to-transparent" />
        </div>

        {/* Neon light streaks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute bottom-20 left-0 right-0 h-px bg-gradient-to-r from-transparent via-info/40 to-transparent" />
          <div className="absolute bottom-24 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <motion.div
            className="absolute bottom-16 h-0.5 w-40 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ x: ["-100%", "200vw"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
          />
          <motion.div
            className="absolute bottom-28 h-0.5 w-32 bg-gradient-to-r from-transparent via-info to-transparent"
            animate={{ x: ["200vw", "-100%"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
          />
        </div>

        {/* Hero content */}
        <div className="container mx-auto px-4 relative z-10 pt-24">
          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-6xl mx-auto">
            {/* Left: Emblem */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={scaleIn}
              className="flex justify-center lg:justify-start order-2 lg:order-1"
            >
              <div className="relative">
                {/* Glow behind emblem */}
                <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full scale-110" />
                <img
                  src={heroEmblem}
                  alt="HN Driver Emblem"
                  className="relative w-64 h-64 md:w-80 md:h-80 lg:w-[420px] lg:h-[420px] object-contain drop-shadow-2xl"
                  width={800}
                  height={800}
                />
              </div>
            </motion.div>

            {/* Right: Text */}
            <div className="text-center lg:text-start order-1 lg:order-2">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-semibold mb-6">
                  🚀 {dir === "rtl" ? "متوفر الآن بطنجة" : "Now available in Tangier"}
                </span>
              </motion.div>

              <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-tight">
                <span className="text-gradient-primary glow-text">{lt.heroTitle}</span>
              </motion.h1>

              <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-5 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
                {lt.heroSubtitle}
              </motion.p>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-8 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Button
                  size="lg"
                  onClick={() => navigate("/welcome")}
                  className="gradient-primary text-primary-foreground font-bold text-lg rounded-full px-10 py-6 glow-primary animate-pulse-glow"
                >
                  {lt.heroCta}
                  <ArrowRight className={`w-5 h-5 ${dir === "rtl" ? "me-2 rotate-180" : "ms-2"}`} />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="rounded-full px-10 py-6 border-border text-foreground hover:bg-secondary hover:border-primary/30"
                >
                  {t.common.login}
                </Button>
              </motion.div>
            </div>
          </div>

          {/* Stats bar */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={5}
            className="mt-16 md:mt-24 max-w-3xl mx-auto"
          >
            <div className="glass rounded-2xl p-6 grid grid-cols-3 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <stat.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                  <div className="text-2xl md:text-3xl font-bold text-gradient-primary font-display">{stat.value}</div>
                  <div className="text-xs md:text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Services ─── */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 particles-bg opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center font-display mb-4">
            <span className="text-gradient-primary">{lt.servicesTitle}</span>
          </motion.h2>
          <div className="w-20 h-1 gradient-primary mx-auto rounded-full mb-14" />

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                className={`group relative rounded-2xl p-8 gradient-card border border-border hover:border-primary/40 transition-all duration-500 ${s.glow}`}
              >
                <div className="absolute inset-0 rounded-2xl gradient-primary opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500" />
                <div className="icon-circle-orange mb-5">
                  <s.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground">{s.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Why HN Driver ─── */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/20 to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center font-display mb-4">
            <span className="text-gradient-primary">{lt.whyTitle}</span>
          </motion.h2>
          <div className="w-20 h-1 gradient-primary mx-auto rounded-full mb-14" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                className="text-center p-6 rounded-2xl gradient-card border border-border hover:border-primary/30 transition-all duration-500 group"
              >
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        {/* Neon accent lines */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold font-display mb-6">
              <span className="text-gradient-primary glow-text">{lt.ctaTitle}</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">{lt.ctaSubtitle}</p>
            <Button
              size="lg"
              onClick={() => navigate("/auth/client")}
              className="gradient-primary text-primary-foreground font-bold text-lg rounded-full px-12 py-6 glow-primary animate-pulse-glow"
            >
              {lt.ctaButton}
              <ArrowRight className={`w-5 h-5 ${dir === "rtl" ? "me-2 rotate-180" : "ms-2"}`} />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border py-10 relative">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logo} alt="HN Driver" className="w-7 h-7 rounded-full" />
            <span className="text-sm text-muted-foreground">{lt.footerRights}</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">{lt.footerTerms}</a>
            <a href="#" className="hover:text-primary transition-colors">{lt.footerPrivacy}</a>
            <a href="#" className="hover:text-primary transition-colors">{lt.footerContact}</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
