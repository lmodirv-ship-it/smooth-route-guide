import { useI18n } from "@/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import VisitorCounter from "@/components/VisitorCounter";
import { useNavigate } from "react-router-dom";
import { dashboardForRole } from "@/lib/routes";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Car, Package, BarChart3, Zap, Shield, DollarSign, MapPin, ArrowRight, Menu, X,
  Users, Truck, Headphones, Store, Coffee, Shirt, Croissant, ShoppingCart,
  UtensilsCrossed, Printer, Smartphone, Clock, Download, Star, Phone,
  ChevronDown, Globe, PlayCircle, UserPlus, FileCheck, Quote, ChevronUp,
  MessageSquare, HelpCircle, CheckCircle, LogIn, PlusCircle, Pill, Wrench,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import CinematicParticles from "@/components/CinematicParticles";
import GlobalContactFooter from "@/components/GlobalContactFooter";
import AdsSection from "@/components/AdsSection";
import SignupPopup from "@/components/SignupPopup";
import SignupBanner from "@/components/SignupBanner";
// VisitorCounter already imported above
import HeroPromoFlash from "@/components/HeroPromoFlash";
import TangierSocialProof from "@/components/TangierSocialProof";
import logo from "@/assets/hn-driver-badge.png";
import iconVtcCar from "@/assets/icon-vtc-car-hn.png";
import iconDeliveryBike from "@/assets/icon-delivery-bike-hn.png";
import iconStoreMarketplace from "@/assets/icon-store-marketplace.png";
import iconRestaurant from "@/assets/icon-restaurant.png";
import iconClientApp from "@/assets/icon-client-app.png";
import iconCoupleWelcome from "@/assets/icon-couple-welcome.png";
import partnerHibaEco from "@/assets/partner-hiba-eco.png";
import partnerLavageNizar from "@/assets/partner-lavage-nizar.png";
import partnerTanjaPrint from "@/assets/partner-tanja-print.png";
import partnerSlavacall from "@/assets/partner-slavacall.png";
import projHnDriver from "@/assets/project-hn-driver.png";
import projSoukHn from "@/assets/project-souk-hn.png";
import projHnPrint from "@/assets/project-hn-print.png";
import projGtStudio from "@/assets/project-gt-studio.png";
import projAiScene from "@/assets/project-ai-scene.png";
import projAiVision from "@/assets/project-ai-vision.png";
import projCloud from "@/assets/project-cloud.png";
import projAiVideo from "@/assets/project-ai-video.png";
import projLivraisonExpress from "@/assets/project-livraison-express.jpg";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6, ease: "easeOut" as const } }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const fadeChild = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const FAQItem = ({ question, answer, index }: { question: string; answer: string; index: number }) => {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={index + 1}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-4 p-5 rounded-2xl glass-card hover:border-primary/30 transition-all duration-300 text-start group">
        <span className="font-bold text-foreground group-hover:text-primary transition-colors">{question}</span>
        <ChevronDown className={`w-5 h-5 text-muted-foreground flex-shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-5 pb-4 pt-2 text-sm text-muted-foreground leading-relaxed">
          {answer}
        </motion.div>
      )}
    </motion.div>
  );
};

export default function LandingPage() {
  const { t, dir } = useI18n();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [storeDialogOpen, setStoreDialogOpen] = useState(false);
  const lt = t.landing;

  // Auto-redirect logged-in users to their dashboard
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const firstRole = (roles || [])[0]?.role;
      if (firstRole) {
        navigate(dashboardForRole(firstRole), { replace: true });
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const services = [
    { icon: Car, title: lt.rideTitle, desc: lt.rideDesc, glow: "glow-ring-orange" },
    { icon: Package, title: lt.deliveryTitle, desc: lt.deliveryDesc, glow: "glow-ring-blue" },
    { icon: BarChart3, title: lt.businessTitle, desc: lt.businessDesc, glow: "glow-ring-orange" },
  ];

  const advancedFeatures = [
    { icon: MapPin, title: dir === "rtl" ? "تتبع GPS مباشر" : "Live GPS Tracking", desc: dir === "rtl" ? "تتبع موقع السائقين في الوقت الفعلي مع دقة عالية وتحديثات فورية" : "Track driver locations in real-time with high accuracy", color: "text-info" },
    { icon: Clock, title: dir === "rtl" ? "إدارة الوقت الذكية" : "Smart Time Management", desc: dir === "rtl" ? "جدولة الرحلات وتتبع ساعات العمل وإدارة الإجازات تلقائياً" : "Schedule trips, track hours, manage shifts automatically", color: "text-success" },
    { icon: BarChart3, title: dir === "rtl" ? "تقارير وتحليلات" : "Reports & Analytics", desc: dir === "rtl" ? "لوحة تحكم شاملة مع تقارير مفصلة عن الأداء والإيرادات" : "Comprehensive dashboard with detailed performance reports", color: "text-[hsl(var(--warning))]" },
    { icon: Shield, title: dir === "rtl" ? "أمان متقدم" : "Advanced Security", desc: dir === "rtl" ? "تشفير البيانات ومصادقة ثنائية وحماية كاملة للخصوصية" : "Data encryption, two-factor auth, full privacy protection", color: "text-destructive" },
    { icon: Smartphone, title: dir === "rtl" ? "تطبيق موبايل سهل" : "Easy Mobile App", desc: dir === "rtl" ? "واجهة بسيطة وسريعة للسائقين على iOS و Android" : "Simple, fast interface for drivers on iOS & Android", color: "text-primary" },
    { icon: Zap, title: dir === "rtl" ? "أداء فائق السرعة" : "Blazing Fast Performance", desc: dir === "rtl" ? "استجابة فورية وتحميل سريع وتجربة مستخدم سلسة" : "Instant response, fast loading, smooth UX", color: "text-[hsl(var(--warning))]" },
  ];

  const whyFeatures = [
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

  const partnerSites = [
    { name: "Hiba Eco", url: "https://www.hiba-eco.com", logo: partnerHibaEco },
    { name: "Lavage Nizar", url: "https://www.lavagenizar.com", logo: partnerLavageNizar },
    { name: "Tanja Print", url: "https://www.tanjaprint.com", logo: partnerTanjaPrint },
    { name: "Slava Call Hiba", url: "https://slavacall-hiba.com", logo: partnerSlavacall },
  ];

  const stats = [
    { value: "10K+", label: dir === "rtl" ? "سائق نشط" : "Active Drivers", icon: Users },
    { value: "50K+", label: dir === "rtl" ? "رحلة يومياً" : "Daily Trips", icon: Truck },
    { value: "4.9", label: dir === "rtl" ? "تقييم المستخدمين" : "User Rating", icon: Star },
    { value: "24/7", label: dir === "rtl" ? "دعم متواصل" : "Support", icon: Headphones },
  ];

  const navLinks = [
    { label: dir === "rtl" ? "الميزات" : "Features", href: "#features" },
    { label: dir === "rtl" ? "الخدمات" : "Services", href: "#services" },
    { label: dir === "rtl" ? "تحميل" : "Download", href: "#download" },
    { label: dir === "rtl" ? "اتصل بنا" : "Contact", href: "#contact" },
  ];

  const scrollToSection = (href: string) => {
    setMenuOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div dir={dir} className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      {/* Cinematic Particles Background */}
      {/* Cinematic Particles Background */}
      <CinematicParticles />
      {/* ─── Professional Navbar ─── */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? "glass-strong shadow-lg shadow-background/50" : "bg-transparent"}`}>
        <div className={`absolute bottom-0 inset-x-0 h-px transition-opacity duration-500 bg-gradient-to-r from-transparent via-primary/50 to-transparent ${scrolled ? "opacity-100" : "opacity-0"}`} />
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src={logo} alt="HN Driver" className="w-10 h-10 rounded-full border-2 border-primary/30" />
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-lg" />
            </div>
            <div className="flex flex-col">
              <span className="font-display text-xl font-bold text-gradient-primary tracking-wide leading-none">
                HN DRIVER
              </span>
              <span className="text-[9px] text-muted-foreground/70 tracking-[0.15em] uppercase leading-none mt-0.5">
                {dir === "rtl" ? "نظام إدارة ذكي" : "Smart Management"}
              </span>
            </div>
          </div>

          {/* Desktop Nav Links — Glass bulbs with inner glow */}
          <div className="hidden lg:flex items-center gap-3">
            {navLinks.map((link) => (
              <motion.button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.97 }}
                className="signage-3d-box min-h-0 h-12 px-6 text-sm font-bold uppercase tracking-wide text-foreground rounded-xl flex items-center justify-center"
              >
                <span className="relative z-10">{link.label}</span>
              </motion.button>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <VisitorCounter />
            <LanguageSwitcher variant="ghost" />
            <Button variant="outline" onClick={() => navigate("/login")} className="min-h-0 h-11 px-5 font-medium">
              {t.common.login}
            </Button>
            <Button onClick={() => navigate("/auth/client")} className="min-h-0 h-11 px-6 font-bold">
              {dir === "rtl" ? "ابدأ مجاناً" : "Get Started"}
            </Button>
          </div>

          {/* Mobile Actions */}
          <div className="md:hidden flex items-center gap-2">
            <div className="max-w-[58vw] overflow-hidden">
              <VisitorCounter />
            </div>
            <button className="text-foreground p-2 shrink-0" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="md:hidden border-t border-border bg-background/98 backdrop-blur-xl px-4 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <button key={link.href} onClick={() => scrollToSection(link.href)} className="glass-nav-tile text-start py-2.5 px-3 text-sm font-medium text-foreground">
                {link.label}
              </button>
            ))}
            <div className="flex items-center justify-center py-1 md:hidden">
              <VisitorCounter />
            </div>
            <div className="h-px bg-border my-2" />
            <LanguageSwitcher variant="outline" />
            <Button variant="outline" onClick={() => { navigate("/login"); setMenuOpen(false); }}>{t.common.login}</Button>
            <Button onClick={() => { navigate("/auth/client"); setMenuOpen(false); }} className="font-bold">{dir === "rtl" ? "ابدأ مجاناً" : "Get Started"}</Button>
          </motion.div>
        )}
      </nav>

      {/* ─── Hero Section — Masterpiece ─── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Deep space background */}
        <div className="absolute inset-0 bg-[hsl(220,20%,4%)]">
          {/* Cosmic gradient orbs */}
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, hsl(32 95% 55% / 0.08) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 60% 80% at 80% 80%, hsl(205 78% 56% / 0.05) 0%, transparent 50%)" }} />
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 40% 40% at 20% 20%, hsl(280 60% 50% / 0.04) 0%, transparent 50%)" }} />

          {/* ★ STATIC STAR FIELD — fixed behind the hero card ★ */}
          <div
            className="absolute inset-0 flex items-center justify-center"
          >
            {[...Array(80)].map((_, i) => {
              const angle = (i / 80) * 360;
              const dist = 150 + Math.random() * 400;
              const size = Math.random() * 2.5 + 0.5;
              return (
                <motion.div
                  key={`star-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: size, height: size,
                    top: "50%", left: "50%",
                    transform: `rotate(${angle}deg) translateY(-${dist}px)`,
                    background: i % 5 === 0
                      ? "hsl(40, 90%, 70%)"
                      : i % 3 === 0
                        ? "hsl(205, 80%, 70%)"
                        : "hsl(0, 0%, 90%)",
                    boxShadow: size > 1.5
                      ? `0 0 ${size * 3}px ${size}px hsl(40, 90%, 70%, 0.4)`
                      : "none",
                  }}
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.8, 1.3, 0.8] }}
                  transition={{ duration: Math.random() * 4 + 2, repeat: Infinity, delay: Math.random() * 3 }}
                />
              );
            })}
          </div>

          {/* Static twinkling stars (foreground layer) */}
          {[...Array(40)].map((_, i) => (
            <motion.div
              key={`twinkle-${i}`}
              className="absolute rounded-full bg-foreground"
              style={{
                width: Math.random() * 1.5 + 0.5,
                height: Math.random() * 1.5 + 0.5,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.5, 0.5] }}
              transition={{ duration: Math.random() * 3 + 1.5, repeat: Infinity, delay: Math.random() * 4 }}
            />
          ))}
        </div>

        {/* Neon speed streaks */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div className="absolute bottom-20 h-[2px] w-64 rounded-full" style={{ background: "linear-gradient(90deg, transparent, hsl(32 95% 55% / 0.9), hsl(32 95% 55% / 0.3), transparent)" }} animate={{ x: ["-300px", "120vw"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear", repeatDelay: 2 }} />
          <motion.div className="absolute bottom-32 h-[1px] w-48 bg-gradient-to-r from-transparent via-info/50 to-transparent" animate={{ x: ["120vw", "-300px"] }} transition={{ duration: 4, repeat: Infinity, ease: "linear", repeatDelay: 3 }} />
          <motion.div className="absolute top-40 h-[1px] w-32 bg-gradient-to-r from-transparent via-primary/40 to-transparent" animate={{ x: ["-200px", "120vw"] }} transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 1 }} />
          {/* Extra comet streaks */}
          <motion.div className="absolute top-1/3 h-[1.5px] w-40" style={{ background: "linear-gradient(90deg, transparent, hsl(280 60% 60% / 0.6), transparent)" }} animate={{ x: ["-200px", "120vw"] }} transition={{ duration: 6, repeat: Infinity, ease: "linear", repeatDelay: 4 }} />
          <motion.div className="absolute bottom-1/4 h-[1px] w-56" style={{ background: "linear-gradient(90deg, transparent, hsl(40 90% 60% / 0.7), hsl(32 95% 50% / 0.3), transparent)" }} animate={{ x: ["120vw", "-300px"] }} transition={{ duration: 4.5, repeat: Infinity, ease: "linear", repeatDelay: 2.5 }} />
        </div>

        {/* Promo Flash Banners — Left & Right */}
        <HeroPromoFlash />

        {/* Hero Content */}
        <div className="container mx-auto px-4 relative z-10 pt-16 pb-8">
          {/* ═══ Main Welcome Card — Compact with LED border ═══ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="relative max-w-lg mx-auto"
          >
            <div className="hero-tableau">
              {/* Glass reflection */}
              <div className="absolute inset-0 pointer-events-none" style={{
                background: "linear-gradient(135deg, hsl(0 0% 100% / 0.06) 0%, transparent 30%, transparent 100%)",
              }} />

              <div className="relative z-10 flex flex-col items-center py-6 md:py-8 px-5 md:px-8">
                <motion.div
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: 1, scaleX: 1 }}
                  transition={{ duration: 0.7, delay: 0.25 }}
                  className="mb-6 h-1.5 w-28 rounded-full bg-[hsl(var(--info)/0.82)] shadow-[0_0_22px_hsl(var(--info)/0.48)]"
                />

                {/* "Welcome to" — metallic brushed steel look */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="mb-2"
                >
                  <span
                    className="text-lg md:text-xl font-bold tracking-[0.3em] uppercase"
                    style={{
                      background: "linear-gradient(180deg, hsl(210 10% 75%) 0%, hsl(210 10% 50%) 40%, hsl(210 10% 65%) 60%, hsl(210 10% 45%) 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))",
                      textShadow: "none",
                    }}
                  >
                    {dir === "rtl" ? "مرحباً بك في" : "WELCOME TO"}
                  </span>
                </motion.div>

                {/* "HN DRIVER" — Metal letters that morph: copper → gold → silver → bronze */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
                  className="relative"
                >
                  {/* Metal badge backing */}
                  <div className="relative px-6 md:px-10 py-2 md:py-3 rounded-lg" style={{
                    background: "linear-gradient(180deg, hsl(220 10% 25%) 0%, hsl(220 10% 15%) 40%, hsl(220 10% 18%) 60%, hsl(220 10% 12%) 100%)",
                    boxShadow: "0 4px 12px hsl(0 0% 0% / 0.6), 0 1px 0 hsl(0 0% 100% / 0.1), inset 0 1px 0 hsl(0 0% 100% / 0.12), inset 0 -1px 0 hsl(0 0% 0% / 0.4)",
                    border: "1px solid hsl(220 10% 28%)",
                  }}>
                    <div className="absolute inset-0 rounded-lg pointer-events-none opacity-30" style={{
                      backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 2px, hsl(0 0% 100% / 0.02) 2px, hsl(0 0% 100% / 0.02) 3px)",
                    }} />
                    <motion.h1
                      className="relative text-5xl md:text-7xl lg:text-8xl font-black font-display tracking-wider"
                      animate={{
                        backgroundImage: [
                          // Copper
                          "linear-gradient(170deg, hsl(20,70%,70%) 0%, hsl(15,80%,50%) 25%, hsl(10,70%,40%) 50%, hsl(18,75%,55%) 75%, hsl(20,70%,65%) 100%)",
                          // Gold
                          "linear-gradient(170deg, hsl(45,90%,75%) 0%, hsl(40,95%,60%) 25%, hsl(35,100%,45%) 50%, hsl(40,95%,60%) 75%, hsl(45,90%,70%) 100%)",
                          // Silver / Chrome
                          "linear-gradient(170deg, hsl(210,10%,90%) 0%, hsl(210,10%,70%) 25%, hsl(210,10%,55%) 50%, hsl(210,10%,75%) 75%, hsl(210,10%,85%) 100%)",
                          // Bronze
                          "linear-gradient(170deg, hsl(30,60%,60%) 0%, hsl(25,70%,45%) 25%, hsl(20,65%,35%) 50%, hsl(28,65%,50%) 75%, hsl(30,60%,58%) 100%)",
                          // Copper (loop)
                          "linear-gradient(170deg, hsl(20,70%,70%) 0%, hsl(15,80%,50%) 25%, hsl(10,70%,40%) 50%, hsl(18,75%,55%) 75%, hsl(20,70%,65%) 100%)",
                        ],
                      }}
                      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        backgroundClip: "text",
                        filter: "drop-shadow(0 1px 0 hsl(0 0% 100% / 0.3)) drop-shadow(0 -1px 0 hsl(0 0% 0% / 0.5)) drop-shadow(0 2px 6px hsl(0 0% 0% / 0.4))",
                      }}
                    >
                      HN DRIVER
                    </motion.h1>
                    {/* Shimmer sweep */}
                    <motion.div className="absolute inset-0 rounded-lg pointer-events-none overflow-hidden">
                      <motion.div
                        className="absolute inset-0"
                        style={{ background: "linear-gradient(105deg, transparent 30%, hsl(0 0% 100% / 0.15) 45%, hsl(0 0% 100% / 0.25) 50%, hsl(0 0% 100% / 0.15) 55%, transparent 70%)" }}
                        animate={{ x: ["-100%", "100%"] }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 5 }}
                      />
                    </motion.div>
                  </div>
                </motion.div>

                {/* Subtitle */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1, duration: 0.5 }}
                  className="mt-3 text-sm md:text-base text-[hsl(210,15%,50%)] max-w-md text-center leading-relaxed"
                >
                  {dir === "rtl"
                    ? "منصة النقل والتوصيل والخدمات الأقوى عربياً"
                    : "The most powerful ride, delivery & services platform"}
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  className="mt-6 flex flex-col items-center gap-3"
                >
                  {/* Incentive badge */}
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--warning))]/10 border border-[hsl(var(--warning))]/30 text-sm font-bold text-[hsl(var(--warning))]"
                  >
                    🍽️ {dir === "rtl" ? "تصفّح المطاعم والمتاجر بحرية — بدون تسجيل!" : "Browse restaurants & stores freely — no signup!"}
                  </motion.div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
                    <Button
                      size="lg"
                      onClick={() => navigate("/delivery")}
                      className="min-w-[15rem] px-10 h-14 text-lg font-black animate-pulse hover:animate-none shadow-lg shadow-primary/30"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <Store className={`w-5 h-5 ${dir === "rtl" ? "ml-1" : "mr-1"}`} />
                        {dir === "rtl" ? "🚀 تصفّح الخدمات الآن" : "🚀 Browse Services Now"}
                      </span>
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate("/login")}
                      className="min-w-[13rem] px-8 h-14 text-base group"
                    >
                      <LogIn className={`w-4 h-4 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                      {t.common.login}
                    </Button>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ═══ Role Cards — Glowing glass with inner blue light ═══ */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4 max-w-5xl mx-auto">
            {[
              { img: iconCoupleWelcome, label: dir === "rtl" ? "مرحبا يا سيدي" : "Welcome!", desc: dir === "rtl" ? "خاصك توصيلة ولا تقضية؟" : "Need a ride or delivery?", action: () => navigate("/login"), big: true },
              { img: iconVtcCar, label: dir === "rtl" ? "اعتبرها طوموبيلتك" : "Your personal ride", desc: dir === "rtl" ? "خدم معانا وربح فلوسك" : "Work with us & earn money", action: () => navigate("/auth/driver") },
              { img: iconDeliveryBike, label: "Livraisons Express", desc: dir === "rtl" ? "توصيل سريع وموثوق" : "Fast & reliable delivery", action: () => navigate("/delivery") },
              { img: iconRestaurant, label: dir === "rtl" ? "مطعم" : "Restaurant", desc: dir === "rtl" ? "أجي يا صاحبي افتح المحل ديالك هنا، بغينا نتغداو عندك" : "Open your restaurant here!", action: () => setStoreDialogOpen(true) },
              { img: iconStoreMarketplace, label: dir === "rtl" ? "متجر" : "Store", desc: dir === "rtl" ? "أجي يا صاحبي افتح المحل ديالك هنا" : "Open your shop here!", action: () => setStoreDialogOpen(true) },
            ].map((cat, i) => (
              <motion.div
                key={cat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.3 + i * 0.12, duration: 0.5 }}
                onClick={cat.action}
                whileHover={{ scale: 1.05, y: -6 }}
                whileTap={{ scale: 0.97 }}
                className="group relative rounded-2xl cursor-pointer overflow-hidden signage-3d-box"
              >
                <div className="relative z-10 p-3 flex flex-col items-center gap-1.5 text-center">
                  <img src={cat.img} alt={cat.label} className="w-16 h-16 object-contain drop-shadow-[0_0_14px_hsl(205,80%,55%,0.4)] group-hover:scale-110 transition-transform duration-500" width={512} height={512} loading="lazy" />
                  <h3 className={`font-bold text-foreground group-hover:text-[hsl(var(--info))] transition-colors tracking-wide ${(cat as any).big ? "text-base md:text-lg" : "text-sm md:text-base"}`}>{cat.label}</h3>
                  <p className="text-sm leading-snug font-semibold" style={{ color: "hsl(40, 90%, 55%)" }}>{cat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Store Dialog */}
          <Dialog open={storeDialogOpen} onOpenChange={setStoreDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-center text-xl">
                  {dir === "rtl" ? "المتجر" : "Store"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-4">
                {/* Login to existing store */}
                <button
                  onClick={() => { setStoreDialogOpen(false); navigate("/login"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-accent/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <LogIn className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-start">
                    <p className="font-bold text-foreground">{dir === "rtl" ? "دخول إلى محلي" : "Login to my store"}</p>
                    <p className="text-xs text-muted-foreground">{dir === "rtl" ? "لديك حساب مسجل بالفعل" : "Already have an account"}</p>
                  </div>
                </button>

                {/* Add new store */}
                <button
                  onClick={() => { setStoreDialogOpen(false); navigate("/auth/store_owner"); }}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-info/50 hover:bg-accent/50 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center group-hover:bg-info/20 transition-colors">
                    <PlusCircle className="w-6 h-6 text-info" />
                  </div>
                  <div className="text-start">
                    <p className="font-bold text-foreground">{dir === "rtl" ? "إضافة محلي" : "Add my store"}</p>
                    <p className="text-xs text-muted-foreground">{dir === "rtl" ? "سجّل محلك واختر نوعه" : "Register and choose your store type"}</p>
                  </div>
                </button>

                {/* Store types preview */}
                <div className="pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-3 text-center">{dir === "rtl" ? "أنواع المحلات المدعومة" : "Supported store types"}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { icon: Store, label: dir === "rtl" ? "متجر" : "Shop" },
                      { icon: Coffee, label: dir === "rtl" ? "مقهى" : "Café" },
                      { icon: UtensilsCrossed, label: dir === "rtl" ? "مطعم" : "Restaurant" },
                      { icon: Pill, label: dir === "rtl" ? "صيدلية" : "Pharmacy" },
                      { icon: Croissant, label: dir === "rtl" ? "مخبزة" : "Bakery" },
                      { icon: Printer, label: dir === "rtl" ? "مطبعة" : "Print" },
                      { icon: Shirt, label: dir === "rtl" ? "ملابس" : "Clothing" },
                      { icon: Wrench, label: dir === "rtl" ? "خدمات" : "Services" },
                    ].map((t) => (
                      <div key={t.label} className="flex flex-col items-center gap-1 p-2 rounded-lg bg-muted/30">
                        <t.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{t.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* ═══ Stats — Glowing boxes ═══ */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.6, duration: 0.5 }} className="mt-6 max-w-3xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  whileHover={{ scale: 1.08, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  className="group rounded-xl p-4 text-center cursor-default overflow-hidden relative signage-3d-box"
                >
                  {/* Inner bulb glow — bright pulsing center */}
                  <motion.div 
                    className="absolute inset-0 pointer-events-none"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: i * 0.5 }}
                    style={{
                      background: "radial-gradient(ellipse 90% 80% at 50% 70%, hsl(205 80% 55% / 0.18) 0%, hsl(205 80% 55% / 0.06) 40%, transparent 70%)",
                    }}
                  />
                  {/* Traveling light on border */}
                  <motion.div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
                    <motion.div
                      className="absolute w-12 h-12 rounded-full"
                      style={{ background: "radial-gradient(circle, hsl(205 80% 60% / 0.3) 0%, transparent 70%)", filter: "blur(6px)" }}
                      animate={{
                        top: ["0%", "0%", "100%", "100%", "0%"],
                        left: ["0%", "100%", "100%", "0%", "0%"],
                      }}
                      transition={{ duration: 5 + i, repeat: Infinity, ease: "linear" }}
                    />
                  </motion.div>
                  {/* Glass top reflection */}
                  <div className="absolute top-0 left-[15%] right-[15%] h-[1px] pointer-events-none" style={{
                    background: "linear-gradient(90deg, transparent, hsl(0 0% 100% / 0.2), transparent)",
                  }} />
                  {/* Hover glow boost */}
                  <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{
                    boxShadow: "inset 0 0 45px hsl(205 80% 55% / 0.18), 0 0 40px hsl(205 80% 55% / 0.25)",
                  }} />
                  <stat.icon className="relative z-10 w-4 h-4 text-[hsl(205,80%,65%)] mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
                  <div className="relative z-10 text-xl font-bold bg-gradient-to-r from-[hsl(45,90%,65%)] to-[hsl(35,100%,48%)] bg-clip-text text-transparent font-display">{stat.value}</div>
                  <div className="relative z-10 text-[10px] text-[hsl(210,15%,50%)] mt-0.5">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="flex justify-center mt-8">
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }} className="text-[hsl(210,15%,25%)]">
              <ChevronDown className="w-6 h-6" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Partner Sites ─── */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-info/20 to-transparent" />

        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] border border-primary/30 text-primary bg-primary/5 mb-4">
              {dir === "rtl" ? "شركاؤنا" : "Partners"}
            </span>
            <h2 className="text-2xl md:text-3xl font-bold font-display">
              <span className="text-gradient-primary">{dir === "rtl" ? "مواقعنا الشريكة" : "Our Partner Sites"}</span>
            </h2>
            <div className="w-16 h-1 gradient-primary mx-auto rounded-full mt-4" />
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 max-w-4xl mx-auto">
            {partnerSites.map((site, i) => (
              <motion.a key={site.name} href={site.url} target="_blank" rel="noopener noreferrer" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} whileHover={{ y: -8, scale: 1.03 }} className="group relative flex flex-col items-center gap-4">
                <div className="relative w-full aspect-square rounded-2xl glass-card group-hover:border-primary/50 transition-all duration-500 flex items-center justify-center p-5 overflow-hidden">
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "radial-gradient(circle at 50% 50%, hsl(32 95% 55% / 0.08) 0%, transparent 70%)" }} />
                  <img src={site.logo} alt={site.name} loading="lazy" width={512} height={512} className="relative z-10 w-4/5 h-4/5 object-contain filter brightness-95 group-hover:brightness-110 transition-all duration-500 drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]" />
                </div>
                <div className="text-center">
                  <span className="block text-sm md:text-base font-bold text-foreground group-hover:text-primary transition-colors duration-300">{site.name}</span>
                  <span className="block text-[10px] text-muted-foreground/60 mt-0.5 group-hover:text-muted-foreground transition-colors">{site.url.replace("https://", "").replace("www.", "")}</span>
                </div>
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 group-hover:w-3/4 h-0.5 gradient-primary rounded-full transition-all duration-500" />
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Advanced Features (6-Grid) ─── */}
      <section id="features" className="py-20 md:py-28 relative">
        <div className="absolute inset-0 particles-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] border border-info/30 text-info bg-info/5 mb-4">
              {dir === "rtl" ? "المميزات" : "Features"}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
              <span className="text-gradient-primary">{dir === "rtl" ? "ميزات قوية لإدارة فعالة" : "Powerful Features for Effective Management"}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {dir === "rtl" ? "كل ما تحتاجه لإدارة أسطول السائقين بكفاءة واحترافية" : "Everything you need to manage your driver fleet efficiently and professionally"}
            </p>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {advancedFeatures.map((f, i) => (
              <motion.div key={i} variants={fadeChild} className="group relative rounded-2xl p-8 glass-card hover:border-primary/30 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 rounded-2xl gradient-primary opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500" />
                <div className={`w-14 h-14 rounded-2xl bg-secondary/80 border border-border group-hover:border-primary/30 flex items-center justify-center mb-5 group-hover:scale-110 transition-all duration-300`}>
                  <f.icon className={`w-7 h-7 ${f.color}`} />
                </div>
                <h3 className="text-xl font-bold mb-3 text-foreground group-hover:text-primary transition-colors">{f.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Services ─── */}
      <section id="services" className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.h2 initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-bold text-center font-display mb-4">
            <span className="text-gradient-primary">{lt.servicesTitle}</span>
          </motion.h2>
          <div className="w-20 h-1 gradient-primary mx-auto rounded-full mb-14" />

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {services.map((s, i) => (
              <motion.div key={s.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} className={`group relative rounded-2xl p-8 glass-card hover:border-primary/40 transition-all duration-500 ${s.glow}`}>
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
            {whyFeatures.map((f, i) => (
              <motion.div key={f.title} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} className="text-center p-6 rounded-2xl glass-card hover:border-primary/30 transition-all duration-500 group">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all">
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
              <motion.div key={cat.key} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} onClick={() => navigate(`/delivery/${cat.key}`)} className="group cursor-pointer rounded-2xl p-6 glass-card hover:border-primary/40 transition-all duration-500 text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                  <cat.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-sm md:text-base">{cat.label}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof + Coverage Map ─── */}
      <TangierSocialProof />

      {/* ─── CTA ─── */}
      <section className="py-20 md:py-28 relative overflow-hidden" id="contact">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold font-display mb-6">
              <span className="text-gradient-primary glow-text">{lt.ctaTitle}</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-10">{lt.ctaSubtitle}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/delivery")} className="gradient-primary text-primary-foreground font-bold text-lg rounded-full px-12 py-6 glow-primary animate-pulse-glow">
                {dir === "rtl" ? "تصفّح الخدمات" : "Browse Services"}
                <ArrowRight className={`w-5 h-5 ${dir === "rtl" ? "me-2 rotate-180" : "ms-2"}`} />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/auth/client")} className="rounded-full px-12 py-6 border-border hover:border-primary/40 hover:bg-primary/5">
                <UserPlus className={`w-5 h-5 ${dir === "rtl" ? "ml-2" : "mr-2"}`} />
                {dir === "rtl" ? "إنشاء حساب مجاني" : "Create Free Account"}
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] border border-success/30 text-success bg-success/5 mb-4">
              {dir === "rtl" ? "بسيط وسريع" : "Simple & Fast"}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
              <span className="text-gradient-primary">{dir === "rtl" ? "كيف تبدأ مع HN Driver؟" : "How to Start with HN Driver?"}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {dir === "rtl" ? "4 خطوات بسيطة تفصلك عن بدء رحلتك" : "4 simple steps to begin your journey"}
            </p>
          </motion.div>

          <div className="relative max-w-4xl mx-auto">
            {/* Connection line */}
            <div className="hidden md:block absolute top-24 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/30 via-success/30 to-info/30 rounded-full" />

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {[
                { number: "01", icon: UserPlus, title: dir === "rtl" ? "سجل مجاناً" : "Register Free", desc: dir === "rtl" ? "أنشئ حسابك في أقل من 3 دقائق" : "Create your account in under 3 minutes", details: dir === "rtl" ? ["معلومات شخصية بسيطة", "رخصة قيادة سارية", "بطاقة هوية وطنية"] : ["Basic personal info", "Valid driving license", "National ID card"], color: "text-primary" },
                { number: "02", icon: FileCheck, title: dir === "rtl" ? "تحقق من الوثائق" : "Document Verification", desc: dir === "rtl" ? "نراجع مستنداتك خلال 24 ساعة" : "We review your documents within 24 hours", details: dir === "rtl" ? ["مراجعة سريعة", "تحقق آمن", "موافقة فورية"] : ["Quick review", "Secure verification", "Instant approval"], color: "text-success" },
                { number: "03", icon: Car, title: dir === "rtl" ? "ابدأ القيادة" : "Start Driving", desc: dir === "rtl" ? "استلم طلبك الأول وابدأ الكسب" : "Receive your first order and start earning", details: dir === "rtl" ? ["طلبات فورية", "ملاحة ذكية", "دعم مباشر"] : ["Instant orders", "Smart navigation", "Live support"], color: "text-info" },
                { number: "04", icon: DollarSign, title: dir === "rtl" ? "احصل على أرباحك" : "Get Paid", desc: dir === "rtl" ? "دفع فوري بعد كل طلب" : "Instant payment after every order", details: dir === "rtl" ? ["تحويل لحظي", "بدون رسوم", "سحب متى تشاء"] : ["Instant transfer", "No fees", "Withdraw anytime"], color: "text-[hsl(var(--warning))]" },
              ].map((step, i) => (
                <motion.div key={step.number} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} className="group relative text-center">
                  <div className="relative mx-auto mb-6">
                    <div className={`w-20 h-20 rounded-2xl bg-secondary/80 border border-border group-hover:border-primary/30 flex items-center justify-center mx-auto group-hover:scale-110 transition-all duration-300`}>
                      <step.icon className={`w-9 h-9 ${step.color}`} />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-lg">
                      {step.number}
                    </div>
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-foreground group-hover:text-primary transition-colors">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{step.desc}</p>
                  <ul className="space-y-2">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-success flex-shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA Box */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={5} className="mt-16 max-w-2xl mx-auto text-center">
            <div className="glass rounded-2xl p-8 border border-border">
              <p className="text-lg font-bold text-foreground mb-4">
                {dir === "rtl" ? "جاهز للبدء؟ انضم الآن وابدأ الكسب!" : "Ready to start? Join now and start earning!"}
              </p>
              <button onClick={() => navigate("/auth/driver")} className="gradient-primary text-primary-foreground font-bold rounded-full px-8 py-3 glow-primary hover:opacity-90 transition-opacity">
                {dir === "rtl" ? "إنشاء حساب مجاني →" : "Create Free Account →"}
              </button>
              <p className="text-xs text-muted-foreground mt-3">
                {dir === "rtl" ? "✓ بدون رسوم تسجيل  ✓ بدون التزامات  ✓ إلغاء في أي وقت" : "✓ No registration fees  ✓ No commitments  ✓ Cancel anytime"}
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 particles-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] border border-primary/30 text-primary bg-primary/5 mb-4">
              {dir === "rtl" ? "قصص نجاح" : "Success Stories"}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
              <span className="text-gradient-primary">{dir === "rtl" ? "ماذا يقول سائقونا؟" : "What Our Drivers Say"}</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              {dir === "rtl" ? "آلاف السائقين حققوا أهدافهم المالية معنا" : "Thousands of drivers achieved their financial goals with us"}
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { name: dir === "rtl" ? "أحمد محمد" : "Ahmed Mohamed", role: dir === "rtl" ? "سائق منذ 6 أشهر" : "Driver for 6 months", text: dir === "rtl" ? "أفضل قرار اتخذته! أرباحي تضاعفت 3 مرات مقارنة بعملي السابق. التطبيق سهل والدعم ممتاز." : "Best decision I made! My earnings tripled compared to my previous job. Easy app and excellent support.", earnings: dir === "rtl" ? "12,000 د.م/شهر" : "12,000 MAD/month", trips: "450+" },
              { name: dir === "rtl" ? "خالد العتيبي" : "Khalid Otaibi", role: dir === "rtl" ? "سائق منذ سنة" : "Driver for 1 year", text: dir === "rtl" ? "المرونة في العمل رائعة. أعمل في أوقات فراغي وأحقق دخل إضافي ممتاز. أنصح الجميع بالتجربة." : "The work flexibility is amazing. I work in my free time and earn great extra income. Highly recommended.", earnings: dir === "rtl" ? "8,500 د.م/شهر" : "8,500 MAD/month", trips: "1200+" },
              { name: dir === "rtl" ? "سعد الدوسري" : "Saad Dosari", role: dir === "rtl" ? "سائق منذ 3 أشهر" : "Driver for 3 months", text: dir === "rtl" ? "الدفع الفوري ميزة رائعة. لا أنتظر نهاية الشهر للحصول على أرباحي. التطبيق احترافي جداً." : "Instant payment is a great feature. No waiting until month-end. Very professional app.", earnings: dir === "rtl" ? "9,800 د.م/شهر" : "9,800 MAD/month", trips: "280+" },
            ].map((t, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i + 1} className="group relative rounded-2xl p-8 glass-card hover:border-primary/30 transition-all duration-500 overflow-hidden">
                <div className="absolute inset-0 rounded-2xl gradient-primary opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500" />
                <Quote className="w-8 h-8 text-primary/30 mb-4" />
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => <Star key={j} className="w-4 h-4 fill-primary text-primary" />)}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 italic">"{t.text}"</p>
                <div className="grid grid-cols-2 gap-3 mb-6 p-3 rounded-xl bg-secondary/50 border border-border/50">
                  <div className="text-center">
                    <div className="text-sm font-bold text-primary">{t.earnings}</div>
                    <div className="text-[10px] text-muted-foreground">{dir === "rtl" ? "الأرباح الشهرية" : "Monthly Earnings"}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-bold text-success">{t.trips}</div>
                    <div className="text-[10px] text-muted-foreground">{dir === "rtl" ? "إجمالي الرحلات" : "Total Trips"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{t.name}</h4>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Stats strip */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={4} className="mt-14 max-w-4xl mx-auto">
            <div className="glass rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { val: "10,000+", label: dir === "rtl" ? "سائق نشط" : "Active Drivers" },
                { val: "4.9/5", label: dir === "rtl" ? "تقييم السائقين" : "Driver Rating" },
                { val: "50K+", label: dir === "rtl" ? "طلب يومياً" : "Daily Orders" },
                { val: "98%", label: dir === "rtl" ? "رضا العملاء" : "Customer Satisfaction" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-2xl font-bold text-gradient-primary font-display">{s.val}</div>
                  <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-20 md:py-28 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/10 to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.2em] border border-info/30 text-info bg-info/5 mb-4">
              <HelpCircle className="w-3.5 h-3.5 inline-block mr-1 -mt-0.5" />
              {dir === "rtl" ? "أسئلة شائعة" : "FAQ"}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
              <span className="text-gradient-primary">{dir === "rtl" ? "الأسئلة الأكثر شيوعاً" : "Frequently Asked Questions"}</span>
            </h2>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {[
              { q: dir === "rtl" ? "كم يمكنني أن أكسب مع HN Driver؟" : "How much can I earn with HN Driver?", a: dir === "rtl" ? "الأرباح تعتمد على عدد الساعات والطلبات. متوسط الأرباح يتراوح بين 5,000 إلى 15,000 د.م شهرياً للسائقين النشطين. كلما زاد عدد الطلبات، زادت أرباحك." : "Earnings depend on hours and orders. Active drivers earn between 5,000-15,000 MAD monthly on average. More orders mean more earnings." },
              { q: dir === "rtl" ? "ما هي المتطلبات للانضمام؟" : "What are the requirements to join?", a: dir === "rtl" ? "تحتاج إلى رخصة قيادة سارية، بطاقة هوية وطنية، هاتف ذكي، وسيارة بحالة جيدة. عملية التسجيل تستغرق أقل من 5 دقائق." : "You need a valid driving license, national ID, smartphone, and a car in good condition. Registration takes less than 5 minutes." },
              { q: dir === "rtl" ? "كيف يتم الدفع؟" : "How does payment work?", a: dir === "rtl" ? "نوفر دفع فوري بعد كل طلب. يمكنك سحب أرباحك في أي وقت عبر التحويل البنكي أو المحفظة الإلكترونية بدون أي رسوم." : "We offer instant payment after every order. You can withdraw earnings anytime via bank transfer or e-wallet with zero fees." },
              { q: dir === "rtl" ? "هل يوجد تأمين أثناء العمل؟" : "Is there insurance while working?", a: dir === "rtl" ? "نعم، نوفر تأمين شامل يغطي السائق والمركبة أثناء تنفيذ الطلبات. سلامتك هي أولويتنا." : "Yes, we provide comprehensive insurance covering the driver and vehicle during active orders. Your safety is our priority." },
              { q: dir === "rtl" ? "هل يمكنني العمل بدوام جزئي؟" : "Can I work part-time?", a: dir === "rtl" ? "بالتأكيد! أنت حر في اختيار أوقات عملك. لا يوجد حد أدنى لساعات العمل. اعمل متى تشاء وتوقف متى تريد." : "Absolutely! You're free to choose your work hours. No minimum hours required. Work when you want, stop when you want." },
              { q: dir === "rtl" ? "كيف أتواصل مع الدعم الفني؟" : "How do I contact support?", a: dir === "rtl" ? "دعمنا متاح 24/7 عبر التطبيق مباشرة، الاتصال الهاتفي، أو الدردشة المباشرة. فريقنا جاهز لمساعدتك في أي وقت." : "Our support is available 24/7 via the app, phone call, or live chat. Our team is ready to help anytime." },
            ].map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} index={i} />
            ))}
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={7} className="text-center mt-12">
            <p className="text-muted-foreground mb-4">
              {dir === "rtl" ? "لم تجد إجابتك؟ تواصل معنا مباشرة" : "Didn't find your answer? Contact us directly"}
            </p>
            <button onClick={() => navigate("/welcome")} className="inline-flex items-center gap-2 gradient-primary text-primary-foreground font-bold rounded-full px-8 py-3 glow-primary hover:opacity-90 transition-opacity">
              <MessageSquare className="w-4 h-4" />
              {dir === "rtl" ? "تواصل مع الدعم" : "Contact Support"}
            </button>
          </motion.div>
        </div>
      </section>

      {/* ─── Projects on Lovable ─── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-card/20 to-background" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={0} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">
              <span className="text-gradient-primary glow-text">مشاريعنا على Lovable</span>
            </h2>
            <p className="text-muted-foreground text-lg">مجموعة من المشاريع المبتكرة التي طورتها شركة HN للبرمجيات</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[
              { name: "HN Driver", desc: "منصة النقل والتوصيل الذكية", img: projHnDriver, url: "https://smooth-route-guide.lovable.app", status: "published" },
              { name: "Souk-HN Express", desc: "سوق إلكتروني متكامل للتجارة", img: projSoukHn, url: "https://lovable.dev", status: "published" },
              { name: "HN Print GR", desc: "منصة الطباعة والتصميم الاحترافي", img: projHnPrint, url: "https://lovable.dev", status: "published" },
              { name: "Grand Tanger Print Studio", desc: "استوديو طباعة احترافي بطنجة", img: projGtStudio, url: "https://lovable.dev", status: "active" },
              { name: "AI Scene Studio", desc: "استوديو ذكاء اصطناعي للمشاهد", img: projAiScene, url: "https://lovable.dev", status: "active" },
              { name: "AI Studio Vision", desc: "رؤية ذكية بتقنية AI", img: projAiVision, url: "https://lovable.dev", status: "active" },
              { name: "Cloud Harmony", desc: "خدمات سحابية متناغمة", img: projCloud, url: "https://lovable.dev", status: "active" },
              { name: "Ai Video HN", desc: "إنتاج فيديو بالذكاء الاصطناعي", img: projAiVideo, url: "https://hn-aivideo.lovable.app/", status: "active" },
              { name: "Livraison Express", desc: "خدمة التوصيل السريع الاحترافية", img: projLivraisonExpress, url: "https://lovable.dev", status: "published" },
            ].map((project, i) => (
              <motion.a key={project.name} href={project.url} target="_blank" rel="noopener noreferrer" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} className="group relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm p-6 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 block">
                <div className="w-16 h-16 rounded-xl overflow-hidden mb-4 group-hover:scale-110 transition-transform shadow-lg">
                  <img src={project.img} alt={project.name} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{project.name}</h3>
                <p className="text-sm text-muted-foreground mb-3">{project.desc}</p>
                {project.status === "published" && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                    <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                    منشور
                  </span>
                )}
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Ads Section ─── */}
      <AdsSection />

      {/* ─── Signup Conversion Components ─── */}
      <SignupPopup />
      <SignupBanner />
    </div>
  );
}
