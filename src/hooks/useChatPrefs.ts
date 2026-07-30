/**
 * تفضيلات واجهة الدردشة — تُحفظ في قاعدة البيانات (تبقى ثابتة عبر كل الأجهزة)
 * مع نسخة محلية سريعة في localStorage لتفادي وميض الواجهة.
 * تدعم: تخصيص منفصل لكل نوع فقاعة + ثيمات متعددة مسمّاة.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatColorMode = "dark" | "light";

/** تخصيص فقاعة واحدة (واردة أو صادرة) */
export type BubbleCustom = {
  bg?: string;
  text?: string;
  border?: string;
  borderWidth?: number;
  radius?: number;
  fontFamily?: string;
  fontSize?: number;
};

export type ChatCustom = {
  /** خلفية منطقة المحادثة */
  bg?: string;
  /** الخط العام لمنطقة المحادثة */
  fontFamily?: string;
  fontSize?: number;
  /** فقاعة المستخدم (الصادرة) */
  user?: BubbleCustom;
  /** فقاعة المساعد (الواردة) */
  assistant?: BubbleCustom;
};

export type ChatPreset = {
  id: string;
  name: string;
  skinId: string;
  colorMode: ChatColorMode;
  custom: ChatCustom;
};

export type ChatPrefs = {
  skinId: string;
  colorMode: ChatColorMode;
  custom: ChatCustom;
  presets: ChatPreset[];
  activePresetId?: string | null;
};

export const DEFAULT_CHAT_PREFS: ChatPrefs = {
  skinId: "classic",
  colorMode: "dark",
  custom: {},
  presets: [],
  activePresetId: null,
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

/** ترحيل الشكل القديم (ألوان مسطّحة) إلى الشكل الجديد المنفصل */
const migrateCustom = (raw: any): ChatCustom => {
  const c = (raw ?? {}) as any;
  if (c.user || c.assistant) {
    return { bg: c.bg, fontFamily: c.fontFamily, fontSize: c.fontSize, user: c.user ?? {}, assistant: c.assistant ?? {} };
  }
  return {
    bg: c.bg,
    fontFamily: c.fontFamily,
    fontSize: c.fontSize,
    user: { bg: c.userBg, text: c.userText, border: c.border, borderWidth: c.borderWidth, radius: c.radius },
    assistant: { bg: c.assistantBg, text: c.assistantText, border: c.border, borderWidth: c.borderWidth, radius: c.radius },
  };
};

const readLocal = (): ChatPrefs => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...DEFAULT_CHAT_PREFS, ...p, custom: migrateCustom(p.custom), presets: p.presets ?? [] };
    }
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
        const stored = (data.custom ?? {}) as any;
        const next: ChatPrefs = {
          skinId: data.skin_id ?? DEFAULT_CHAT_PREFS.skinId,
          colorMode: (data.color_mode === "light" ? "light" : "dark") as ChatColorMode,
          custom: migrateCustom(stored),
          presets: Array.isArray(stored.__presets) ? stored.__presets : [],
          activePresetId: stored.__activePresetId ?? null,
        };
        setPrefs(next);
        localStorage.setItem(LS_KEY, JSON.stringify(next));
      }
      setSynced(true);
    })();
    return () => { alive = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((next: ChatPrefs) => {
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
          custom: { ...next.custom, __presets: next.presets, __activePresetId: next.activePresetId ?? null },
        },
        { onConflict: "user_id" },
      );
    }, 600);
  }, [db]);

  /** استبدال كامل للتفضيلات (يُستخدم للحفظ بعد المعاينة) */
  const commit = useCallback((next: ChatPrefs) => {
    setPrefs(next);
    persist(next);
  }, [persist]);

  const update = useCallback((patch: Partial<ChatPrefs>) => {
    setPrefs((prev) => {
      const next: ChatPrefs = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, [persist]);

  const reset = useCallback(() => update({ custom: {} }), [update]);

  return { prefs, update, commit, reset, synced };
}

/** دمج تخصيص فقاعة مع القيم العامة */
export const bubbleCss = (custom: ChatCustom, role: "user" | "assistant"): React.CSSProperties => {
  const b = (role === "user" ? custom.user : custom.assistant) ?? {};
  return {
    background: b.bg || undefined,
    color: b.text || undefined,
    borderColor: b.border || undefined,
    borderWidth: b.borderWidth != null ? `${b.borderWidth}px` : undefined,
    borderStyle: b.borderWidth ? "solid" : undefined,
    borderRadius: b.radius != null ? `${b.radius}px` : undefined,
    fontFamily: b.fontFamily || custom.fontFamily || undefined,
    fontSize: b.fontSize ? `${b.fontSize}px` : custom.fontSize ? `${custom.fontSize}px` : undefined,
  };
};
