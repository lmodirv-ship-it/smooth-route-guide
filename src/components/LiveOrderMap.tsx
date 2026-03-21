import { useMemo } from "react";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";
import LeafletMap from "@/components/LeafletMap";
import NavigationLinks from "@/components/NavigationLinks";

interface LiveOrderMapProps {
  className?: string;
  driverPosition?: { lat: number; lng: number } | null;
  targetPosition?: { lat: number; lng: number } | null;
}

const LiveOrderMap = ({ className = "w-full h-full", driverPosition, targetPosition }: LiveOrderMapProps) => {
  const smoothedDriver = useSmoothedPosition(driverPosition);

  const center = useMemo(
    () => smoothedDriver || targetPosition || undefined,
    [smoothedDriver, targetPosition]
  );

  return (
    <div className={`${className} relative`}>
      <LeafletMap
        center={center}
        zoom={14}
        className="w-full h-full"
        showMarker={!!targetPosition}
        markerPosition={targetPosition || undefined}
        driverLocation={smoothedDriver}
      />
      {targetPosition && (
        <NavigationLinks
          lat={targetPosition.lat}
          lng={targetPosition.lng}
          label="الوجهة"
          className="absolute bottom-2 left-2 right-2 z-[1000]"
        />
      )}
    </div>
  );
};

export default LiveOrderMap;
