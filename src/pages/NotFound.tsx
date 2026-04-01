/**
 * Smart 404 Page with Auto-Correction
 * Analyzes the attempted URL and:
 * 1. Auto-redirects if a close match is found (>80% confidence)
 * 2. Suggests similar routes for moderate matches
 * 3. Shows helpful navigation for no matches
 */
import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { findBestRoute, type RouteSuggestion } from "@/lib/errorRecovery";
import { Home, ArrowRight, Search, RefreshCw } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [autoRedirecting, setAutoRedirecting] = useState(false);

  const suggestion = useMemo(() => findBestRoute(location.pathname), [location.pathname]);

  useEffect(() => {
    console.warn("[404 Recovery] Path:", location.pathname, "| Best match:", suggestion?.path, "| Confidence:", suggestion?.confidence?.toFixed(2));
  }, [location.pathname, suggestion]);

  // Auto-redirect for high confidence matches
  useEffect(() => {
    if (!suggestion || suggestion.confidence < 0.8) return;
    if (suggestion.path === location.pathname) return;

    setAutoRedirecting(true);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate(suggestion.path, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [suggestion, navigate, location.pathname]);

  const quickLinks = [
    { label: "الرئيسية", path: "/", icon: "🏠" },
    { label: "العملاء", path: "/customer", icon: "👤" },
    { label: "السائقين", path: "/driver", icon: "🚗" },
    { label: "التوصيل", path: "/delivery", icon: "📦" },
    { label: "لوحة التحكم", path: "/admin", icon: "⚙️" },
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4" dir="rtl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg text-center"
      >
        {/* 404 Badge */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 border-2 border-primary/20"
        >
          <span className="text-4xl font-bold text-primary">404</span>
        </motion.div>

        <h1 className="text-2xl font-bold text-foreground mb-2">الصفحة غير موجودة</h1>
        <p className="text-sm text-muted-foreground mb-1">
          المسار: <code className="px-2 py-0.5 rounded bg-secondary text-xs font-mono">{location.pathname}</code>
        </p>

        {/* Auto-redirect notice */}
        {autoRedirecting && suggestion && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20"
          >
            <div className="flex items-center justify-center gap-2 text-sm text-primary mb-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="font-medium">تم العثور على تطابق!</span>
            </div>
            <p className="text-sm text-foreground">
              جاري التوجيه إلى{" "}
              <code className="px-2 py-0.5 rounded bg-secondary text-xs font-mono">{suggestion.path}</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">خلال {countdown} ثانية...</p>
            <button
              onClick={() => navigate(suggestion.path, { replace: true })}
              className="mt-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
            >
              انتقل الآن
            </button>
          </motion.div>
        )}

        {/* Suggestion (moderate confidence) */}
        {!autoRedirecting && suggestion && suggestion.confidence >= 0.4 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-3 rounded-xl bg-secondary/50 border border-border/50"
          >
            <p className="text-sm text-muted-foreground mb-2">
              <Search className="h-3.5 w-3.5 inline ml-1" />
              هل تقصد:
            </p>
            <button
              onClick={() => navigate(suggestion.path, { replace: true })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
            >
              <ArrowRight className="h-4 w-4" />
              {suggestion.path}
            </button>
          </motion.div>
        )}

        {/* Quick links */}
        <div className="mt-6">
          <p className="text-xs text-muted-foreground mb-3">انتقل سريعاً إلى:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {quickLinks.map(link => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm text-foreground transition"
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Home button */}
        <button
          onClick={() => navigate("/")}
          className="mt-6 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition"
        >
          <Home className="h-4 w-4" />
          العودة للرئيسية
        </button>
      </motion.div>
    </div>
  );
};

export default NotFound;
