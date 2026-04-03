import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const BANNER_DISMISSED_KEY = "hn_signup_banner_dismissed";

const SignupBanner = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(BANNER_DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 12 * 60 * 60 * 1000) return;
    }

    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) setShow(true);
    };
    check();
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(BANNER_DISMISSED_KEY, Date.now().toString());
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25 }}
          className="fixed bottom-0 inset-x-0 z-50 p-3 safe-mobile-bottom"
        >
          <div className="max-w-lg mx-auto rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-xl shadow-2xl shadow-primary/20 p-4 flex items-center gap-3" dir="rtl">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">
                🎁 سجّل واحصل على 50 درهم مجاناً!
              </p>
              <p className="text-xs text-muted-foreground truncate">
                رحلات • توصيل • تسوّق — كل شيء في تطبيق واحد
              </p>
            </div>
            <button
              onClick={() => { dismiss(); navigate("/auth/client"); }}
              className="shrink-0 flex items-center gap-1 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-opacity"
            >
              ابدأ
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={dismiss} className="shrink-0 p-1 rounded-full hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SignupBanner;
