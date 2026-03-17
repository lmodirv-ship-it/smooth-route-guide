import { GoogleMap as GoogleMapComponent, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useMemo, useEffect, useRef } from "react";
import { Navigation } from "lucide-react";

// Publishable key for client-side map rendering (restricted by HTTP referrer in Google Cloud Console)
export const GOOGLE_MAPS_API_KEY = "AIzaSyDpJ8TfGwfOa0XvwOyvmFpg-pdkYNSKoRM";

const LIBRARIES: ("places")[] = ["places"];

// Riyadh default center
const DEFAULT_CENTER = { lat: 24.7136, lng: 46.6753 };

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1a1d2e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1d2e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2f3e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1a1d2e" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3d4e" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e1626" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#1a1d2e" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#1a1d2e" }] },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
];

const DRIVER_MARKER_SVG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <circle cx="24" cy="24" r="22" fill="#F97316" stroke="#fff" stroke-width="3"/>
  <circle cx="24" cy="24" r="8" fill="#fff" opacity="0.9"/>
  <circle cx="24" cy="24" r="4" fill="#F97316"/>
  <circle cx="24" cy="24" r="22" fill="none" stroke="#F97316" stroke-width="2" opacity="0.3">
    <animate attributeName="r" from="22" to="30" dur="1.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" from="0.3" to="0" dur="1.5s" repeatCount="indefinite"/>
  </circle>
</svg>
`)}`;

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  showMarker?: boolean;
  markerPosition?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number } | null;
  panToDriver?: boolean;
  children?: React.ReactNode;
}

const GoogleMapWrapper = ({
  center,
  zoom = 14,
  className = "w-full h-full",
  showMarker = true,
  markerPosition,
  driverLocation,
  panToDriver = false,
  children,
}: GoogleMapProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const mapCenter = useMemo(() => {
    if (driverLocation && panToDriver) return driverLocation;
    return center || DEFAULT_CENTER;
  }, [center, driverLocation, panToDriver]);

  const markerPos = useMemo(() => markerPosition || mapCenter, [markerPosition, mapCenter]);

  const mapOptions = useMemo(
    () => ({
      styles: darkMapStyle,
      disableDefaultUI: true,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
    }),
    []
  );

  // Smooth pan to driver location
  useEffect(() => {
    if (mapRef.current && driverLocation && panToDriver) {
      mapRef.current.panTo(driverLocation);
    }
  }, [driverLocation, panToDriver]);

  const driverIcon = useMemo(() => {
    if (!isLoaded || !driverLocation) return undefined;
    return {
      url: DRIVER_MARKER_SVG,
      scaledSize: new google.maps.Size(48, 48),
      anchor: new google.maps.Point(24, 24),
    };
  }, [isLoaded, driverLocation]);

  if (loadError) {
    return (
      <div className={`${className} bg-secondary/50 flex items-center justify-center`}>
        <div className="text-center">
          <Navigation className="w-10 h-10 text-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">خطأ في تحميل الخريطة</p>
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
    <div className={`${className} relative`}>
      <GoogleMapComponent
        mapContainerClassName="w-full h-full"
        center={mapCenter}
        zoom={zoom}
        options={mapOptions}
        onLoad={(map) => { mapRef.current = map; }}
      >
        {showMarker && !driverLocation && <Marker position={markerPos} />}
        {driverLocation && (
          <Marker
            position={driverLocation}
            icon={driverIcon}
          />
        )}
      </GoogleMapComponent>
      {children}
    </div>
  );
};

export default GoogleMapWrapper;
