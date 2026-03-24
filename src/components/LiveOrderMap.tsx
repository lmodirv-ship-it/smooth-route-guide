import { useEffect, useMemo, useState } from "react";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";
import LeafletMap from "@/components/LeafletMap";
import { Navigation, MapPin, Clock } from "lucide-react";

interface LiveOrderMapProps {
  className?: string;
  driverPosition?: { lat: number; lng: number } | null;
  targetPosition?: { lat: number; lng: number } | null;
  targetLabel?: string;
  showRouteInfo?: boolean;
}

interface RouteInfo {
  distanceKm: number;
  durationMin: number;
}

const LiveOrderMap = ({
  className = "w-full h-full",
  driverPosition,
  targetPosition,
  targetLabel,
  showRouteInfo = false,
}: LiveOrderMapProps) => {
  const smoothedDriver = useSmoothedPosition(driverPosition);
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);

  const center = useMemo(
    () => smoothedDriver || targetPosition || undefined,
    [smoothedDriver, targetPosition]
  );

  const route = useMemo(() => {
    if (!smoothedDriver || !targetPosition) return null;
    return { pickup: smoothedDriver, destination: targetPosition };
  }, [smoothedDriver, targetPosition]);

  // Fetch distance/ETA from OSRM
  useEffect(() => {
    if (!smoothedDriver || !targetPosition) {
      setRouteInfo(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${smoothedDriver.lng},${smoothedDriver.lat};${targetPosition.lng},${targetPosition.lat}?overview=false`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.routes?.[0]) {
          setRouteInfo({
            distanceKm: +(data.routes[0].distance / 1000).toFixed(1),
            durationMin: Math.ceil(data.routes[0].duration / 60),
          });
        }
      } catch {
        // Fallback: straight-line distance
        const R = 6371;
        const dLat = ((targetPosition.lat - smoothedDriver.lat) * Math.PI) / 180;
        const dLon = ((targetPosition.lng - smoothedDriver.lng) * Math.PI) / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos((smoothedDriver.lat * Math.PI) / 180) * Math.cos((targetPosition.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
        const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        setRouteInfo({ distanceKm: +d.toFixed(1), durationMin: Math.ceil((d / 30) * 60) });
      }
    };

    fetchRoute();
    const interval = setInterval(fetchRoute, 15000);
    return () => clearInterval(interval);
  }, [smoothedDriver?.lat, smoothedDriver?.lng, targetPosition?.lat, targetPosition?.lng]);

  return (
    <div className={`${className} relative`}>
      <LeafletMap
        center={center}
        zoom={14}
        className="w-full h-full"
        showMarker={!!targetPosition && !smoothedDriver}
        markerPosition={targetPosition || undefined}
        driverLocation={smoothedDriver}
        route={route}
      />

      {/* In-app route info overlay */}
      {showRouteInfo && routeInfo && (
        <div className="absolute top-3 left-3 right-3 z-[1000] flex gap-2" dir="rtl">
          <div className="flex-1 bg-card/90 backdrop-blur-md border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground">{routeInfo.distanceKm} كم</span>
          </div>
          <div className="flex-1 bg-card/90 backdrop-blur-md border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground">{routeInfo.durationMin} دقيقة</span>
          </div>
        </div>
      )}

      {showRouteInfo && targetLabel && (
        <div className="absolute bottom-3 left-3 right-3 z-[1000]" dir="rtl">
          <div className="bg-card/90 backdrop-blur-md border border-border rounded-xl px-3 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm text-foreground truncate">{targetLabel}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveOrderMap;
