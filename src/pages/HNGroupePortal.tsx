/**
 * HN Groupe — Glass Future Portal
 * بوابة زجاجية مستقبلية تعرض جميع مشاريع HN Groupe بأسلوب فريد عالمياً.
 * - خلفية شبكية ثلاثية الأبعاد + جزيئات متحركة + شعاع فأرة (mouse spotlight)
 * - بطاقات Glassmorphism مع إمالة 3D عند التحويم
 * - بحث ذكي + فلاتر فئات + فرز (الأعلى تقييماً / الأحدث / الأكثر استخداماً)
 * - إحصائيات حية ومميزة
 * - تذييل مستقبلي
 */
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Crown, Search, LayoutGrid, Brain, Film, Truck, Store, Building2,
  ArrowUpRight, Star, Users, Sparkles, Zap, TrendingUp, Activity, Globe2,
} from "lucide-react";
import { HN_PROJECTS, type ProjectCard, type ProjectCategory } from "@/data/hnGroupeProjects";

type SortKey = "rating" | "users" | "year" | "name";

const CATEGORIES: { id: "all" | ProjectCategory; label: string; icon: typeof LayoutGrid }[] = [
  { id: "all", label: "الكل", icon: LayoutGrid },
  { id: "transport", label: "النقل", icon: Truck },
  { id: "commerce", label: "التجارة", icon: Store },
  { id: "ai", label: "الذكاء الاصطناعي", icon: Brain },
  { id: "media", label: "الإعلام", icon: Film },
  { id: "services", label: "الخدمات", icon: Building2 },
];

const SORTS: { id: SortKey; label: string }[] = [
  { id: "rating", label: "الأعلى تقييماً" },
  { id: "users", label: "الأكثر استخداماً" },
  { id: "year", label: "الأحدث" },
  { id: "name", label: "الاسم" },
];

const usersToNum = (u: string) => parseInt(u.replace(/[^0-9]/g, ""), 10) || 0;

// ─── Tilted glass card ───
const TiltCard = ({ project }: { project: ProjectCard }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-50, 50], [8, -8]), { stiffness: 150, damping: 15 });
  const rotateY = useSpring(useTransform(x, [-50, 50], [-8, 8]), { stiffness: 150, damping: 15 });
  const glareX = useTransform(x, [-50, 50], ["0%", "100%"]);
  const glareY = useTransform(y, [-50, 50], ["0%", "100%"]);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set(e.clientX - r.left - r.width / 2);
    y.set(e.clientY - r.top - r.height / 2);
  };
  const onLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.a
      ref={ref}
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformPerspective: 1200, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.02 }}
      className="group relative block rounded-3xl overflow-hidden cursor-pointer"
    >
      {/* Glass shell */}
      <div className="relative rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-2xl overflow-hidden h-full">
        {/* Inner gradient tint */}
        <div
          className="absolute inset-0 opacity-30 group-hover:opacity-60 transition-opacity duration-700"
          style={{
            background: `radial-gradient(circle at 30% 0%, ${project.accent}40, transparent 60%)`,
          }}
        />
        {/* Noise/grain */}
        <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

        {/* Specular glare following cursor */}
        <motion.div
          aria-hidden
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glareX} ${glareY}, rgba(255,255,255,0.18), transparent 40%)`,
          }}
        />

        {/* Top bar — status + featured */}
        <div className="relative flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
            </span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/80">
              {project.status === "live" ? "LIVE" : "SOON"}
            </span>
          </div>
          {project.featured && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/30">
              <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
              <span className="text-[10px] font-bold text-amber-300">مميز</span>
            </div>
          )}
        </div>

        {/* Icon — floating with depth */}
        <div className="relative px-5 pt-4" style={{ transform: "translateZ(40px)" }}>
          <div className="relative inline-block">
            <div
              className="absolute inset-0 blur-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-500"
              style={{ background: `radial-gradient(circle, ${project.accent}, transparent 70%)` }}
            />
            <div
              className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br ${project.gradient} flex items-center justify-center shadow-2xl ${project.glow} ring-1 ring-white/20`}
            >
              <project.icon className="w-8 h-8 text-white drop-shadow-lg" />
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="relative p-5 pt-4 space-y-3" style={{ transform: "translateZ(20px)" }}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="font-black text-white text-lg leading-tight truncate">{project.nameAr}</h3>
              <p className="text-[10px] text-white/40 font-mono tracking-wider mt-0.5 truncate">{project.name}</p>
            </div>
            <ArrowUpRight className="w-5 h-5 text-white/40 group-hover:text-white group-hover:rotate-45 transition-all duration-500 flex-shrink-0" />
          </div>

          <p className="text-sm text-white/60 leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {project.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5">
            {project.tags.slice(0, 3).map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/60">
                {t}
              </span>
            ))}
          </div>

          {/* Stats row */}
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-white">{project.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1 text-white/50">
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs font-mono">{project.users}</span>
            </div>
            <span className="text-xs font-mono text-white/40">{project.year}</span>
          </div>
        </div>

        {/* Bottom accent line */}
        <div
          className="absolute bottom-0 left-0 right-0 h-[2px] origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-700"
          style={{ background: `linear-gradient(90deg, transparent, ${project.accent}, transparent)` }}
        />
      </div>
    </motion.a>
  );
};

const HNGroupePortal = () => {
  const [activeCategory, setActiveCategory] = useState<"all" | ProjectCategory>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("rating");

  // Mouse spotlight tracking
  const [mouse, setMouse] = useState({ x: 50, y: 30 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMouse({ x: (e.clientX / window.innerWidth) * 100, y: (e.clientY / window.innerHeight) * 100 });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return HN_PROJECTS
      .filter((p) => activeCategory === "all" || p.category === activeCategory)
      .filter((p) =>
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.nameAr.includes(q) ||
        p.description.includes(q) ||
        p.tags.some((t) => t.includes(q))
      )
      .sort((a, b) => {
        switch (sortKey) {
          case "rating": return b.rating - a.rating;
          case "users": return usersToNum(b.users) - usersToNum(a.users);
          case "year": return b.year - a.year;
          case "name": return a.nameAr.localeCompare(b.nameAr, "ar");
        }
      });
  }, [activeCategory, search, sortKey]);

  const stats = useMemo(() => {
    const totalUsers = HN_PROJECTS.reduce((sum, p) => sum + usersToNum(p.users), 0);
    const avgRating = (HN_PROJECTS.reduce((s, p) => s + p.rating, 0) / HN_PROJECTS.length).toFixed(1);
    return [
      { label: "مشروع نشط", value: HN_PROJECTS.filter((p) => p.status === "live").length, icon: Activity, accent: "#10b981" },
      { label: "مستخدم عالمي", value: `${totalUsers}K+`, icon: Globe2, accent: "#06b6d4" },
      { label: "متوسط التقييم", value: avgRating, icon: Star, accent: "#f59e0b" },
      { label: "حلول AI", value: HN_PROJECTS.filter((p) => p.category === "ai").length, icon: Brain, accent: "#8b5cf6" },
    ];
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden text-white" dir="rtl"
      style={{ background: "radial-gradient(ellipse at top, #0c0a1f 0%, #050414 50%, #000000 100%)" }}
    >
      {/* ───────────────── BACKGROUND LAYERS ───────────────── */}

      {/* 1. Mouse spotlight */}
      <div
        className="fixed inset-0 pointer-events-none transition-[background] duration-300 ease-out"
        style={{
          background: `radial-gradient(600px circle at ${mouse.x}% ${mouse.y}%, rgba(251,191,36,0.06), transparent 50%)`,
        }}
      />

      {/* 2. Animated orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 120, 0], y: [0, 60, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[10%] left-[15%] w-[600px] h-[600px] rounded-full blur-[160px]"
          style={{ background: "radial-gradient(circle, rgba(251,191,36,0.15), transparent 70%)" }}
        />
        <motion.div
          animate={{ x: [0, -100, 0], y: [0, 80, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[5%] right-[10%] w-[700px] h-[700px] rounded-full blur-[180px]"
          style={{ background: "radial-gradient(circle, rgba(139,92,246,0.18), transparent 70%)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[200px]"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08), transparent 70%)" }}
        />
      </div>

      {/* 3. Grid pattern with mask */}
      <div
        className="fixed inset-0 pointer-events-none opacity-50"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 40%, transparent 100%)",
        }}
      />

      {/* 4. Floating particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-white/40"
            style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 100}%` }}
            animate={{ y: [0, -40, 0], opacity: [0, 0.8, 0] }}
            transition={{ duration: 6 + (i % 5), repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ───────────────── CONTENT ───────────────── */}
      <div className="relative z-10">
        {/* HERO */}
        <header className="pt-20 pb-14 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.8, type: "spring" }}
              className="inline-flex items-center justify-center mb-7"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-300 to-amber-600 blur-3xl opacity-70 animate-pulse" />
                <div className="relative w-24 h-24 rounded-[28px] bg-gradient-to-br from-amber-200 via-amber-400 to-amber-700 flex items-center justify-center shadow-2xl shadow-amber-500/60 ring-2 ring-amber-200/40">
                  <Crown className="w-12 h-12 text-white drop-shadow-2xl" />
                </div>
                <Sparkles className="absolute -top-2 -right-2 w-5 h-5 text-amber-200 animate-pulse" />
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-6xl md:text-8xl font-black tracking-tight"
            >
              <span className="text-white">HN</span>{" "}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(251,191,36,0.3)]">
                Groupe
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="mt-3 flex items-center justify-center gap-3"
            >
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-amber-400/60" />
              <span className="text-xs font-mono text-amber-300/80 tracking-[0.3em] uppercase">
                Future · Glass · Ecosystem
              </span>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-amber-400/60" />
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mt-7 text-lg md:text-xl text-white/60 max-w-2xl mx-auto leading-relaxed"
            >
              منظومة زجاجية مستقبلية تجمع كل مشاريعك تحت سقف واحد — مصممة بهوس، مبنية للعالم.
            </motion.p>

            {/* Stats — glass cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto"
            >
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="relative group rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-4 overflow-hidden hover:border-white/20 transition-colors"
                >
                  <div
                    className="absolute inset-0 opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{ background: `radial-gradient(circle at 50% 0%, ${s.accent}, transparent 70%)` }}
                  />
                  <div className="relative flex flex-col items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center ring-1 ring-white/10"
                      style={{ background: `${s.accent}20` }}
                    >
                      <s.icon className="w-5 h-5" style={{ color: s.accent }} />
                    </div>
                    <div className="text-2xl font-black text-white leading-none">{s.value}</div>
                    <div className="text-[10px] text-white/50 uppercase tracking-wider">{s.label}</div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </header>

        {/* CONTROLS */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.85 }}
          className="max-w-6xl mx-auto px-4 mb-10 space-y-5"
        >
          {/* Search */}
          <div className="relative max-w-2xl mx-auto group">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-cyan-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
            <div className="relative">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في 14+ مشروع..."
                className="w-full h-14 pr-14 pl-5 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-xl text-white placeholder:text-white/30 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all"
              />
            </div>
          </div>

          {/* Categories + Sort */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {CATEGORIES.map((c) => {
              const active = activeCategory === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setActiveCategory(c.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                    active
                      ? "bg-gradient-to-r from-amber-400 to-amber-600 text-black shadow-lg shadow-amber-500/30 scale-105"
                      : "bg-white/[0.03] border border-white/10 backdrop-blur-xl text-white/60 hover:text-white hover:border-white/20"
                  }`}
                >
                  <c.icon className="w-4 h-4" />
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>

          {/* Sort + count */}
          <div className="flex flex-wrap items-center justify-between gap-3 max-w-5xl mx-auto px-2">
            <div className="flex items-center gap-2 text-xs text-white/50">
              <TrendingUp className="w-4 h-4" />
              <span>{filtered.length} مشروع</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">فرز:</span>
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSortKey(s.id)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-all ${
                    sortKey === s.id
                      ? "bg-white/10 text-white border border-white/20"
                      : "text-white/40 hover:text-white/70"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* GRID */}
        <motion.div
          key={activeCategory + search + sortKey}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="max-w-7xl mx-auto px-4 pb-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filtered.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5 }}
            >
              <TiltCard project={p} />
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20">
              <div className="inline-flex w-20 h-20 rounded-full bg-white/5 border border-white/10 items-center justify-center mb-4">
                <Search className="w-8 h-8 text-white/40" />
              </div>
              <p className="text-white/50">لا توجد مشاريع مطابقة</p>
            </div>
          )}
        </motion.div>

        {/* FOOTER */}
        <footer className="relative border-t border-white/5 backdrop-blur-2xl bg-black/40">
          <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/40 ring-1 ring-amber-200/30">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <div className="font-black text-white">HN Groupe</div>
                <div className="text-[10px] text-white/40 font-mono tracking-wider">© 2026 · مولاي اسماعيل الحسني</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <a
                href="/"
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-amber-400/40 hover:bg-white/10 transition-all text-sm text-white"
              >
                <Store className="w-4 h-4 text-amber-400" />
                <span>المنصة الرئيسية</span>
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HNGroupePortal;
