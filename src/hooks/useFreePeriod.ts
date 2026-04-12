import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FreePeriodInfo {
  isActive: boolean;
  label: string;
  from: string;
  to: string;
  daysLeft: number;
  loading: boolean;
}

export function useFreePeriod(): FreePeriodInfo {
  const [info, setInfo] = useState<FreePeriodInfo>({
    isActive: false, label: "", from: "", to: "", daysLeft: 0, loading: true,
  });

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "free_period")
        .maybeSingle();

      const fp = data?.value as any;
      const now = Date.now();

      if (fp?.enabled && fp?.from && fp?.to) {
        const fromDate = new Date(fp.from + "T00:00:00Z");
        const toDate = new Date(fp.to + "T23:59:59Z");
        if (now >= fromDate.getTime() && now <= toDate.getTime()) {
          const daysLeft = Math.max(0, Math.ceil((toDate.getTime() - now) / (1000 * 60 * 60 * 24)));
          setInfo({
            isActive: true,
            label: fp.label_ar || "فترة مجانية",
            from: fp.from,
            to: fp.to,
            daysLeft,
            loading: false,
          });
          return;
        }
      }
      setInfo(prev => ({ ...prev, isActive: false, loading: false }));
    };
    check();
  }, []);

  return info;
}
