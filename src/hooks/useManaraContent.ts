import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ManaraPillar {
  icon: string;
  title: string;
  description: string;
}

export interface ManaraContent {
  brand: string;
  heroTitle: string;
  heroHighlight: string;
  heroDescription: string;
  primaryCtaLabel: string;
  primaryCtaLink: string;
  secondaryCtaLabel: string;
  secondaryCtaLink: string;
  pillarsTitle: string;
  pillars: ManaraPillar[];
  ctaTitle: string;
  ctaDescription: string;
  ctaButtonLabel: string;
  ctaButtonLink: string;
  sphereHeightPercent: number;
  sphereSpeed: number;
  showSphere: boolean;
  footerText: string;
}

export const MANARA_SETTINGS_KEY = "manara_page";

export const MANARA_DEFAULTS: ManaraContent = {
  brand: "منارة",
  heroTitle: "منارة",
  heroHighlight: "ضوء يقود طريقك",
  heroDescription:
    "صفحة منارة هي بوابتك لاكتشاف رؤية منصة HN Driver: إضاءة الطريق بين الزبون والسائق وصاحب المحل، بتقنية حديثة وخدمة محلية موثوقة.",
  primaryCtaLabel: "اكتشف خدماتنا",
  primaryCtaLink: "/services",
  secondaryCtaLabel: "انضم كسائق",
  secondaryCtaLink: "/join/driver",
  pillarsTitle: "أعمدة المنارة",
  pillars: [
    { icon: "MapPin", title: "تغطية محلية دقيقة", description: "منارة تضيء كل حي في طنجة — توصيل ورحلات مبنية على معرفة حقيقية بالمنطقة." },
    { icon: "ShieldCheck", title: "ثقة وأمان", description: "سائقون موثّقون، تتبّع مباشر، وحماية كاملة لبياناتك في كل طلب." },
    { icon: "Truck", title: "سرعة التنفيذ", description: "إسناد تلقائي ذكي لأقرب سائق خلال ثوانٍ، مع متابعة لحظية حتى الباب." },
    { icon: "Users", title: "مجتمع واحد", description: "زبائن، سائقون، وأصحاب محلات — منصة واحدة تجمع الجميع تحت ضوء واحد." },
  ],
  ctaTitle: "جاهز تسلك الطريق المضيء؟",
  ctaDescription: "أنشئ حسابك الآن وابدأ أول رحلة أو طلب توصيل خلال دقائق.",
  ctaButtonLabel: "ابدأ الآن مجاناً",
  ctaButtonLink: "/auth/client?mode=signup",
  sphereHeightPercent: 70,
  sphereSpeed: 24,
  showSphere: true,
  footerText: "جميع الحقوق محفوظة el hassani moulay ismail. groupe hn",
};

export function mergeManara(raw: any): ManaraContent {
  if (!raw || typeof raw !== "object") return MANARA_DEFAULTS;
  return {
    ...MANARA_DEFAULTS,
    ...raw,
    pillars: Array.isArray(raw.pillars) && raw.pillars.length ? raw.pillars : MANARA_DEFAULTS.pillars,
  };
}

/** Reads the editable Manara page content from app_settings, live-updating via Realtime. */
export function useManaraContent() {
  const [content, setContent] = useState<ManaraContent>(MANARA_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", MANARA_SETTINGS_KEY)
        .maybeSingle();
      if (!alive) return;
      setContent(mergeManara(data?.value));
      setLoading(false);
    };

    load();

    const channel = supabase
      .channel(`manara_page_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: `key=eq.${MANARA_SETTINGS_KEY}` },
        () => load()
      )
      .subscribe();

    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { content, loading };
}
