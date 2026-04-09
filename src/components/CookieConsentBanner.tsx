import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const CONSENT_KEY = "hn_cookie_consent";

const CookieConsentBanner = () => {
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
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4 animate-in slide-in-from-bottom-5 duration-300">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-center gap-4" dir="rtl">
        <div className="flex-1 text-sm text-foreground leading-relaxed">
          <span className="font-bold">🍪 سياسة الكوكيز</span>
          <span className="mx-1">—</span>
          نستخدم ملفات تعريف الارتباط لتحسين تجربتك وتحليل استخدام الموقع.
          يمكنك قراءة{" "}
          <a href="/privacy" className="underline text-primary hover:text-primary/80">
            سياسة الخصوصية
          </a>{" "}
          لمزيد من التفاصيل.
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            size="sm"
            className="rounded-xl"
            onClick={() => updateConsent(true)}
          >
            قبول الكل
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl"
            onClick={() => updateConsent(false)}
          >
            رفض غير الضروري
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsentBanner;
