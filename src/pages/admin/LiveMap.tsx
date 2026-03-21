import { useState } from "react";
import { MapPin, Car, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import LeafletMap from "@/components/LeafletMap";

const AdminLiveMap = () => {
  const { drivers } = useNearbyDrivers();
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const selected = drivers.find(d => d.id === selectedDriver);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-success border-success/30 text-sm px-3 py-1">{drivers.length} سائق متصل</Badge>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">الخريطة المباشرة</h1>
          <MapPin className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Map */}
        <div className="lg:col-span-3 gradient-card rounded-xl border border-border overflow-hidden">
          <div className="h-[600px]">
            <LeafletMap zoom={11} showMarker={false} nearbyDrivers={drivers.map(d => ({ id: d.id, lat: d.lat, lng: d.lng }))} />
          </div>
        </div>

        {/* Driver List */}
        <div className="gradient-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-bold text-foreground text-right text-sm">السائقون المتصلون</h3>
          </div>
          <div className="divide-y divide-border/50 max-h-[540px] overflow-auto">
            {drivers.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">لا يوجد سائقون متصلون</div>}
            {drivers.map(d => (
              <button key={d.id} onClick={() => setSelectedDriver(d.id === selectedDriver ? null : d.id)}
                className={`w-full p-3 text-right hover:bg-secondary/30 transition-colors ${selectedDriver === d.id ? "bg-secondary/50" : ""}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-warning flex items-center gap-1"><Star className="w-3 h-3" />{d.rating || "—"}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground font-medium">{d.name}</span>
                    <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center"><Car className="w-4 h-4 text-success" /></div>
                  </div>
                </div>
                {selectedDriver === d.id && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <p>الموقع: {d.lat.toFixed(4)}, {d.lng.toFixed(4)}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLiveMap;
