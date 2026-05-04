import { motion } from "framer-motion";
import { Download, Smartphone, Shield, Zap, Star } from "lucide-react";
import { trackEvent } from "@/components/TrackingScripts";

const APK_URL = "/downloads/hn-driver.apk";
const APK_SIZE_MB = 81;

const ApkDownloadHero = () => {
  const handleDownload = () => {
    try {
      trackEvent("apk_download_click", { source: "landing_hero", file: "hn-driver.apk" });
    } catch {}
  };

  return (
    <motion.section
      id="apk-download"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative my-6 overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-info/10 p-6 shadow-2xl shadow-primary/20 backdrop-blur"
      dir="rtl"
    >
      {/* Glow effects */}
      <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-info/20 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        {/* Left: Text + CTA */}
        <div className="flex-1 text-right">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-[11px] font-bold tracking-wider text-primary">
            <Star className="h-3.5 w-3.5 fill-primary" />
            <span>إصدار جديد متاح الآن</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-extrabold text-foreground leading-tight">
            حمّل تطبيق <span className="text-gradient-primary">HN Driver</span> الآن
          </h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl">
            تطبيق واحد لكل خدماتك: طلب سيارة، توصيل، متاجر ومطاعم. سريع، آمن، ويعمل بسلاسة على جميع هواتف Android.
          </p>

          {/* Features */}
          <div className="mt-4 flex flex-wrap gap-3 justify-end md:justify-end">
            <div className="flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground border border-border">
              <Zap className="h-3.5 w-3.5 text-primary" />
              أداء فائق
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground border border-border">
              <Shield className="h-3.5 w-3.5 text-success" />
              آمن 100%
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1.5 text-xs font-medium text-foreground border border-border">
              <Smartphone className="h-3.5 w-3.5 text-info" />
              Android 7+
            </div>
          </div>

          {/* CTA */}
          <div className="mt-5 flex flex-col sm:flex-row gap-3 sm:items-center justify-end">
            <motion.a
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              href={APK_URL}
              download="hn-driver.apk"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-primary to-primary/80 px-6 py-4 text-base font-bold text-primary-foreground shadow-lg shadow-primary/40 transition-all hover:shadow-primary/60"
            >
              <Download className="h-5 w-5" />
              تحميل APK مجاناً
              <span className="rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-bold">
                {APK_SIZE_MB} MB
              </span>
            </motion.a>
            <p className="text-[11px] text-muted-foreground text-center sm:text-right">
              ✓ بدون تسجيل  ·  ✓ تثبيت مباشر  ·  ✓ تحديثات تلقائية
            </p>
          </div>
        </div>

        {/* Right: Phone mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85, rotate: -6 }}
          whileInView={{ opacity: 1, scale: 1, rotate: -6 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, type: "spring", stiffness: 120 }}
          className="hidden md:flex shrink-0"
        >
          <div className="relative">
            <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-primary/40 to-info/30 blur-2xl" />
            <div className="relative rounded-[2.5rem] border-4 border-foreground/20 bg-gradient-to-br from-card to-background p-3 shadow-2xl">
              <div className="flex h-48 w-28 flex-col items-center justify-center gap-2 rounded-[2rem] bg-gradient-to-br from-primary/20 to-info/20">
                <Smartphone className="h-10 w-10 text-primary" />
                <p className="text-[10px] font-bold text-foreground">HN Driver</p>
                <div className="h-1 w-12 rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.section>
  );
};

export default ApkDownloadHero;
