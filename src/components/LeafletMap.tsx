import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_CENTER: [number, number] = [35.7595, -5.8340];

// Fix default marker icons for Leaflet
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const driverIcon = L.divIcon({
  className: "",
  html: `<div style="width:40px;height:40px;border-radius:50%;background:#F97316;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)">
    <div style="width:12px;height:12px;border-radius:50%;background:#fff"></div>
  </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

const carIcon = L.divIcon({
  className: "",
  html: `<div style="width:32px;height:32px;border-radius:50%;background:#1a1d2e;border:2px solid #F97316;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)">
    <div style="width:10px;height:10px;border-radius:50%;background:#F97316"></div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface NearbyDriverMarker {
  id: string;
  lat: number;
  lng: number;
}

interface LeafletMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  showMarker?: boolean;
  markerPosition?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number } | null;
  nearbyDrivers?: NearbyDriverMarker[];
  children?: React.ReactNode;
}

const LeafletMap = ({
  center,
  zoom = 14,
  className = "w-full h-full",
  showMarker = true,
  markerPosition,
  driverLocation,
  nearbyDrivers = [],
  children,
}: LeafletMapProps) => {
  const mapCenter = useMemo((): [number, number] => {
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    if (center) return [center.lat, center.lng];
    return DEFAULT_CENTER;
  }, [center, driverLocation]);

  const markerPos = useMemo((): [number, number] => {
    if (markerPosition) return [markerPosition.lat, markerPosition.lng];
    return mapCenter;
  }, [markerPosition, mapCenter]);

  return (
    <div className={`${className} relative`}>
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        className="w-full h-full"
        zoomControl={false}
        attributionControl={false}
        style={{ background: "#1a1d2e" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        />

        {showMarker && !driverLocation && (
          <Marker position={markerPos} icon={defaultIcon} />
        )}

        {driverLocation && (
          <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon}>
            <Popup>موقع السائق</Popup>
          </Marker>
        )}

        {nearbyDrivers.map((d) => (
          <Marker key={d.id} position={[d.lat, d.lng]} icon={carIcon} />
        ))}
      </MapContainer>

      {/* OpenStreetMap badge */}
      <div className="absolute bottom-1 left-1 z-[1000] rounded bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
        OSM
      </div>

      {children}
    </div>
  );
};

export default LeafletMap;
