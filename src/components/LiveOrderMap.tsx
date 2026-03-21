import { DirectionsRenderer, GoogleMap, Marker, OverlayView, useJsApiLoader } from "@react-google-maps/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { GOOGLE_MAPS_API_KEY } from "@/components/GoogleMap";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";

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

const DRIVER_CAR_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <circle cx="22" cy="22" r="20" fill="#111827" stroke="#f59e0b" stroke-width="2" />
  <path d="M13 25v-5.5c0-1.3.9-2.4 2.2-2.7l3.5-.8c.5-1.5 1.8-2.5 3.4-2.5h2c1.6 0 3 .9 3.6 2.4l3.8.9c1.3.3 2.2 1.4 2.2 2.7V25c0 1.1-.9 2-2 2h-1.1a3.4 3.4 0 0 1-6.5 0h-7.2a3.4 3.4 0 0 1-6.5 0H15c-1.1 0-2-.9-2-2Zm7.5-8.1-.6 1.7h8.1l-.7-1.8a1.4 1.4 0 0 0-1.3-.8h-4.1c-.6 0-1.1.4-1.4.9Z" fill="#f59e0b"/>
  <circle cx="17.8" cy="27.1" r="1.8" fill="#fff"/>
  <circle cx="28.2" cy="27.1" r="1.8" fill="#fff"/>
</svg>
`)}`;

const DESTINATION_PIN_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="42" height="42" viewBox="0 0 42 42">
  <path d="M21 4c-5.8 0-10.5 4.7-10.5 10.5 0 7.8 10.5 19.5 10.5 19.5S31.5 22.3 31.5 14.5C31.5 8.7 26.8 4 21 4Z" fill="#f59e0b" stroke="#fff" stroke-width="2"/>
  <circle cx="21" cy="14.5" r="4.5" fill="#fff"/>
</svg>
`)}`;

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

  const routeMeta = useMemo(() => {
    const leg = directions?.routes?.[0]?.legs?.[0];
    return {
      distance: leg?.distance?.text ?? null,
      duration: leg?.duration?.text ?? null,
    };
  }, [directions]);

  const driverIcon = useMemo(() => {
    if (!isLoaded || !driverPosition) return undefined;
    return {
      url: DRIVER_CAR_SVG,
      scaledSize: new google.maps.Size(44, 44),
      anchor: new google.maps.Point(22, 22),
    };
  }, [isLoaded, driverPosition]);

  const destinationIcon = useMemo(() => {
    if (!isLoaded || !targetPosition) return undefined;
    return {
      url: DESTINATION_PIN_SVG,
      scaledSize: new google.maps.Size(42, 42),
      anchor: new google.maps.Point(21, 38),
    };
  }, [isLoaded, targetPosition]);

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
    if (!mapRef.current || !isLoaded) return;
    const bounds = new google.maps.LatLngBounds();

    if (driverPosition) bounds.extend(driverPosition);
    if (targetPosition) bounds.extend(targetPosition);

    if (driverPosition || targetPosition) {
      mapRef.current.fitBounds(bounds, 64);
    }
  }, [driverPosition, isLoaded, targetPosition, directions]);

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
        {driverPosition && <Marker position={driverPosition} icon={driverIcon} />}
        {targetPosition && <Marker position={targetPosition} icon={destinationIcon} />}
        {directions && (
          <>
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
            {targetPosition && routeMeta.distance && (
              <OverlayView
                position={targetPosition}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={(width, height) => ({ x: -(width / 2), y: -(height + 18) })}
              >
                <div className="pointer-events-none flex items-center gap-2 rounded-full border border-border bg-background/95 px-3 py-1.5 shadow-lg backdrop-blur-sm">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">
                    {routeMeta.distance}
                    {routeMeta.duration ? ` • ${routeMeta.duration}` : ""}
                  </span>
                </div>
              </OverlayView>
            )}
          </>
        )}
      </GoogleMap>
    </div>
  );
};

export default LiveOrderMap;
