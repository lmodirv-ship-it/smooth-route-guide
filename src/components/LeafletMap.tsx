import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Maximize2, Minimize2, Palette } from "lucide-react";

const DEFAULT_CENTER: [number, number] = [35.7595, -5.8340];

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
  html: `<div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#F97316,#ea580c);border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(249,115,22,0.5)">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H6.3a2 2 0 0 0-1.6.9L2 9.5 .5 11.1C.2 11.4 0 11.7 0 12v4c0 .6.4 1 1 1h1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
  </div>`,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

const carIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#1e293b,#334155);border:2px solid #F97316;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.4)">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2.7-3.6A2 2 0 0 0 13.7 5H6.3a2 2 0 0 0-1.6.9L2 9.5 .5 11.1C.2 11.4 0 11.7 0 12v4c0 .6.4 1 1 1h1"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const customerIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#2563eb);border:3px solid #fff;display:flex;align-items:center;justify-content:center;box-shadow:0 3px 12px rgba(59,130,246,0.5)">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
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

const TILE_THEMES = {
  light: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    label: "فاتح",
  },
  dark: {
    url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
    label: "داكن",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    label: "قمر صناعي",
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    label: "تضاريس",
  },
};

type ThemeKey = keyof typeof TILE_THEMES;

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
  /** Allow parent to control expanded state */
  expandable?: boolean;
  onExpandChange?: (expanded: boolean) => void;
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
  expandable = true,
  onExpandChange,
  children,
}: LeafletMapProps) => {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const nearbyDriversLayerRef = useRef<L.LayerGroup | null>(null);
  const staticMarkerRef = useRef<L.Marker | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);

  const [theme, setTheme] = useState<ThemeKey>("light");
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const mapCenter = useMemo((): [number, number] => {
    if (driverLocation) return [driverLocation.lat, driverLocation.lng];
    if (center) return [center.lat, center.lng];
    return DEFAULT_CENTER;
  }, [center, driverLocation]);

  const markerPos = useMemo((): [number, number] => {
    if (markerPosition) return [markerPosition.lat, markerPosition.lng];
    return mapCenter;
  }, [markerPosition, mapCenter]);

  // Switch tile theme
  const switchTheme = useCallback((newTheme: ThemeKey) => {
    setTheme(newTheme);
    setShowThemeMenu(false);
    if (tileLayerRef.current && mapInstanceRef.current) {
      tileLayerRef.current.setUrl(TILE_THEMES[newTheme].url);
    }
  }, []);

  const toggleExpand = useCallback(() => {
    const next = !isExpanded;
    setIsExpanded(next);
    onExpandChange?.(next);
    // Invalidate map size after transition
    setTimeout(() => mapInstanceRef.current?.invalidateSize(), 350);
  }, [isExpanded, onExpandChange]);

  useEffect(() => {
    if (!mapElementRef.current || mapInstanceRef.current) return;

    const map = L.map(mapElementRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView(mapCenter, zoom);

    const tileLayer = L.tileLayer(TILE_THEMES[theme].url, {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
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
      const icon = nearbyDrivers.length > 0 || !driverLocation ? customerIcon : defaultIcon;
      if (!staticMarkerRef.current) {
        staticMarkerRef.current = L.marker(markerPos, { icon }).addTo(mapInstanceRef.current);
      } else {
        staticMarkerRef.current.setLatLng(markerPos);
        staticMarkerRef.current.setIcon(icon);
      }
    } else if (staticMarkerRef.current) {
      staticMarkerRef.current.remove();
      staticMarkerRef.current = null;
    }
  }, [driverLocation, markerPos, showMarker, nearbyDrivers.length]);

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

    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;

    fetch(osrmUrl)
      .then((res) => res.json())
      .then((data) => {
        if (data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(
            (c: [number, number]) => [c[1], c[0]] as L.LatLngExpression
          );
          L.polyline(coords, { color: "#10b981", weight: 5, opacity: 0.9 }).addTo(layer);
          map.fitBounds(L.latLngBounds(coords as L.LatLngExpression[]).pad(0.2));
        }
      })
      .catch(() => {
        L.polyline([pickupLatLng, destLatLng], { color: "#10b981", weight: 4, opacity: 0.8, dashArray: "10, 8" }).addTo(layer);
        map.fitBounds(L.latLngBounds([pickupLatLng, destLatLng]).pad(0.3));
      });
  }, [route]);

  return (
    <div className={`${className} relative`}>
      <div ref={mapElementRef} className="h-full w-full" />

      {/* Map controls */}
      <div className="absolute top-2 left-2 z-[1000] flex flex-col gap-1.5">
        {/* Theme toggle */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="w-9 h-9 rounded-xl glass-card border border-border/50 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            title="تغيير مظهر الخريطة"
          >
            <Palette className="w-4 h-4 text-foreground" />
          </button>
          {showThemeMenu && (
            <div className="absolute top-10 left-0 glass-card rounded-xl border border-border/50 shadow-xl p-1.5 min-w-[100px] z-[1001]">
              {(Object.keys(TILE_THEMES) as ThemeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => switchTheme(key)}
                  className={`w-full text-right px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    theme === key
                      ? "bg-primary/20 text-primary"
                      : "text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {TILE_THEMES[key].label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Expand/Collapse */}
        {expandable && (
          <button
            onClick={toggleExpand}
            className="w-9 h-9 rounded-xl glass-card border border-border/50 flex items-center justify-center shadow-lg hover:shadow-xl transition-all"
            title={isExpanded ? "تصغير" : "توسيع"}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4 text-foreground" /> : <Maximize2 className="w-4 h-4 text-foreground" />}
          </button>
        )}
      </div>

      {/* OSM badge */}
      <div className="absolute bottom-1 left-1 z-[1000] rounded bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur-sm">
        OSM
      </div>

      {children}
    </div>
  );
};

export default LeafletMap;
