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
  const [daysLeft, setDaysLeft] = useState(9999);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    // Platform is free for all registered users — no subscription required
    setIsExpired(false);
    setDaysLeft(9999);
    setActiveSubscription({
      id: "free-platform",
      status: "free",
      starts_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      orders_used: 0,
      km_used: 0,
      package_name: "منصة مجانية",
      duration_days: 365,
    });
    setLoading(false);
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
