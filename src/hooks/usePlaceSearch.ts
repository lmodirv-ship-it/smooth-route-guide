import { useCallback, useEffect, useRef, useState } from "react";

export interface GeoResult {
  name: string;
  lat: number;
  lng: number;
}

/** Free-text place search (OpenStreetMap Nominatim) biased to Morocco. */
export function usePlaceSearch(lang = "ar") {
  const [results, setResults] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timer = useRef<number | null>(null);
  const controller = useRef<AbortController | null>(null);

  const search = useCallback((query: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    const q = query.trim();
    if (q.length < 3) { setResults([]); setLoading(false); return; }
    setLoading(true);
    timer.current = window.setTimeout(async () => {
      controller.current?.abort();
      controller.current = new AbortController();
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&countrycodes=ma&limit=8&accept-language=${lang}&q=${encodeURIComponent(q)}`,
          { signal: controller.current.signal }
        );
        const data = await res.json();
        setResults(
          (Array.isArray(data) ? data : []).map((d: any) => ({
            name: String(d.display_name || "").split(",").slice(0, 3).join("، "),
            lat: Number(d.lat),
            lng: Number(d.lon),
          }))
        );
      } catch {
        /* aborted or offline */
      } finally {
        setLoading(false);
      }
    }, 450);
  }, [lang]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
    controller.current?.abort();
  }, []);

  return { results, loading, search, clear: () => setResults([]) };
}
