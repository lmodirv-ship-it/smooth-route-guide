import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Reservation = {
  id: string;
  reservation_code: string | null;
  route_id: string;
  user_id: string;
  seats_reserved: number;
  pickup_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  travel_date: string;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  total_price: number;
  currency: string;
  payment_status: "unpaid" | "paid" | "refunded";
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Scope = "mine" | "driver-routes" | "all";

export function useReservations(scope: Scope = "mine") {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // RLS handles filtering; simple select works for all scopes.
      const { data, error } = await supabase
        .from("reservations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setReservations((data ?? []) as Reservation[]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("reservations-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservations" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const createReservation = useCallback(
    async (payload: {
      route_id: string;
      seats_reserved: number;
      travel_date?: string;
      pickup_address?: string;
      pickup_lat?: number;
      pickup_lng?: number;
      total_price?: number;
      notes?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("not_authenticated");
      const { data, error } = await supabase
        .from("reservations")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Reservation;
    },
    []
  );

  const cancelReservation = useCallback(async (id: string) => {
    const { error } = await supabase.from("reservations").update({ status: "cancelled" }).eq("id", id);
    if (error) throw error;
  }, []);

  return { reservations, loading, error, reload: load, createReservation, cancelReservation };
}
