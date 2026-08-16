import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n/context";

const CONSENT_KEY = "hn_cookie_consent";

const CookieConsentBanner = () => {
  const { t, dir } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const updateConsent = (granted: boolean) => {
    const status = granted ? "granted" : "denied";
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("consent", "update", {
        analytics_storage: status,
        ad_storage: status,
        ad_user_data: status,
        ad_personalization: status,
      });
    }
    localStorage.setItem(CONSENT_KEY, granted ? "accepted" : "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[9999] p-2 sm:p-4 animate-in slide-in-from-bottom-5 duration-300"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5rem)" }}
    >
      <div
        className="max-w-2xl mx-auto bg-card border border-border rounded-xl sm:rounded-2xl shadow-2xl p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4"
        dir={dir}
      >
        <div className="flex-1 text-xs sm:text-sm text-foreground leading-snug sm:leading-relaxed">
          <span className="font-bold">🍪 {t.cookies.title}</span>
          <span className="mx-1">—</span>
          {t.cookies.message}{" "}
          <a href="/privacy" className="underline text-primary hover:text-primary/80">
            {t.cookies.privacyLink}
          </a>
        </div>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <Button
            size="sm"
            className="rounded-lg flex-1 sm:flex-none h-9 text-xs sm:text-sm"
            onClick={() => updateConsent(true)}
          >
            {t.cookies.acceptAll}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-lg flex-1 sm:flex-none h-9 text-xs sm:text-sm"
            onClick={() => updateConsent(false)}
          >
            {t.cookies.rejectOptional}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
