/**
 * HN Groupe — Unified Portal Page
 * Showcases all HN Groupe projects/services with direct links.
 */
import { motion } from "framer-motion";
import {
  Car, Truck, Printer, Globe, Film, Brain, Store, Headphones,
  ExternalLink, Crown, Sparkles,
} from "lucide-react";
import { type LucideIcon } from "lucide-react";

interface ProjectCard {
  name: string;
  nameAr: string;
  description: string;
  icon: LucideIcon;
  url: string;
  color: string;
  status: "live" | "coming";
}

const PROJECTS: ProjectCard[] = [
  {
    name: "Souk-HN Express",
    nameAr: "سوق HN إكسبريس",
    description: "منصة النقل والتوصيل والخدمات",
    icon: Truck,
    url: "https://smooth-route-guide.lovable.app",
    color: "from-amber-500 to-orange-600",
    status: "live",
  },
  {
    name: "Car Wash Manager",
    nameAr: "مدير مغسلة السيارات",
    description: "نظام إدارة مغاسل السيارات",
    icon: Car,
    url: "https://auto-shine-master.lovable.app",
    color: "from-blue-500 to-cyan-600",
    status: "live",
  },
  {
    name: "Grand Tanger Print Studio",
    nameAr: "مطبعة طنجة الكبرى",
    description: "خدمات الطباعة والتصميم",
    icon: Printer,
    url: "https://tangier-print-hub.lovable.app",
    color: "from-purple-500 to-pink-600",
    status: "live",
  },
  {
    name: "Agency Hub Pro",
    nameAr: "وكالة الخدمات المتكاملة",
    description: "إدارة الوكالات والخدمات",
    icon: Globe,
    url: "https://agency-hub-pro.lovable.app",
    color: "from-emerald-500 to-teal-600",
    status: "live",
  },
  {
    name: "AI Scene Studio",
    nameAr: "استوديو المشاهد الذكي",
    description: "إنتاج فيديوهات بالذكاء الاصطناعي",
    icon: Film,
    url: "https://hn-aivideo.lovable.app",
    color: "from-violet-500 to-indigo-600",
    status: "live",
  },
  {
    name: "AI Studio Vision",
    nameAr: "استوديو الرؤية الذكية",
    description: "معالجة الصور والفيديو بالذكاء الاصطناعي",
    icon: Brain,
    url: "https://hn-videoai.lovable.app",
    color: "from-rose-500 to-red-600",
    status: "live",
  },
  {
    name: "HN Cima",
    nameAr: "HN سيما",
    description: "منصة المحتوى المرئي",
    icon: Film,
    url: "https://hn-vi.lovable.app",
    color: "from-yellow-500 to-amber-600",
    status: "live",
  },
  {
    name: "Studio HN",
    nameAr: "استوديو HN",
    description: "منصة الإبداع الرقمي",
    icon: Sparkles,
    url: "https://studio-hn.lovable.app",
    color: "from-sky-500 to-blue-600",
    status: "live",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 20 } },
};

const HNGroupePortal = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden" dir="rtl">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 pt-12 pb-8 text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-3 mb-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Crown className="w-8 h-8 text-white" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-4xl md:text-5xl font-black text-foreground tracking-tight"
        >
          HN <span className="bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">Groupe</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 text-muted-foreground text-lg max-w-md mx-auto"
        >
          مجموعة HN للبرمجيات — جميع المشاريع في مكان واحد
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-1 text-xs text-muted-foreground/60"
        >
          © 2026 HN GROUPE — مولاي اسماعيل الحسني
        </motion.p>
      </header>

      {/* Projects Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-6xl mx-auto px-4 pb-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
      >
        {PROJECTS.map((project) => (
          <motion.a
            key={project.name}
            variants={item}
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative rounded-2xl border border-border/50 bg-card/80 backdrop-blur-sm p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
          >
            {/* Status badge */}
            {project.status === "coming" && (
              <span className="absolute top-3 left-3 text-[10px] font-bold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                قريباً
              </span>
            )}

            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${project.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
              <project.icon className="w-6 h-6 text-white" />
            </div>

            {/* Text */}
            <h3 className="font-bold text-foreground text-sm mb-0.5">{project.nameAr}</h3>
            <p className="text-xs text-muted-foreground/70 font-mono mb-2">{project.name}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{project.description}</p>

            {/* Arrow */}
            <div className="absolute bottom-4 left-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <ExternalLink className="w-4 h-4 text-primary" />
            </div>
          </motion.a>
        ))}
      </motion.div>

      {/* Back to main */}
      <div className="text-center pb-12">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Store className="w-4 h-4" />
          العودة إلى المنصة الرئيسية
        </a>
      </div>
    </div>
  );
};

export default HNGroupePortal;
