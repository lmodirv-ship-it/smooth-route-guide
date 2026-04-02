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
      // Get orders from last 24 hours with coordinates
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: orders } = await supabase
        .from("delivery_orders")
        .select("pickup_lat, pickup_lng, delivery_lat, delivery_lng")
        .gte("created_at", since)
        .not("pickup_lat", "is", null);

      if (!orders || orders.length === 0) return;

      // Build heatmap from pickup locations (where demand is)
      const pointMap = new Map<string, number>();
      orders.forEach((o) => {
        if (o.pickup_lat && o.pickup_lng) {
          // Round to ~500m grid cells
          const key = `${(Math.round(o.pickup_lat * 200) / 200).toFixed(3)},${(Math.round(o.pickup_lng * 200) / 200).toFixed(3)}`;
          pointMap.set(key, (pointMap.get(key) || 0) + 1);
        }
        if (o.delivery_lat && o.delivery_lng) {
          const key = `${(Math.round(o.delivery_lat * 200) / 200).toFixed(3)},${(Math.round(o.delivery_lng * 200) / 200).toFixed(3)}`;
          pointMap.set(key, (pointMap.get(key) || 0) + 0.5);
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
