import { useEffect, useMemo, useRef } from "react";
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

const pickupIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#10b981;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)">
    <div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const destinationIcon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#f97316;border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)">
    <div style="width:8px;height:8px;border-radius:50%;background:#fff"></div>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

interface NearbyDriverMarker {
  id: string;
  lat: number;
  lng: number;
}

interface RoutePoints {
  pickup: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

interface LeafletMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  showMarker?: boolean;
  markerPosition?: { lat: number; lng: number };
  driverLocation?: { lat: number; lng: number } | null;
  nearbyDrivers?: NearbyDriverMarker[];
  route?: RoutePoints | null;
  onMapClick?: (latlng: { lat: number; lng: number }) => void;
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
  route,
  onMapClick,
  children,
}: LeafletMapProps) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const nearbyDriversLayerRef = useRef<L.LayerGroup | null>(null);
  const staticMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const mapCenter = useMemo((): [number, number] => {
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    if (center) return [center.lat, center.lng];
    return DEFAULT_CENTER;
  }, [center, driverLocation]);

  const markerPos = useMemo((): [number, number] => {
    if (markerPosition) return [markerPosition.lat, markerPosition.lng];
    return mapCenter;
  }, [markerPosition, mapCenter]);

  useEffect(() => {
    if (!mapElementRef.current || mapInstanceRef.current) return;

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(mapCenter, zoom);

    const tileLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    });

    tileLayer.addTo(map);
    nearbyDriversLayerRef.current = L.layerGroup().addTo(map);
    routeLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;
    tileLayerRef.current = tileLayer;

    map.on('click', (e: L.LeafletMouseEvent) => {
      if (onMapClick) onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      staticMarkerRef.current = null;
      driverMarkerRef.current = null;
      nearbyDriversLayerRef.current = null;
      routeLayerRef.current = null;
      tileLayerRef.current = null;
      mapInstanceRef.current?.remove();
      mapInstanceRef.current = null;
    };
  }, [mapCenter, zoom]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(mapCenter, zoom, { animate: false });
  }, [mapCenter, zoom]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (showMarker && !driverLocation) {
      if (!staticMarkerRef.current) {
        staticMarkerRef.current = L.marker(markerPos, { icon: defaultIcon }).addTo(mapInstanceRef.current);
      } else {
        staticMarkerRef.current.setLatLng(markerPos);
      }
    } else if (staticMarkerRef.current) {
      staticMarkerRef.current.remove();
      staticMarkerRef.current = null;
    }
  }, [driverLocation, markerPos, showMarker]);

  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (driverLocation) {
      const position: L.LatLngExpression = [driverLocation.lat, driverLocation.lng];
      if (!driverMarkerRef.current) {
        driverMarkerRef.current = L.marker(position, { icon: driverIcon }).addTo(mapInstanceRef.current);
        driverMarkerRef.current.bindPopup("موقع السائق");
      } else {
        driverMarkerRef.current.setLatLng(position);
      }
    } else if (driverMarkerRef.current) {
      driverMarkerRef.current.remove();
      driverMarkerRef.current = null;
    }
  }, [driverLocation]);

  useEffect(() => {
    const layer = nearbyDriversLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    nearbyDrivers.forEach((driver) => {
      L.marker([driver.lat, driver.lng], { icon: carIcon }).addTo(layer);
    });
  }, [nearbyDrivers]);

  // Route rendering with real OSRM road routing
  useEffect(() => {
    const layer = routeLayerRef.current;
    const map = mapInstanceRef.current;
    if (!layer || !map) return;

    layer.clearLayers();
    if (!route) return;

    const { pickup, destination } = route;
    const pickupLatLng: L.LatLngExpression = [pickup.lat, pickup.lng];
    const destLatLng: L.LatLngExpression = [destination.lat, destination.lng];

    L.marker(pickupLatLng, { icon: pickupIcon }).bindPopup("نقطة الانطلاق").addTo(layer);
    L.marker(destLatLng, { icon: destinationIcon }).bindPopup("الوجهة").addTo(layer);

    // Fetch real road route from OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as L.LatLngExpression
          );
          L.polyline(coords, {
            color: "#10b981",
            weight: 5,
            opacity: 0.9,
          }).addTo(layer);
          map.fitBounds(L.latLngBounds(coords as L.LatLngExpression[]).pad(0.2));
        }
      })
      .catch(() => {
        // Fallback to straight line
        L.polyline([pickupLatLng, destLatLng], {
          color: "#10b981",
          weight: 4,
          opacity: 0.8,
          dashArray: "10, 8",
        }).addTo(layer);
        map.fitBounds(L.latLngBounds([pickupLatLng, destLatLng]).pad(0.3));
      });
  }, [route]);

  return (
    <div className={`${className} relative`}>
      <div ref={mapElementRef} className="h-full w-full" />

      {/* OpenStreetMap badge */}
      <div className="absolute bottom-1 left-1 z-[1000] rounded bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
        OSM
      </div>

      {children}
    </div>
  );
};

export default LeafletMap;
