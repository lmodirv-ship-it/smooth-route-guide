import { useMemo, useState } from "react";
import { Car, MapPin, Navigation, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import LeafletMap from "@/components/LeafletMap";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";

const DriversLiveMapCard = () => {
  const { drivers } = useNearbyDrivers();
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) || null,
    [drivers, selectedDriverId],
  );

  return (
    <section className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-success border-success/30 px-3 py-1 text-sm">
          {drivers.length} سائق متصل
        </Badge>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-foreground">الخريطة المباشرة للسائقين</h2>
          <MapPin className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_0.9fr] gap-4">
        <div className="glass-card rounded-xl border border-border overflow-hidden">
          <div className="h-[420px]">
            <LeafletMap
              zoom={11}
              showMarker={false}
              nearbyDrivers={drivers.map((driver) => ({ id: driver.id, lat: driver.lat, lng: driver.lng }))}
            />
          </div>
        </div>

        <div className="glass-card rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <Badge variant="secondary">{selectedDriver ? "تم التحديد" : "مباشر"}</Badge>
            <h3 className="text-sm font-bold text-foreground">السائقون على الخريطة</h3>
          </div>

          <div className="divide-y divide-border/50 max-h-[420px] overflow-auto">
            {drivers.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">لا يوجد سائقون متصلون الآن</div>
            )}

            {drivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => setSelectedDriverId((current) => (current === driver.id ? null : driver.id))}
                className={`w-full p-4 text-right transition-colors ${selectedDriverId === driver.id ? "bg-secondary/60" : "hover:bg-secondary/30"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-warning flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    {driver.rating ? Number(driver.rating).toFixed(1) : "—"}
                  </span>

                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{driver.name}</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {driver.lat.toFixed(4)}, {driver.lng.toFixed(4)}
                      </p>
                    </div>

                    <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                      <Car className="w-4 h-4 text-success" />
                    </div>
                  </div>
                </div>

                {selectedDriverId === driver.id && (
                  <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
                    <span>
                      {driver.lat.toFixed(5)}, {driver.lng.toFixed(5)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Navigation className="w-3 h-3" />
                      إحداثيات السائق
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default DriversLiveMapCard;