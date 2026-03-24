import { useI18n } from "@/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Package, BarChart3, Zap, Shield, DollarSign, MapPin, ArrowRight, Menu, X, Users, Truck, Headphones, ShieldCheck, Store, Coffee, Shirt, Croissant, ShoppingCart, UtensilsCrossed, Printer } from "lucide-react";
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

  const serviceCategories = [
    { key: "shops", icon: Store, label: lt.catShops },
    { key: "cafes", icon: Coffee, label: lt.catCafes },
    { key: "clothing", icon: Shirt, label: lt.catClothing },
    { key: "bakeries", icon: Croissant, label: lt.catBakeries },
    { key: "online-stores", icon: ShoppingCart, label: lt.catOnlineStores },
    { key: "restaurants", icon: UtensilsCrossed, label: lt.catRestaurants },
    { key: "printing", icon: Printer, label: lt.catPrinting },
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
            <Button variant="ghost" size="sm" onClick={() => navigate("/call-center/login")} className="text-muted-foreground hover:text-primary gap-1.5">
              <Headphones className="w-4 h-4" />
              {dir === "rtl" ? "مركز الاتصال" : "Call Center"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/login")} className="text-muted-foreground hover:text-primary gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              {dir === "rtl" ? "الإدارة" : "Admin"}
            </Button>
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
            <Button variant="ghost" onClick={() => { navigate("/call-center/login"); setMenuOpen(false); }} className="justify-start gap-2">
              <Headphones className="w-4 h-4" />
              {dir === "rtl" ? "مركز الاتصال" : "Call Center"}
            </Button>
            <Button variant="ghost" onClick={() => { navigate("/admin/login"); setMenuOpen(false); }} className="justify-start gap-2">
              <ShieldCheck className="w-4 h-4" />
              {dir === "rtl" ? "الإدارة" : "Admin"}
            </Button>
            <Button variant="ghost" onClick={() => { navigate("/login"); setMenuOpen(false); }}>{t.common.login}</Button>
            <Button onClick={() => { navigate("/auth/client"); setMenuOpen(false); }} className="gradient-primary text-primary-foreground">{t.common.signup}</Button>
          </motion.div>
        )}
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Pure black background with subtle atmospheric effects */}
        <div className="absolute inset-0 bg-background">
          {/* Blue atmospheric haze */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 30%, hsl(205 78% 56% / 0.06) 0%, transparent 60%)" }} />
          {/* Orange warm accent */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 70%, hsl(32 95% 55% / 0.04) 0%, transparent 50%)" }} />
        </div>

        {/* Neon ground streaks — dramatic speed lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {/* Static glow lines */}
          <div className="absolute bottom-20 left-0 right-0 h-px bg-gradient-to-r from-transparent via-info/30 to-transparent" />
          <div className="absolute bottom-24 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
          <div className="absolute bottom-32 left-0 right-0 h-px bg-gradient-to-r from-transparent via-info/15 to-transparent" />

          {/* Animated speed streaks — orange */}
          <motion.div
            className="absolute bottom-16 h-0.5 w-48 bg-gradient-to-r from-transparent via-primary to-transparent"
            animate={{ x: ["-200px", "110vw"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
          />
          <motion.div
            className="absolute bottom-36 h-[3px] w-64 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, hsl(32 95% 55% / 0.8), hsl(32 95% 55% / 0.4), transparent)" }}
            animate={{ x: ["-300px", "120vw"] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "linear", repeatDelay: 3 }}
          />
          {/* Animated speed streaks — blue */}
          <motion.div
            className="absolute bottom-28 h-0.5 w-40 bg-gradient-to-r from-transparent via-info to-transparent"
            animate={{ x: ["110vw", "-200px"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 2 }}
          />
          <motion.div
            className="absolute bottom-44 h-[2px] w-56 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, hsl(205 78% 56% / 0.6), hsl(205 78% 56% / 0.3), transparent)" }}
            animate={{ x: ["120vw", "-300px"] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
          />

          {/* Vertical accent beams */}
          <motion.div
            className="absolute left-[15%] bottom-0 w-px h-40"
            style={{ background: "linear-gradient(to top, hsl(32 95% 55% / 0.4), transparent)" }}
            animate={{ opacity: [0.2, 0.6, 0.2], height: ["120px", "200px", "120px"] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute right-[20%] bottom-0 w-px h-32"
            style={{ background: "linear-gradient(to top, hsl(205 78% 56% / 0.3), transparent)" }}
            animate={{ opacity: [0.15, 0.5, 0.15], height: ["100px", "160px", "100px"] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
        </div>

        {/* Hero content */}
        <div className="container mx-auto px-4 relative z-10 pt-24">
          <div className="grid lg:grid-cols-2 gap-8 items-center max-w-7xl mx-auto">
            {/* Left: Emblem + Text */}
            <div className="flex flex-col items-center lg:items-start order-2 lg:order-1">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={scaleIn}
                className="relative mb-6"
              >
                {/* Outer dramatic glow */}
                <motion.div
                  className="absolute inset-0 rounded-full scale-150"
                  style={{ background: "radial-gradient(circle, hsl(32 95% 55% / 0.15) 0%, hsl(205 78% 56% / 0.05) 50%, transparent 70%)" }}
                  animate={{ scale: [1.4, 1.6, 1.4], opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Inner golden pulse */}
                <motion.div
                  className="absolute inset-0 rounded-full scale-125"
                  style={{ background: "radial-gradient(circle, hsl(32 95% 55% / 0.3) 0%, transparent 60%)" }}
                  animate={{ scale: [1.2, 1.35, 1.2], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                />
                {/* Rotating ring */}
                <motion.div
                  className="absolute inset-0 rounded-full scale-115 border-2 border-primary/25"
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                  style={{ borderStyle: "dashed" }}
                />
                {/* Blue accent ring */}
                <motion.div
                  className="absolute inset-0 rounded-full scale-130"
                  style={{ border: "1px solid hsl(205 78% 56% / 0.15)" }}
                  animate={{ scale: [1.3, 1.4, 1.3], opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                />
                <div className="absolute inset-0 blur-3xl bg-primary/25 rounded-full scale-110" />
                <img
                  src={heroEmblem}
                  alt="HN Driver Emblem"
                  className="relative w-56 h-56 md:w-72 md:h-72 lg:w-[360px] lg:h-[360px] object-contain drop-shadow-[0_0_30px_hsl(32,95%,55%,0.4)]"
                  width={800}
                  height={800}
                />
              </motion.div>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
                <span className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/15 border border-primary/30 text-white text-base font-bold mb-4 tracking-wide glow-ring-orange">
                  🚀 {dir === "rtl" ? "متوفر الآن بطنجة" : "Now available in Tangier"}
                </span>
              </motion.div>

              <motion.h1 initial="hidden" animate="visible" variants={fadeUp} custom={1} className="text-3xl md:text-4xl lg:text-5xl font-bold font-display leading-tight text-center lg:text-start">
                <span className="text-gradient-primary glow-text">{lt.heroTitle}</span>
              </motion.h1>

              <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={2} className="mt-4 text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed text-center lg:text-start">
                {lt.heroSubtitle}
              </motion.p>

              <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3} className="mt-6 flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
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

            {/* Right: 3 Categories */}
            <div className="order-1 lg:order-2 flex flex-col gap-4">
              {[
                { img: heroDriver, label: dir === "rtl" ? "سائق" : "Driver", desc: dir === "rtl" ? "سائقون محترفون وموثوقون" : "Professional & trusted drivers", route: "/auth/driver" },
                { img: heroCustomer, label: dir === "rtl" ? "زبون" : "Customer", desc: dir === "rtl" ? "احجز رحلتك بسهولة" : "Book your ride easily", route: "/auth/client" },
                { img: heroDelivery, label: dir === "rtl" ? "توصيل" : "Delivery", desc: dir === "rtl" ? "توصيل سريع وفعّال" : "Fast & efficient delivery", route: "/delivery" },
              ].map((cat, i) => (
                <motion.div
                  key={cat.label}
                  initial="hidden"
                  animate="visible"
                  variants={fadeUp}
                  custom={i + 1}
                  onClick={() => navigate(cat.route)}
                  className="group relative flex items-center gap-4 p-3 rounded-2xl glass border border-border hover:border-primary/40 cursor-pointer transition-all duration-500 overflow-hidden"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl gradient-primary opacity-0 group-hover:opacity-[0.06] transition-opacity duration-500" />
                  
                  {/* Image */}
                  <div className="relative w-24 h-24 md:w-28 md:h-28 flex-shrink-0 rounded-xl overflow-hidden bg-secondary/30">
                    <img
                      src={cat.img}
                      alt={cat.label}
                      className="w-full h-full object-cover object-top scale-110 group-hover:scale-125 transition-transform duration-700"
                      width={768}
                      height={768}
                      loading="lazy"
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg md:text-xl font-bold font-display text-foreground group-hover:text-primary transition-colors">
                      {cat.label}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">{cat.desc}</p>
                  </div>

                  {/* Arrow */}
                  <ArrowRight className={`w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0 ${dir === "rtl" ? "rotate-180" : ""}`} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stats bar */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            custom={5}
            className="mt-16 md:mt-20 max-w-3xl mx-auto"
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

      {/* ─── Browse Services ─── */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 particles-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center font-display mb-4">
            <span className="text-gradient-primary">{lt.browseServicesTitle}</span>
          </motion.h2>
          <div className="w-20 h-1 gradient-primary mx-auto rounded-full mb-14" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
            {serviceCategories.map((cat, i) => (
              <motion.div
                key={cat.key}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                custom={i + 1}
                onClick={() => navigate(`/delivery/${cat.key}`)}
                className="group cursor-pointer rounded-2xl p-6 gradient-card border border-border hover:border-primary/40 transition-all duration-500 text-center"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <cat.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-sm md:text-base">{cat.label}</h3>
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
