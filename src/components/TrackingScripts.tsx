import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrackingConfig {
  facebookPixelId?: string;
  googleAdsId?: string;
  googleAnalyticsId?: string;
  tiktokPixelId?: string;
  snapPixelId?: string;
  linkedinPartnerId?: string;
  twitterPixelId?: string;
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
            tiktokPixelId: String(v.tiktokPixelId || ""),
            snapPixelId: String(v.snapPixelId || ""),
            linkedinPartnerId: String(v.linkedinPartnerId || ""),
            twitterPixelId: String(v.twitterPixelId || ""),
          });
        }
      });
  }, []);

  useEffect(() => {
    // Capture UTM parameters from URL on first load and persist
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"].forEach(k => {
      const v = params.get(k);
      if (v) utm[k] = v;
    });
    if (Object.keys(utm).length > 0) {
      localStorage.setItem("hn_attribution", JSON.stringify({ ...utm, captured_at: new Date().toISOString() }));
    }
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

      const noscript = document.createElement("noscript");
      const img = document.createElement("img");
      img.height = 1; img.width = 1; img.style.display = "none";
      img.src = `https://www.facebook.com/tr?id=${config.facebookPixelId}&ev=PageView&noscript=1`;
      noscript.appendChild(img);
      document.body.appendChild(noscript);
    }

    // TikTok Pixel
    if (config.tiktokPixelId) {
      const tt = document.createElement("script");
      tt.innerHTML = `
        !function (w, d, t) {
          w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
          ttq.load('${config.tiktokPixelId}');
          ttq.page();
        }(window, document, 'ttq');
      `;
      document.head.appendChild(tt);
    }

    // Snap Pixel
    if (config.snapPixelId) {
      const sn = document.createElement("script");
      sn.innerHTML = `
        (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function(){a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
        a.queue=[];var s='script';r=t.createElement(s);r.async=!0;r.src=n;var u=t.getElementsByTagName(s)[0];u.parentNode.insertBefore(r,u);})(window,document,'https://sc-static.net/scevent.min.js');
        snaptr('init','${config.snapPixelId}');snaptr('track','PAGE_VIEW');
      `;
      document.head.appendChild(sn);
    }

    // LinkedIn Insight Tag
    if (config.linkedinPartnerId) {
      const li = document.createElement("script");
      li.innerHTML = `
        _linkedin_partner_id="${config.linkedinPartnerId}";
        window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];
        window._linkedin_data_partner_ids.push(_linkedin_partner_id);
        (function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=true;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s);})(window.lintrk);
      `;
      document.head.appendChild(li);
    }

    // Twitter (X) Pixel
    if (config.twitterPixelId) {
      const tw = document.createElement("script");
      tw.innerHTML = `
        !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);},s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
        twq('config','${config.twitterPixelId}');
      `;
      document.head.appendChild(tw);
    }

    // Google Ads / Analytics extra (if not in index.html)
    const gtagId = config.googleAdsId;
    if (gtagId) {
      const gtagInit = document.createElement("script");
      gtagInit.innerHTML = `if(window.gtag){gtag('config','${gtagId}');}`;
      document.head.appendChild(gtagInit);
    }
  }, [config]);

  return null;
};

export default TrackingScripts;

// ───────────────────────── HELPERS ─────────────────────────

/** Track event across all enabled platforms (FB + GA + TikTok + Snap + LinkedIn + X) */
export const trackEvent = (eventName: string, params?: Record<string, unknown>) => {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.fbq) w.fbq("track", eventName, params);
  if (w.gtag) w.gtag("event", eventName, params);
  if (w.ttq) w.ttq.track(eventName, params);
  if (w.snaptr) w.snaptr("track", eventName.toUpperCase().replace(/\s+/g, "_"), params);
  if (w.lintrk) w.lintrk("track", { conversion_id: params?.conversion_id });
  if (w.twq) w.twq("event", eventName, params);
};

/** Track conversion via Google Ads send_to */
export const trackConversion = (sendTo?: string, value?: number, currency = "MAD") => {
  if (typeof window === "undefined") return;
  const w = window as any;
  if (w.gtag && sendTo) w.gtag("event", "conversion", { send_to: sendTo, value, currency });
};

/** Get attribution data captured from URL params (for signup forms) */
export const getAttribution = () => {
  try {
    const raw = localStorage.getItem("hn_attribution");
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
