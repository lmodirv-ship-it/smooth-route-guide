import { GoogleMap as GoogleMapComponent, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useMemo } from "react";
import { Navigation } from "lucide-react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

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

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  showMarker?: boolean;
  markerPosition?: { lat: number; lng: number };
  children?: React.ReactNode;
}

const GoogleMapWrapper = ({
  center,
  zoom = 14,
  className = "w-full h-full",
  showMarker = true,
  markerPosition,
  children,
}: GoogleMapProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const mapCenter = useMemo(() => center || DEFAULT_CENTER, [center]);
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
      >
        {showMarker && <Marker position={markerPos} />}
      </GoogleMapComponent>
      {children}
    </div>
  );
};

export default GoogleMapWrapper;
