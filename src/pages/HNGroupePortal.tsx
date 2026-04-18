/**
 * HN Groupe — Premium Unified Portal
 * Luxury showcase of all HN Groupe projects with stunning visuals.
 */
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Car, Truck, Printer, Globe, Film, Brain, Store, Crown, Sparkles,
  ArrowUpRight, Search, LayoutGrid, Rocket, Zap, Building2,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface ProjectCard {
  name: string;
  nameAr: string;
  description: string;
  icon: LucideIcon;
  url: string;
  gradient: string;
  glow: string;
  category: "transport" | "commerce" | "ai" | "media" | "services";
  status: "live" | "coming";
  featured?: boolean;
}

const PROJECTS: ProjectCard[] = [
  {
    name: "Souk-HN Express",
    nameAr: "سوق HN إكسبريس",
    description: "منصة النقل والتوصيل الرائدة — رحلات، طلبات، وخدمات لوجستية متكاملة",
    icon: Truck,
    url: "https://www.hn-driver.online",
    gradient: "from-amber-400 via-orange-500 to-red-500",
    glow: "shadow-amber-500/40",
    category: "transport",
    status: "live",
    featured: true,
  },
  {
    name: "HN-STOCK",
    nameAr: "HN ستوك",
    description: "نظام إدارة المخزون والمستودعات بأحدث التقنيات",
    icon: Store,
    url: "https://www.hn-driver.site",
    gradient: "from-emerald-400 via-green-500 to-teal-600",
    glow: "shadow-emerald-500/40",
    category: "commerce",
    status: "live",
    featured: true,
  },
  {
    name: "Car Wash Manager",
    nameAr: "مدير مغسلة السيارات",
    description: "نظام احترافي لإدارة مغاسل السيارات والخدمات",
    icon: Car,
    url: "https://auto-shine-master.lovable.app",
    gradient: "from-blue-400 via-cyan-500 to-sky-600",
    glow: "shadow-cyan-500/40",
    category: "services",
    status: "live",
  },
  {
    name: "Grand Tanger Print Studio",
    nameAr: "مطبعة طنجة الكبرى",
    description: "خدمات الطباعة والتصميم الاحترافي بجودة عالية",
    icon: Printer,
    url: "https://tangier-print-hub.lovable.app",
    gradient: "from-purple-400 via-pink-500 to-rose-600",
    glow: "shadow-pink-500/40",
    category: "services",
    status: "live",
  },
  {
    name: "Agency Hub Pro",
    nameAr: "وكالة الخدمات المتكاملة",
    description: "إدارة الوكالات والخدمات المتكاملة بكفاءة",
    icon: Globe,
    url: "https://agency-hub-pro.lovable.app",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600",
    glow: "shadow-teal-500/40",
    category: "services",
    status: "live",
  },
  {
    name: "AI Scene Studio",
    nameAr: "استوديو المشاهد الذكي",
    description: "إنتاج فيديوهات سينمائية بالذكاء الاصطناعي",
    icon: Film,
    url: "https://hn-aivideo.lovable.app",
    gradient: "from-violet-400 via-indigo-500 to-purple-600",
    glow: "shadow-violet-500/40",
    category: "ai",
    status: "live",
    featured: true,
  },
  {
    name: "AI Studio Vision",
    nameAr: "استوديو الرؤية الذكية",
    description: "معالجة الصور والفيديو بقدرات الذكاء الاصطناعي",
    icon: Brain,
    url: "https://hn-videoai.lovable.app",
    gradient: "from-rose-400 via-red-500 to-pink-600",
    glow: "shadow-rose-500/40",
    category: "ai",
    status: "live",
  },
  {
    name: "HN Cima",
    nameAr: "HN سيما",
    description: "منصة المحتوى المرئي والترفيه الرقمي",
    icon: Film,
    url: "https://hn-vi.lovable.app",
    gradient: "from-yellow-400 via-amber-500 to-orange-600",
    glow: "shadow-yellow-500/40",
    category: "media",
    status: "live",
  },
  {
    name: "Studio HN",
    nameAr: "استوديو HN",
    description: "منصة الإبداع الرقمي والتصميم المتقدم",
    icon: Sparkles,
    url: "https://studio-hn.lovable.app",
    gradient: "from-sky-400 via-blue-500 to-indigo-600",
    glow: "shadow-sky-500/40",
    category: "media",
    status: "live",
  },
];

const CATEGORIES = [
  { id: "all", label: "الكل", icon: LayoutGrid },
  { id: "transport", label: "النقل", icon: Truck },
  { id: "commerce", label: "التجارة", icon: Store },
  { id: "ai", label: "الذكاء الاصطناعي", icon: Brain },
  { id: "media", label: "الإعلام", icon: Film },
  { id: "services", label: "الخدمات", icon: Building2 },
] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 40, scale: 0.92 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring" as const, damping: 22, stiffness: 100 } },
};

const HNGroupePortal = () => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = PROJECTS.filter((p) => {
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    const q = search.trim().toLowerCase();
    const matchesSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      p.nameAr.includes(q) ||
      p.description.includes(q);
    return matchesCategory && matchesSearch;
  });

  const stats = [
    { label: "مشروع نشط", value: PROJECTS.filter(p => p.status === "live").length, icon: Rocket },
    { label: "قطاع", value: 5, icon: Building2 },
    { label: "حلول ذكية", value: PROJECTS.filter(p => p.category === "ai").length, icon: Brain },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" dir="rtl">
      {/* ─── Animated background orbs ─── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-0 left-1/4 w-[700px] h-[700px] bg-amber-500/10 rounded-full blur-[140px]"
        />
        <motion.div
          animate={{ x: [0, -80, 0], y: [0, 80, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[100px]"
        />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.1)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.1)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      {/* ─── Hero Header ─── */}
      <header className="relative z-10 pt-16 pb-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          {/* Crown badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="inline-flex items-center justify-center mb-6"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-amber-600 blur-2xl opacity-60 animate-pulse" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 flex items-center justify-center shadow-2xl shadow-amber-500/50 ring-2 ring-amber-300/30">
                <Crown className="w-10 h-10 text-white drop-shadow-lg" />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="text-5xl md:text-7xl font-black tracking-tight">
              <span className="text-foreground">HN</span>{" "}
              <span className="bg-gradient-to-r from-amber-300 via-amber-500 to-amber-700 bg-clip-text text-transparent">
                Groupe
              </span>
            </h1>
            <div className="mt-2 flex items-center justify-center gap-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-500/50" />
              <span className="text-xs font-mono text-amber-500/80 tracking-widest uppercase">Premium Ecosystem</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-500/50" />
            </div>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            منظومة متكاملة من الحلول الرقمية المبتكرة — كل مشاريعك تحت سقف واحد
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-3 md:gap-4"
          >
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="group flex items-center gap-3 px-5 py-3 rounded-2xl bg-card/40 backdrop-blur-xl border border-border/50 hover:border-amber-500/30 hover:bg-card/60 transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center">
                  <stat.icon className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-right">
                  <div className="text-2xl font-black text-foreground leading-none">{stat.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </header>

      {/* ─── Search + Filters ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="relative z-10 max-w-6xl mx-auto px-4 mb-10"
      >
        {/* Search bar */}
        <div className="relative max-w-xl mx-auto mb-6">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في المشاريع..."
            className="w-full h-14 pr-12 pl-4 rounded-2xl bg-card/60 backdrop-blur-xl border border-border/50 focus:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 text-foreground placeholder:text-muted-foreground transition-all"
          />
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`group flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30"
                    : "bg-card/40 backdrop-blur-md border border-border/50 text-muted-foreground hover:text-foreground hover:border-amber-500/30"
                }`}
              >
                <cat.icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ─── Projects Grid ─── */}
      <motion.div
        key={activeCategory + search}
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-7xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
      >
        {filtered.map((project) => (
          <motion.a
            key={project.name}
            variants={item}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ y: -8 }}
            className="group relative rounded-3xl overflow-hidden bg-card/60 backdrop-blur-xl border border-border/50 hover:border-transparent transition-all duration-500"
          >
            {/* Gradient border on hover */}
            <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${project.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} style={{ padding: "1px" }}>
              <div className="w-full h-full rounded-3xl bg-card" />
            </div>

            {/* Content wrapper */}
            <div className="relative p-6">
              {/* Featured badge */}
              {project.featured && (
                <div className="absolute top-4 left-4 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 backdrop-blur-sm">
                  <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                  <span className="text-[10px] font-bold text-amber-500">مميز</span>
                </div>
              )}

              {/* Icon with glow */}
              <div className="relative mb-5 inline-block">
                <div className={`absolute inset-0 bg-gradient-to-br ${project.gradient} blur-2xl opacity-40 group-hover:opacity-70 transition-opacity duration-500`} />
                <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${project.gradient} flex items-center justify-center shadow-xl ${project.glow} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <project.icon className="w-8 h-8 text-white drop-shadow-lg" />
                </div>
              </div>

              {/* Text */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-black text-foreground text-lg leading-tight group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:bg-clip-text group-hover:from-amber-400 group-hover:to-amber-600 transition-all">
                    {project.nameAr}
                  </h3>
                  <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-amber-500 group-hover:translate-x-[-4px] group-hover:translate-y-[-4px] transition-all flex-shrink-0" />
                </div>
                <p className="text-[11px] text-muted-foreground/60 font-mono tracking-wide">{project.name}</p>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 pt-1">
                  {project.description}
                </p>
              </div>

              {/* Bottom accent line */}
              <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${project.gradient} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-right`} />
            </div>
          </motion.a>
        ))}

        {/* Empty state */}
        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full text-center py-16"
          >
            <div className="inline-flex w-20 h-20 rounded-full bg-card/40 border border-border/50 items-center justify-center mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">لا توجد مشاريع مطابقة لبحثك</p>
          </motion.div>
        )}
      </motion.div>

      {/* ─── Footer ─── */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="relative z-10 border-t border-border/30 backdrop-blur-xl bg-background/40"
      >
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div className="text-right">
              <div className="font-bold text-foreground text-sm">HN Groupe</div>
              <div className="text-[10px] text-muted-foreground">© 2026 — مولاي اسماعيل الحسني</div>
            </div>
          </div>

          <a
            href="/"
            className="group flex items-center gap-2 px-5 py-2.5 rounded-full bg-card/60 border border-border/50 hover:border-amber-500/40 hover:bg-card transition-all text-sm text-foreground"
          >
            <Store className="w-4 h-4 text-amber-500" />
            <span>العودة إلى المنصة الرئيسية</span>
          </a>
        </div>
      </motion.footer>
    </div>
  );
};

export default HNGroupePortal;
