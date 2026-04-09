import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SEARCH_RADIUS_KM = 10;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 1. Check if any call-center agent is active
    const { count: activeAgents } = await supabase
      .from("agent_sessions")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .is("logout_at", null);

    if (activeAgents && activeAgents > 0) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "agents_online", count: activeAgents }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = { delivery: { processed: 0, assigned: 0 }, rides: { processed: 0, assigned: 0 } };

    // ── 2. Handle pending DELIVERY orders ──
    const { data: pendingDelivery } = await supabase
      .from("delivery_orders")
      .select("id, pickup_lat, pickup_lng, delivery_lat, delivery_lng, category, store_id, status")
      .in("status", ["pending", "pending_call_center"])
      .order("created_at", { ascending: true })
      .limit(20);

    if (pendingDelivery && pendingDelivery.length > 0) {
      // Get available delivery drivers
      const { data: deliveryDrivers } = await supabase
        .from("drivers")
        .select("id, user_id, current_lat, current_lng")
        .eq("driver_type", "delivery")
        .eq("status", "active")
        .not("current_lat", "is", null)
        .not("current_lng", "is", null);

      for (const order of pendingDelivery) {
        results.delivery.processed++;
        if (!deliveryDrivers || deliveryDrivers.length === 0) continue;
        if (!order.pickup_lat || !order.pickup_lng) continue;

        // Find nearest available driver
        let nearest: typeof deliveryDrivers[0] | null = null;
        let nearestDist = Infinity;

        for (const d of deliveryDrivers) {
          const dist = haversineKm(order.pickup_lat, order.pickup_lng, d.current_lat!, d.current_lng!);
          if (dist < SEARCH_RADIUS_KM && dist < nearestDist) {
            nearestDist = dist;
            nearest = d;
          }
        }

        if (nearest) {
          // Auto-confirm and assign
          const { error: updateErr } = await supabase
            .from("delivery_orders")
            .update({
              status: "accepted",
              driver_id: nearest.id,
              accepted_at: new Date().toISOString(),
            })
            .eq("id", order.id)
            .in("status", ["pending", "pending_call_center"]);

          if (!updateErr) {
            // Mark driver as busy (remove from pool)
            await supabase
              .from("drivers")
              .update({ status: "busy" })
              .eq("id", nearest.id);

            // Remove assigned driver from available pool
            deliveryDrivers.splice(deliveryDrivers.indexOf(nearest), 1);
            results.delivery.assigned++;
          }
        }
      }
    }

    // ── 3. Handle pending RIDE requests (trips) ──
    const { data: pendingTrips } = await supabase
      .from("trips")
      .select("id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, status")
      .in("status", ["pending", "searching"])
      .order("created_at", { ascending: true })
      .limit(20);

    if (pendingTrips && pendingTrips.length > 0) {
      const { data: rideDrivers } = await supabase
        .from("drivers")
        .select("id, user_id, current_lat, current_lng")
        .eq("driver_type", "ride")
        .eq("status", "active")
        .not("current_lat", "is", null)
        .not("current_lng", "is", null);

      for (const trip of pendingTrips) {
        results.rides.processed++;
        if (!rideDrivers || rideDrivers.length === 0) continue;
        if (!trip.pickup_lat || !trip.pickup_lng) continue;

        let nearest: typeof rideDrivers[0] | null = null;
        let nearestDist = Infinity;

        for (const d of rideDrivers) {
          const dist = haversineKm(trip.pickup_lat, trip.pickup_lng, d.current_lat!, d.current_lng!);
          if (dist < SEARCH_RADIUS_KM && dist < nearestDist) {
            nearestDist = dist;
            nearest = d;
          }
        }

        if (nearest) {
          const { error: updateErr } = await supabase
            .from("trips")
            .update({
              status: "accepted",
              driver_id: nearest.id,
              accepted_at: new Date().toISOString(),
            })
            .eq("id", trip.id)
            .in("status", ["pending", "searching"]);

          if (!updateErr) {
            await supabase
              .from("drivers")
              .update({ status: "busy" })
              .eq("id", nearest.id);

            rideDrivers.splice(rideDrivers.indexOf(nearest), 1);
            results.rides.assigned++;
          }
        }
      }
    }

    console.log("[auto-dispatch]", JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[auto-dispatch] Error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
