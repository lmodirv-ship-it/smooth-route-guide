import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, ArrowLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useFreePeriod } from "@/hooks/useFreePeriod";

const DISMISSED_KEY = "hn_sticky_cta_dismissed";

const StickyCTABar = () => {
  const navigate = useNavigate();
  const { isActive: isFree } = useFreePeriod();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem(DISMISSED_KEY);
    if (d && Date.now() - parseInt(d, 10) < 6 * 60 * 60 * 1000) {
      setDismissed(true);
      return;
    }

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return;

      const onScroll = () => {
        if (window.scrollY > 400) setShow(true);
        else setShow(false);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    };
    check();
  }, []);

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, Date.now().toString());
  };

  if (dismissed) return null;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed bottom-0 inset-x-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <div className="max-w-lg mx-auto rounded-2xl border border-primary/40 bg-background/95 backdrop-blur-xl shadow-2xl shadow-primary/20 overflow-hidden">
            {/* Top glow line */}
            <div className="h-0.5 bg-gradient-to-r from-primary via-[hsl(var(--warning))] to-primary" />
            <div className="p-3 flex items-center gap-3" dir="rtl">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"
              >
                <Gift className="w-5 h-5 text-primary" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {isFree ? "🎉 الخدمات مجانية — سجّل الآن!" : "🎁 سجّل واحصل على 50 درهم مجاناً"}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {isFree ? "عرض محدود — لا تفوّت الفرصة" : "بدون التزام • تسجيل في ثوانٍ"}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { dismiss(); navigate("/auth/client"); }}
                className="shrink-0 flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold shadow-lg shadow-primary/30"
              >
                سجّل الآن
                <ArrowLeft className="w-3.5 h-3.5" />
              </motion.button>
              <button onClick={dismiss} className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StickyCTABar;
