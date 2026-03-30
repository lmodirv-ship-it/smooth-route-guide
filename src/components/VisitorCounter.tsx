import { useState, useEffect } from "react";
import { motion } from "framer-motion";
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

    // Subscribe to realtime counter updates
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
    {
      icon: Eye,
      value: stats.total_visits,
      label: "إجمالي الزيارات",
      color: "text-primary",
    },
    {
      icon: Users,
      value: stats.unique_visitors,
      label: "زوار فريدون",
      color: "text-emerald-400",
    },
    {
      icon: TrendingUp,
      value: stats.today_visits,
      label: "زيارات اليوم",
      color: "text-amber-400",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="fixed top-16 left-1/2 -translate-x-1/2 z-40"
    >
      <div className="flex items-center gap-4 px-5 py-2 rounded-full border border-white/10 bg-black/60 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && (
              <div className="w-px h-4 bg-white/10" />
            )}
            <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
            <motion.span
              key={item.value}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`text-sm font-bold ${item.color} tabular-nums`}
            >
              {item.value.toLocaleString()}
            </motion.span>
            <span className="text-[10px] text-white/40 hidden sm:inline">
              {item.label}
            </span>
          </div>
        ))}
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
    </motion.div>
  );
};

export default VisitorCounter;
