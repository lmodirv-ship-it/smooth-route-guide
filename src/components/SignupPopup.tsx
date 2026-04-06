import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Gift, UserPlus, Star, Truck, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const POPUP_DISMISSED_KEY = "hn_signup_popup_dismissed";
const POPUP_DELAY_MS = 4000; // Show after 4 seconds

const SignupPopup = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed recently (24h)
    const dismissed = localStorage.getItem(POPUP_DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < 24 * 60 * 60 * 1000) return;
    }

    // Don't show if user is logged in
    const checkAndShow = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return;

      const timer = setTimeout(() => setShow(true), POPUP_DELAY_MS);
      return () => clearTimeout(timer);
    };

    const cleanup = checkAndShow();
    return () => { cleanup?.then(fn => fn?.()); };
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(POPUP_DISMISSED_KEY, Date.now().toString());
  };

  const goSignup = (role: string) => {
    dismiss();
    navigate(`/auth/${role}`);
  };

  const benefits = [
    { icon: Gift, text: "رصيد ترحيبي 50 درهم مجاناً", color: "text-[hsl(var(--warning))]" },
    { icon: Truck, text: "توصيل سريع لباب منزلك", color: "text-success" },
    { icon: Star, text: "عروض وخصومات حصرية", color: "text-primary" },
    { icon: ShoppingBag, text: "تسوّق من مئات المتاجر", color: "text-info" },
  ];

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={dismiss}
          />
          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed inset-x-4 top-[50%] -translate-y-1/2 z-[101] max-w-md mx-auto rounded-3xl border border-primary/20 bg-background/95 backdrop-blur-xl shadow-2xl shadow-primary/10 overflow-hidden"
          >
            {/* Glow top */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-[hsl(var(--warning))] to-primary" />

            {/* Close */}
            <button
              onClick={dismiss}
              className="absolute top-3 left-3 z-10 p-1.5 rounded-full bg-muted/50 hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>

            <div className="p-6 pt-8 text-center" dir="rtl">
              {/* Icon */}
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center"
              >
                <Gift className="w-8 h-8 text-primary" />
              </motion.div>

              <h2 className="text-xl font-bold text-foreground mb-1">
                🎉 سجّل الآن واحصل على 50 درهم!
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                انضم لأكثر من 1000 مستخدم يستفيدون من خدماتنا يومياً
              </p>

              {/* Benefits */}
              <div className="space-y-2.5 mb-6 text-right">
                {benefits.map((b, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30"
                  >
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0">
                      <b.icon className={`w-4 h-4 ${b.color}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground">{b.text}</span>
                  </motion.div>
                ))}
              </div>

              {/* CTA Buttons */}
              <div className="space-y-2.5">
                <Button
                  onClick={() => goSignup("client")}
                  className="w-full h-12 text-base font-bold"
                >
                  <UserPlus className="w-5 h-5 ml-2" />
                  إنشاء حساب مجاني
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { dismiss(); navigate("/login"); }}
                  className="w-full h-11"
                >
                  لدي حساب بالفعل — تسجيل الدخول
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground mt-3">
                بدون التزام • تسجيل في ثوانٍ
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SignupPopup;
