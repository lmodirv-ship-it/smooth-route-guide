import { DirectionsRenderer, GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigation } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/components/GoogleMap";

const LIBRARIES: ("places")[] = ["places"];
const DEFAULT_CENTER = { lat: 35.7595, lng: -5.8340 };

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1d2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1d2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2f3e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3d4e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

interface LiveOrderMapProps {
  className?: string;
  driverPosition?: { lat: number; lng: number } | null;
  targetPosition?: { lat: number; lng: number } | null;
}

const LiveOrderMap = ({ className = "w-full h-full", driverPosition, targetPosition }: LiveOrderMapProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const center = useMemo(() => driverPosition || targetPosition || DEFAULT_CENTER, [driverPosition, targetPosition]);

  useEffect(() => {
    if (!isLoaded || !driverPosition || !targetPosition) {
      setDirections(null);
      return;
    }

    const service = new google.maps.DirectionsService();
    service.route(
      {
        origin: driverPosition,
        destination: targetPosition,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          setDirections(null);
        }
      }
    );
  }, [driverPosition, isLoaded, targetPosition]);

  useEffect(() => {
    if (!mapRef.current) return;
    const bounds = new google.maps.LatLngBounds();

    if (driverPosition) bounds.extend(driverPosition);
    if (targetPosition) bounds.extend(targetPosition);

    if (driverPosition || targetPosition) {
      mapRef.current.fitBounds(bounds, 64);
    }
  }, [driverPosition, targetPosition, directions]);

  if (loadError) {
    return (
      <div className={`${className} bg-secondary/50 flex items-center justify-center`}>
        <div className="text-center">
          <Navigation className="w-10 h-10 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">تعذر تحميل الخريطة</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`${className} bg-secondary/50 flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">جاري تحميل الخريطة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <GoogleMap
        mapContainerClassName="w-full h-full"
        center={center}
        zoom={14}
        options={{
          styles: darkMapStyle,
          disableDefaultUI: true,
          zoomControl: false,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        }}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {driverPosition && <Marker position={driverPosition} label="س" />}
        {targetPosition && <Marker position={targetPosition} label="و" />}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: "#f59e0b",
                strokeWeight: 5,
                strokeOpacity: 0.95,
              },
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
};

export default LiveOrderMap;
