import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Eye, TrendingUp } from "lucide-react";

const generateSessionId = (): string => {
  const key = "hn_visitor_session";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = crypto.randomUUID();
    sessionStorage.setItem(key, sid);
  }
  return sid;
};

const detectDevice = () => {
  const ua = navigator.userAgent;
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua);
  const browser = /Chrome/i.test(ua) ? "Chrome" : /Firefox/i.test(ua) ? "Firefox" : /Safari/i.test(ua) ? "Safari" : /Edge/i.test(ua) ? "Edge" : "Other";
  const os = /Windows/i.test(ua) ? "Windows" : /Mac/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : /Android/i.test(ua) ? "Android" : /iPhone|iPad/i.test(ua) ? "iOS" : "Other";
  return { device_type: isMobile ? "mobile" : "desktop", browser, os };
};

const fetchGeoInfo = async (): Promise<{ country: string; city: string }> => {
  try {
    const res = await fetch("https://ip-api.com/json/?fields=country,city&lang=en", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { country: "", city: "" };
    const data = await res.json();
    return { country: data.country || "", city: data.city || "" };
  } catch {
    return { country: "", city: "" };
  }
};

interface Stats {
  total_visits: number;
  unique_visitors: number;
  today_visits: number;
}

const VisitorCounter = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sessionId = generateSessionId();
    const { device_type, browser, os } = detectDevice();

    const recordVisit = async () => {
      const geo = await fetchGeoInfo();
      const params = new URLSearchParams(window.location.search);
      const { data, error } = await supabase.rpc("record_visit", {
        p_session_id: sessionId,
        p_page_path: window.location.pathname,
        p_country: geo.country,
        p_city: geo.city,
        p_device_type: device_type,
        p_browser: browser,
        p_os: os,
        p_referrer: document.referrer || "",
        p_language: navigator.language || "",
        p_utm_source: params.get("utm_source") || "",
        p_utm_medium: params.get("utm_medium") || "",
        p_utm_campaign: params.get("utm_campaign") || "",
        p_utm_content: params.get("utm_content") || "",
        p_utm_term: params.get("utm_term") || "",
      });

      if (!error && data) {
        setStats(data as unknown as Stats);
      }

      setIsLoading(false);
    };

    recordVisit();

    const channel = supabase
      .channel("visitor-counter-changes-" + Math.random().toString(36).slice(2))
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site_visit_counter" },
        (payload) => {
          const row = payload.new as any;
          setStats({
            total_visits: row.total_visits,
            unique_visitors: row.unique_visitors,
            today_visits: row.today_visits,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!stats && !isLoading) return null;

  const items = [
    { icon: Eye, value: stats?.total_visits ?? 0, color: "text-primary" },
    { icon: Users, value: stats?.unique_visitors ?? 0, color: "text-success" },
    { icon: TrendingUp, value: stats?.today_visits ?? 0, color: "text-warning" },
  ];

  return (
    <div className="flex items-center gap-1">
      {items.map((item, i) => (
        <div
          key={i}
          className="group inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/60 border border-border/40 text-xs font-semibold tabular-nums cursor-default"
        >
          <item.icon className={`w-3 h-3 ${item.color} transition-transform duration-500 group-hover:rotate-[360deg]`} />
          <span className={item.color}>{isLoading ? "..." : item.value.toLocaleString()}</span>
        </div>
      ))}
      <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
    </div>
  );
};

export default VisitorCounter;
