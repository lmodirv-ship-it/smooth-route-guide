/**
 * GoogleMapWrapper — now fully backed by LeafletMap (OpenStreetMap).
 * Keeps the same public API so all consumers work without changes.
 */
import LeafletMap from "@/components/LeafletMap";

export const GOOGLE_MAPS_API_KEY = ""; // intentionally empty — no longer used

interface NearbyDriverMarker {
  id: string;
  lat: number;
  lng: number;
}

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  showMarker?: boolean;
  markerPosition?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number } | null;
  panToDriver?: boolean;
  nearbyDrivers?: NearbyDriverMarker[];
  children?: React.ReactNode;
}

const GoogleMapWrapper = ({
  center,
  zoom = 14,
  className = "w-full h-full",
  showMarker = true,
  markerPosition,
  driverLocation,
  nearbyDrivers = [],
  children,
}: GoogleMapProps) => {
  return (
    <LeafletMap
      center={center}
      zoom={zoom}
      className={className}
      showMarker={showMarker}
      markerPosition={markerPosition}
      driverLocation={driverLocation}
      nearbyDrivers={nearbyDrivers}
    >
      {children}
    </LeafletMap>
  );
};

export default GoogleMapWrapper;
