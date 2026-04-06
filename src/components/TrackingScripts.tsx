import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrackingConfig {
  facebookPixelId?: string;
  googleAdsId?: string;
  googleAnalyticsId?: string;
}

const TrackingScripts = () => {
  const [config, setConfig] = useState<TrackingConfig>({});

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "branding_settings").maybeSingle()
      .then(({ data }) => {
        if (data?.value) {
          const v = data.value as Record<string, unknown>;
          setConfig({
            facebookPixelId: String(v.facebookPixelId || ""),
            googleAdsId: String(v.googleAdsId || ""),
            googleAnalyticsId: String(v.googleAnalyticsId || ""),
          });
        }
      });
  }, []);

  useEffect(() => {
    // Facebook Pixel
    if (config.facebookPixelId) {
      const script = document.createElement("script");
      script.innerHTML = `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init','${config.facebookPixelId}');fbq('track','PageView');
      `;
      document.head.appendChild(script);

      // noscript fallback in body
      const noscript = document.createElement("noscript");
      const img = document.createElement("img");
      img.height = 1; img.width = 1; img.style.display = "none";
      img.src = `https://www.facebook.com/tr?id=${config.facebookPixelId}&ev=PageView&noscript=1`;
      noscript.appendChild(img);
      document.body.appendChild(noscript);
    }

    // Google Ads / Analytics (gtag.js)
    const gtagId = config.googleAdsId || config.googleAnalyticsId;
    if (gtagId) {
      const gtagScript = document.createElement("script");
      gtagScript.async = true;
      gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${gtagId}`;
      document.head.appendChild(gtagScript);

      const gtagInit = document.createElement("script");
      gtagInit.innerHTML = `
        window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
        gtag('js',new Date());
        ${config.googleAdsId ? `gtag('config','${config.googleAdsId}');` : ""}
        ${config.googleAnalyticsId ? `gtag('config','${config.googleAnalyticsId}');` : ""}
      `;
      document.head.appendChild(gtagInit);
    }
  }, [config]);

  return null;
};

export default TrackingScripts;

// Helper to track conversions from anywhere
export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  // Facebook
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", eventName, params);
  }
  // Google
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", eventName, params);
  }
};
