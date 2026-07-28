import { Link } from "react-router-dom";
import {
  Bike,
  Car,
  ChevronDown,
  ChevronLeft,
  Globe,
  Headphones,
  LogIn,
  ShieldCheck,
  Smartphone,
  Store,
  UserPlus,
  Users,
} from "lucide-react";
import PageMeta from "@/components/PageMeta";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useI18n } from "@/i18n/context";
import heroBg from "@/assets/landing-hero-bg.jpg";
import phoneMockup from "@/assets/hn-driver-logo-v2.jpeg";
import hnLogo from "@/assets/hn-driver-logo.png";
import cardCar from "@/assets/card-car.png";
import cardCustomer from "@/assets/card-customer.png";
import cardDelivery from "@/assets/card-delivery.png";
import cardStore from "@/assets/card-store.png";

type LandingContent = {
  meta: { title: string; description: string; keywords: string };
  topLinks: { contact: string; features: string; pricing: string; services: string; whyHn: string };
  actions: { login: string; signup: string };
  trust: { safeTitle: string; safeSub: string; supportSub: string };
  hero: { title1: string; title2: string; subtitle: string };
  cards: { driver: [string, string]; client: [string, string]; delivery: [string, string]; store: [string, string] };
  paths: {
    clientTitle: string;
    clientDesc: string;
    clientCta: string;
    partnerTitle: string;
    partnerDesc: string;
    partnerCta: string;
  };
  registerNow: string;
  downloadApk: string;
  adminApksLabel: string;
  adminApks: { general: string; admin: string; callcenter: string };
  stats: { active: string; drivers: string; delivery: string; stores: string };
  download: { title: string; sub: string };
};


const content: Record<string, LandingContent> = {
  ar: {
    meta: {
      title: "HN Driver — كل خدمات التوصيل في مكان واحد",
      description: "سجّل الآن واختر نوع الحساب: سائق، زبون، عامل توصيل، أو صاحب متجر.",
      keywords: "HN Driver, توصيل, سائق, زبون, متجر, مطعم",
    },
    topLinks: { contact: "تواصل معنا", features: "مزايا التطبيق", pricing: "الأسعار", services: "الخدمات", whyHn: "لماذا HN Driver" },
    actions: { login: "تسجيل الدخول", signup: "إنشاء حساب" },
    trust: { safeTitle: "آمن وموثوق", safeSub: "حماية بياناتك", supportSub: "دعم فني دائم" },
    hero: { title1: "كل خدمات التوصيل", title2: "في مكان واحد", subtitle: "سجّل الآن واختر نوع الحساب وابدأ العمل معنا" },
    cards: {
      driver: ["تسجيل سائق", "انضم كسائق واكسب المال مع مرونة في أوقات العمل"],
      client: ["تسجيل زبون", "اطلب رحلتك وطلباتك بسهولة وأمان"],
      delivery: ["تسجيل عامل توصيل", "ابدأ التوصيل وحقق دخلاً إضافياً بوقت يناسبك"],
      store: ["تسجيل مطعم أو متجر", "وسّع عملك واستقبل الطلبات من آلاف العملاء"],
    },
    registerNow: "سجّل الآن",
    downloadApk: "تحميل APK",
    adminApksLabel: "تطبيقات إدارية:",
    adminApks: { general: "تطبيق عام", admin: "أدمن", callcenter: "مركز الاتصال" },
    stats: { active: "مستخدم نشط", drivers: "سائق", delivery: "عامل توصيل", stores: "مطعم و متجر" },
    download: { title: "حمّل التطبيق هنا", sub: "متوفر لأندرويد — APK مباشر" },
  },
  fr: {
    meta: {
      title: "HN Driver — Tous les services de livraison en un seul endroit",
      description: "Inscrivez-vous et choisissez votre compte : chauffeur, client, livreur ou commerçant.",
      keywords: "HN Driver, livraison, chauffeur, client, magasin, restaurant",
    },
    topLinks: { contact: "Contactez-nous", features: "Fonctionnalités", pricing: "Tarifs", services: "Services", whyHn: "Pourquoi HN Driver" },
    actions: { login: "Connexion", signup: "Créer un compte" },
    trust: { safeTitle: "Sûr et fiable", safeSub: "Vos données protégées", supportSub: "Support permanent" },
    hero: { title1: "Tous les services de livraison", title2: "en un seul endroit", subtitle: "Inscrivez-vous, choisissez votre compte et commencez avec nous" },
    cards: {
      driver: ["Inscription chauffeur", "Rejoignez-nous et gagnez de l'argent avec des horaires flexibles"],
      client: ["Inscription client", "Commandez vos trajets et livraisons en toute simplicité"],
      delivery: ["Inscription livreur", "Démarrez la livraison et gagnez un revenu supplémentaire"],
      store: ["Inscription restaurant/magasin", "Développez votre business et recevez des milliers de commandes"],
    },
    registerNow: "S'inscrire",
    downloadApk: "Télécharger APK",
    adminApksLabel: "Applications administratives :",
    adminApks: { general: "Application générale", admin: "Admin", callcenter: "Centre d'appels" },
    stats: { active: "utilisateurs actifs", drivers: "chauffeurs", delivery: "livreurs", stores: "restaurants & magasins" },
    download: { title: "Téléchargez l'application", sub: "Disponible sur Android — APK direct" },
  },
  en: {
    meta: {
      title: "HN Driver — All delivery services in one place",
      description: "Sign up and choose your account: driver, customer, delivery worker, or store owner.",
      keywords: "HN Driver, delivery, driver, customer, store, restaurant",
    },
    topLinks: { contact: "Contact us", features: "Features", pricing: "Pricing", services: "Services", whyHn: "Why HN Driver" },
    actions: { login: "Sign in", signup: "Create account" },
    trust: { safeTitle: "Safe & trusted", safeSub: "Your data protected", supportSub: "Always-on support" },
    hero: { title1: "All delivery services", title2: "in one place", subtitle: "Sign up, choose your account and start working with us" },
    cards: {
      driver: ["Driver sign up", "Join as a driver and earn money with flexible hours"],
      client: ["Customer sign up", "Order your rides and deliveries easily and safely"],
      delivery: ["Delivery sign up", "Start delivering and earn extra income on your schedule"],
      store: ["Restaurant/store sign up", "Grow your business and receive thousands of orders"],
    },
    registerNow: "Sign up now",
    downloadApk: "Download APK",
    adminApksLabel: "Admin apps:",
    adminApks: { general: "General app", admin: "Admin", callcenter: "Call center" },
    stats: { active: "active users", drivers: "drivers", delivery: "delivery workers", stores: "restaurants & stores" },
    download: { title: "Download the app", sub: "Available on Android — direct APK" },
  },
  es: {
    meta: {
      title: "HN Driver — Todos los servicios de entrega en un solo lugar",
      description: "Regístrate y elige tu cuenta: conductor, cliente, repartidor o comerciante.",
      keywords: "HN Driver, entrega, conductor, cliente, tienda, restaurante",
    },
    topLinks: { contact: "Contáctanos", features: "Características", pricing: "Precios", services: "Servicios", whyHn: "Por qué HN Driver" },
    actions: { login: "Iniciar sesión", signup: "Crear cuenta" },
    trust: { safeTitle: "Seguro y confiable", safeSub: "Tus datos protegidos", supportSub: "Soporte permanente" },
    hero: { title1: "Todos los servicios de entrega", title2: "en un solo lugar", subtitle: "Regístrate, elige tu cuenta y empieza con nosotros" },
    cards: {
      driver: ["Registro de conductor", "Únete como conductor y gana dinero con horarios flexibles"],
      client: ["Registro de cliente", "Pide tus viajes y entregas de forma fácil y segura"],
      delivery: ["Registro de repartidor", "Empieza a repartir y gana ingresos extra a tu ritmo"],
      store: ["Registro de restaurante/tienda", "Haz crecer tu negocio y recibe miles de pedidos"],
    },
    registerNow: "Regístrate",
    downloadApk: "Descargar APK",
    adminApksLabel: "Aplicaciones administrativas:",
    adminApks: { general: "App general", admin: "Admin", callcenter: "Centro de llamadas" },
    stats: { active: "usuarios activos", drivers: "conductores", delivery: "repartidores", stores: "restaurantes y tiendas" },
    download: { title: "Descarga la app", sub: "Disponible en Android — APK directo" },
  },
};

const LandingPage = () => {
  const { locale, setLocale, locales, dir } = useI18n();
  const currentLocale = locales.find((item) => item.code === locale) ?? locales[0];
  const c = content[locale] ?? content.ar;

  const cards = [
    { to: "/auth/driver", title: c.cards.driver[0], text: c.cards.driver[1], image: cardCar, variant: "blue", apk: "/downloads/apps/hn-driver.apk" },
    { to: "/auth/client", title: c.cards.client[0], text: c.cards.client[1], image: cardCustomer, variant: "green", apk: "/downloads/apps/hn-client.apk" },
    { to: "/auth/delivery", title: c.cards.delivery[0], text: c.cards.delivery[1], image: cardDelivery, variant: "purple", apk: "/downloads/apps/hn-delivery.apk" },
    { to: "/auth/store_owner", title: c.cards.store[0], text: c.cards.store[1], image: cardStore, variant: "gold", apk: "/downloads/apps/hn-store.apk" },
  ];

  const adminApks = [
    { href: "/downloads/apps/hn-general.apk", label: c.adminApks.general },
    { href: "/downloads/apps/hn-admin.apk", label: c.adminApks.admin },
    { href: "/downloads/apps/hn-callcenter.apk", label: c.adminApks.callcenter },
  ];

  const stats = [
    { Icon: Users, value: "+10,000", label: c.stats.active, variant: "blue" },
    { Icon: Car, value: "+2,500", label: c.stats.drivers, variant: "green" },
    { Icon: Bike, value: "+5,000", label: c.stats.delivery, variant: "purple" },
    { Icon: Store, value: "+1,200", label: c.stats.stores, variant: "gold" },
  ];

  const topLinks = [
    { to: "/contact", label: c.topLinks.contact },
    { to: "/features", label: c.topLinks.features },
    { to: "/pricing", label: c.topLinks.pricing },
    { to: "/services", label: c.topLinks.services },
    { to: "/why-hn", label: c.topLinks.whyHn },
  ];

  return (
    <div className="min-h-screen gradient-dark" dir={dir}>
      <PageMeta title={c.meta.title} description={c.meta.description} keywords={c.meta.keywords} />

      <section className="hn-reference-hero relative h-[100svh] overflow-hidden">
        <div className="hn-reference-bg" style={{ backgroundImage: `url(${heroBg})` }} aria-hidden />
        <div className="hn-reference-overlay" aria-hidden />

        <header className="hn-topbar">
          <Link to="/" className="hn-brand" aria-label="HN Driver">
            <img src={hnLogo} alt="HN Driver" className="hn-logo-img" />
            <div className="hn-brand-text">
              <strong>HN DRIVER</strong>
              <span>SMART DELIVERY</span>
            </div>
          </Link>

          <nav className="hn-nav" aria-label={c.topLinks.services}>
            {topLinks.map((item) => (
              <Link key={item.to} to={item.to}>{item.label}</Link>
            ))}
          </nav>

          <div className="hn-top-actions">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hn-chip hidden sm:inline-flex" type="button">
                  <Globe className="h-4 w-4" />
                  {currentLocale?.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100]">
                {locales.map((item) => (
                  <DropdownMenuItem
                    key={item.code}
                    onClick={() => setLocale(item.code)}
                    className={locale === item.code ? "bg-accent/20 font-semibold" : ""}
                  >
                    <span className="mr-2">{item.flag}</span>
                    {item.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/login" className="hn-chip hidden md:inline-flex">
              <LogIn className="h-4 w-4" />
              {c.actions.login}
            </Link>
            <Link to="/auth/client" className="hn-create-account">
              <UserPlus className="h-4 w-4" />
              {c.actions.signup}
            </Link>
          </div>
        </header>

        <div className="hn-trust-badge hn-trust-right">
          <ShieldCheck className="hn-trust-icon hn-trust-icon-gold" />
          <div>
            <strong>{c.trust.safeTitle}</strong>
            <span>{c.trust.safeSub}</span>
          </div>
        </div>
        <div className="hn-trust-badge hn-trust-left">
          <Headphones className="hn-trust-icon hn-trust-icon-blue" />
          <div>
            <strong>24/7</strong>
            <span>{c.trust.supportSub}</span>
          </div>
        </div>

        <main className="hn-hero-content" aria-labelledby="home-title">
          <div className="hn-title-block">
            <h1 id="home-title">
              {c.hero.title1}
              <span>{c.hero.title2}</span>
            </h1>
            <p>{c.hero.subtitle}</p>
          </div>

          <div className="hn-register-grid">
            {cards.map(({ to, title, text, image, variant, apk }) => (
              <div key={to} className="flex flex-col">
                <Link to={to} className={`hn-register-card hn-card-${variant}`}>
                  <img src={image} alt={title} className="hn-card-image" loading="lazy" width={512} height={512} />
                  <h2>{title}</h2>
                  <p>{text}</p>
                  <span>
                    <ChevronLeft className="h-3 w-3" />
                    {c.registerNow}
                  </span>
                </Link>
                <a href={apk} download className="hn-apk-btn" aria-label={`${c.downloadApk} — ${title}`}>
                  ⬇ {c.downloadApk}
                </a>
              </div>
            ))}
          </div>

          <div className="hn-admin-apks" role="group" aria-label={c.adminApksLabel}>
            <strong>{c.adminApksLabel}</strong>
            {adminApks.map(({ href, label }) => (
              <a key={href} href={href} download>⬇ {label}</a>
            ))}
          </div>
        </main>

        <section className="hn-stats-dock" aria-label="HN Driver">
          <div className="hn-stats-list">
            {stats.map(({ Icon, value, label, variant }) => (
              <div key={label} className={`hn-stat hn-stat-${variant}`}>
                <Icon className="hn-stat-icon" strokeWidth={1.55} />
                <div>
                  <strong>{value}</strong>
                  <span>{label}</span>
                </div>
              </div>
            ))}
          </div>

          <a href="/downloads/apps/hn-general.apk" className="hn-download-block" download>
            <Smartphone className="hn-phone-icon" />
            <div>
              <strong>{c.download.title}</strong>
              <span>{c.download.sub}</span>
            </div>
            <img src={phoneMockup} alt="HN Driver" loading="eager" />
          </a>
        </section>

      </section>
    </div>
  );
};

export default LandingPage;
