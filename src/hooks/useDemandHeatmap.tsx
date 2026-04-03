/**
 * Demand Heatmap Overlay
 * Shows high-demand areas on the driver's map based on recent order data
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface HeatPoint {
  lat: number;
  lng: number;
  intensity: number;
}

export const useDemandHeatmap = () => {
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);

  useEffect(() => {
    const fetchDemandData = async () => {
      // Get orders and trips from last 24 hours with coordinates
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [{ data: orders }, { data: trips }] = await Promise.all([
        supabase
          .from("delivery_orders")
          .select("pickup_lat, pickup_lng, delivery_lat, delivery_lng")
          .gte("created_at", since)
          .not("pickup_lat", "is", null),
        supabase
          .from("trips")
          .select("pickup_lat, pickup_lng, destination_lat, destination_lng")
          .gte("created_at", since)
          .not("pickup_lat", "is", null),
      ]);

      const allPoints: { pLat: number; pLng: number; dLat?: number; dLng?: number }[] = [];
      (orders || []).forEach(o => {
        if (o.pickup_lat && o.pickup_lng) allPoints.push({ pLat: o.pickup_lat, pLng: o.pickup_lng, dLat: o.delivery_lat ?? undefined, dLng: o.delivery_lng ?? undefined });
      });
      (trips || []).forEach(t => {
        if (t.pickup_lat && t.pickup_lng) allPoints.push({ pLat: t.pickup_lat, pLng: t.pickup_lng, dLat: t.destination_lat ?? undefined, dLng: t.destination_lng ?? undefined });
      });

      if (allPoints.length === 0) return;

      const pointMap = new Map<string, number>();
      allPoints.forEach((o) => {
        const key = `${(Math.round(o.pLat * 200) / 200).toFixed(3)},${(Math.round(o.pLng * 200) / 200).toFixed(3)}`;
        pointMap.set(key, (pointMap.get(key) || 0) + 1);
        if (o.dLat && o.dLng) {
          const dKey = `${(Math.round(o.dLat * 200) / 200).toFixed(3)},${(Math.round(o.dLng * 200) / 200).toFixed(3)}`;
          pointMap.set(dKey, (pointMap.get(dKey) || 0) + 0.5);
        }
      });

      const maxCount = Math.max(...pointMap.values(), 1);
      const points: HeatPoint[] = [];
      pointMap.forEach((count, key) => {
        const [lat, lng] = key.split(",").map(Number);
        points.push({ lat, lng, intensity: count / maxCount });
      });

      setHeatPoints(points);
    };

    fetchDemandData();
    const interval = setInterval(fetchDemandData, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  return heatPoints;
};

/**
 * Renders heatmap circles on a Leaflet map
 * Import this and render inside your map component
 */
export const HeatmapCircles = ({ points }: { points: HeatPoint[] }) => {
  if (points.length === 0) return null;

  return (
    <>
      {points.map((p, i) => {
        const radius = 300 + p.intensity * 500; // 300-800m radius
        const opacity = 0.15 + p.intensity * 0.35;
        const color = p.intensity > 0.7 ? "#ef4444" : p.intensity > 0.4 ? "#f59e0b" : "#22c55e";
        
        return (
          <div key={i} data-heat-point={`${p.lat},${p.lng}`} data-radius={radius} data-opacity={opacity} data-color={color} />
        );
      })}
    </>
  );
};

export default useDemandHeatmap;
