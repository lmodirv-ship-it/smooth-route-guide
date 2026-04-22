import { motion } from "framer-motion";
import { Gift, Sparkles, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * High-conversion launch promo banner:
 *  • First ride free for new customers
 *  • 20 DH credit per successful referral
 * Designed for landing page placement above the fold.
 */
const LaunchPromoBanner = () => {
  const navigate = useNavigate();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="relative mx-auto max-w-6xl px-4 py-6"
    >
      <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-background to-info/10 p-6 md:p-8 shadow-2xl">
        {/* Glow accents */}
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-info/20 blur-3xl" />

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 text-right" dir="rtl">
          <div className="flex items-start gap-4 flex-1">
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-info flex items-center justify-center shadow-lg flex-shrink-0"
            >
              <Gift className="w-7 h-7 text-primary-foreground" />
            </motion.div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  عرض الإطلاق الحصري
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-foreground leading-tight">
                أول رحلة <span className="text-primary">مجانية</span> + اكسب{" "}
                <span className="text-info">20 درهم</span> مع كل صديق يسجل
              </h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                ابدأ الآن واحصل على 50 درهم رصيد ترحيبي + رحلة مجانية. كل صديق
                يسجل عبر رابطك = 20 درهم لك و20 درهم له.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-gradient-to-r from-primary to-info hover:opacity-90 text-primary-foreground font-bold gap-2 shadow-lg"
            >
              ابدأ مجاناً
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/invite")}
              className="border-primary/40 hover:bg-primary/10 font-bold"
            >
              برنامج الإحالة
            </Button>
          </div>
        </div>
      </div>
    </motion.section>
  );
};

export default LaunchPromoBanner;
