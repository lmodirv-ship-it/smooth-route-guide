/**
 * تفضيلات واجهة الدردشة — تُحفظ في قاعدة البيانات (تبقى ثابتة عبر كل الأجهزة)
 * مع نسخة محلية سريعة في localStorage لتفادي وميض الواجهة.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatColorMode = "dark" | "light";

export type ChatCustom = {
  /** خلفية منطقة المحادثة */
  bg?: string;
  /** فقاعة المستخدم */
  userBg?: string;
  userText?: string;
  /** فقاعة المساعد */
  assistantBg?: string;
  assistantText?: string;
  /** حدود الفقاعات */
  border?: string;
  borderWidth?: number;
  radius?: number;
  /** الخطوط */
  fontFamily?: string;
  fontSize?: number;
};

export type ChatPrefs = {
  skinId: string;
  colorMode: ChatColorMode;
  custom: ChatCustom;
};

export const DEFAULT_CHAT_PREFS: ChatPrefs = {
  skinId: "classic",
  colorMode: "dark",
  custom: {},
};

export const CHAT_FONTS = [
  { value: "", label: "خط المنصة (افتراضي)" },
  { value: "'Cairo', sans-serif", label: "Cairo" },
  { value: "'Rajdhani', sans-serif", label: "Rajdhani" },
  { value: "'Tahoma', sans-serif", label: "Tahoma" },
  { value: "Georgia, serif", label: "Georgia" },
  { value: "ui-monospace, 'Courier New', monospace", label: "Monospace" },
];

const LS_KEY = "hn_admin_chat_prefs";

const readLocal = (): ChatPrefs => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return { ...DEFAULT_CHAT_PREFS, ...JSON.parse(raw) };
    // ترحيل الاختيار القديم
    const legacy = localStorage.getItem("hn_admin_chat_skin");
    if (legacy) return { ...DEFAULT_CHAT_PREFS, skinId: legacy };
  } catch { /* ignore */ }
  return DEFAULT_CHAT_PREFS;
};

export function useChatPrefs() {
  const db = supabase as any;
  const [prefs, setPrefs] = useState<ChatPrefs>(readLocal);
  const [synced, setSynced] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // تحميل من قاعدة البيانات عند فتح الصفحة
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { if (alive) setSynced(true); return; }
      const { data } = await db
        .from("ai_chat_preferences")
        .select("skin_id, color_mode, custom")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!alive) return;
      if (data) {
        const next: ChatPrefs = {
          skinId: data.skin_id ?? DEFAULT_CHAT_PREFS.skinId,
          colorMode: (data.color_mode === "light" ? "light" : "dark") as ChatColorMode,
          custom: (data.custom ?? {}) as ChatCustom,
        };
        setPrefs(next);
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      }
      setSynced(true);
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((patch: Partial<ChatPrefs>, replaceCustom = false) => {
    setPrefs((prev) => {
      const next: ChatPrefs = {
        ...prev,
        ...patch,
        custom: patch.custom
          ? (replaceCustom ? patch.custom : { ...prev.custom, ...patch.custom })
          : prev.custom,
      };
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        await db.from("ai_chat_preferences").upsert(
          {
            user_id: user.id,
            skin_id: next.skinId,
            color_mode: next.colorMode,
            custom: next.custom,
          },
          { onConflict: "user_id" },
        );
      }, 600);
      return next;
    });
  }, [db]);

  const reset = useCallback(() => update({ custom: {} as ChatCustom }, true), [update]);

  return { prefs, update, reset, synced };
}
