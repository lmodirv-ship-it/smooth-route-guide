import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Route = {
  id: string;
  route_code: string | null;
  driver_id: string;
  origin_address: string;
  origin_lat: number | null;
  origin_lng: number | null;
  destination_address: string;
  destination_lat: number | null;
  destination_lng: number | null;
  departure_time: string;
  days_of_week: string[];
  seats_total: number;
  seats_available: number;
  price_per_seat: number;
  currency: string;
  city: string | null;
  zone_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type Options = {
  onlyMine?: boolean;
  city?: string;
  activeOnly?: boolean;
};

export function useRoutes(opts: Options = {}) {
  const { onlyMine = false, city, activeOnly = true } = opts;
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase.from("routes").select("*").order("departure_time", { ascending: true });
      if (activeOnly) query = query.eq("is_active", true);
      if (city) query = query.eq("city", city);
      if (onlyMine) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setRoutes([]);
          return;
        }
        const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
        if (!driver) {
          setRoutes([]);
          return;
        }
        query = query.eq("driver_id", driver.id);
      }
      const { data, error } = await query;
      if (error) throw error;
      setRoutes((data ?? []) as Route[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load routes");
    } finally {
      setLoading(false);
    }
  }, [onlyMine, city, activeOnly]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("routes-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "routes" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  return { routes, loading, error, reload: load };
}
