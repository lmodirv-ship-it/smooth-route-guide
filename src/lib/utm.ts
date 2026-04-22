/**
 * UTM & Attribution helpers
 * Captures and persists marketing source for conversion attribution.
 */

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  ref?: string;
  landing_page?: string;
  referrer?: string;
  captured_at?: string;
}

const STORAGE_KEY = "hn_attribution";

export const captureAttribution = (): Attribution | null => {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const data: Attribution = {};
  ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref"].forEach(k => {
    const v = params.get(k);
    if (v) (data as any)[k] = v;
  });
  if (Object.keys(data).length === 0 && !document.referrer) return getAttribution();
  data.landing_page = window.location.pathname;
  data.referrer = document.referrer || undefined;
  data.captured_at = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return data;
};

export const getAttribution = (): Attribution | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};

export const clearAttribution = () => {
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
};

/** Build a shareable URL with UTM tags */
export const buildShareUrl = (
  baseUrl: string,
  source: string,
  medium: string = "social",
  campaign: string = "share",
  ref?: string
): string => {
  const url = new URL(baseUrl);
  url.searchParams.set("utm_source", source);
  url.searchParams.set("utm_medium", medium);
  url.searchParams.set("utm_campaign", campaign);
  if (ref) url.searchParams.set("ref", ref);
  return url.toString();
};
