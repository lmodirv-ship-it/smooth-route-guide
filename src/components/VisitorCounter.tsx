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

interface Stats {
  total_visits: number;
  unique_visitors: number;
  today_visits: number;
}

const VisitorCounter = () => {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const sessionId = generateSessionId();

    const recordVisit = async () => {
      const { data, error } = await supabase.rpc("record_visit", {
        p_session_id: sessionId,
        p_page_path: window.location.pathname,
      });

      if (!error && data) {
        setStats(data as unknown as Stats);
      }
    };

    recordVisit();

    const channel = supabase
      .channel("visitor-counter")
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

  if (!stats) return null;

  const items = [
    { icon: Eye, value: stats.total_visits, color: "text-primary" },
    { icon: Users, value: stats.unique_visitors, color: "text-emerald-400" },
    { icon: TrendingUp, value: stats.today_visits, color: "text-amber-400" },
  ];

  return (
    <div className="flex items-center gap-1">
      {items.map((item, i) => (
        <div
          key={i}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/60 border border-border/40 text-xs font-semibold tabular-nums"
        >
          <item.icon className={`w-3 h-3 ${item.color}`} />
          <span className={item.color}>{item.value.toLocaleString()}</span>
        </div>
      ))}
      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
    </div>
  );
};

export default VisitorCounter;
