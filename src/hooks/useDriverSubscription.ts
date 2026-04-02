import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DriverSubscription {
  id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  orders_used: number;
  km_used: number;
  package_name: string;
  duration_days: number;
}

export interface DriverPackage {
  id: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  description_ar: string | null;
  description_fr: string | null;
  duration_days: number;
  price: number;
  original_price: number | null;
  is_featured: boolean;
  driver_type: string;
  sort_order: number;
}

export function useDriverSubscription() {
  const [activeSubscription, setActiveSubscription] = useState<DriverSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysLeft, setDaysLeft] = useState(0);
  const [isExpired, setIsExpired] = useState(true);

  useEffect(() => {
    const SUBSCRIPTION_START_DATE = new Date("2026-04-05T00:00:00Z");
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const now = new Date().toISOString();

      // Check active subscription
      const { data } = await supabase
        .from("driver_subscriptions")
        .select("*, driver_packages(name_ar, duration_days)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("expires_at", now)
        .order("expires_at", { ascending: false })
        .limit(1) as any;

      if (data && data.length > 0) {
        const sub = data[0];
        const expires = new Date(sub.expires_at);
        const days = Math.max(0, Math.ceil((expires.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        setDaysLeft(days);
        setIsExpired(false);
        setActiveSubscription({
          id: sub.id,
          status: sub.status,
          starts_at: sub.starts_at,
          expires_at: sub.expires_at,
          orders_used: sub.orders_used,
          km_used: sub.km_used,
          package_name: sub.driver_packages?.name_ar || "باقة",
          duration_days: sub.driver_packages?.duration_days || 30,
        });
      } else {
        // Check 5-day free trial based on profile creation date
        const { data: profile } = await supabase
          .from("profiles")
          .select("created_at")
          .eq("id", user.id)
          .maybeSingle();

        const createdAt = new Date(profile?.created_at || user.created_at || Date.now());
        const trialEnds = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);
        const trialDaysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));

        if (trialDaysLeft > 0) {
          setIsExpired(false);
          setDaysLeft(trialDaysLeft);
          setActiveSubscription({
            id: "trial",
            status: "trial",
            starts_at: createdAt.toISOString(),
            expires_at: trialEnds.toISOString(),
            orders_used: 0,
            km_used: 0,
            package_name: "تجربة مجانية (5 أيام)",
            duration_days: 5,
          });
        } else {
          setIsExpired(true);
          setActiveSubscription(null);
        }
      }
      setLoading(false);
    };
    check();
  }, []);

  return { activeSubscription, loading, daysLeft, isExpired };
}

export function useDriverPackages() {
  const [packages, setPackages] = useState<DriverPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("driver_packages")
      .select("*")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => {
        setPackages((data || []) as DriverPackage[]);
        setLoading(false);
      });
  }, []);

  return { packages, loading };
}
