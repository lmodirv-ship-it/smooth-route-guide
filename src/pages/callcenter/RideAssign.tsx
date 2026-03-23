import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Car, MapPin, Star, Check, ArrowLeftRight, Clock, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useFirestoreCollection } from "@/hooks/useFirestoreCollection";

const RideAssign = () => {
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const { data: rideRequests, loading: requestsLoading, refresh: refreshRequests } = useFirestoreCollection<any>({
    table: "ride_requests",
    filters: [{ field: "status", value: "pending" }],
    orderByField: "created_at",
    orderDirection: "desc",
    limitCount: 20,
    realtime: true,
  });

  const { data: drivers, loading: driversLoading, refresh: refreshDrivers } = useFirestoreCollection<any>({
    table: "drivers",
    filters: [{ field: "status", value: "active" }],
    orderByField: "rating",
    orderDirection: "desc",
    limitCount: 20,
    realtime: true,
  });

  const pendingRequests = useMemo(() => rideRequests.map((req) => ({
    ...req,
    client: req.client_name || req.clientName || req.user_name || "عميل",
    phone: req.client_phone || req.clientPhone || req.phone || "—",
    pickup: req.pickup || req.start_location || req.pickup_address || "—",
    dest: req.destination || req.end_location || req.delivery_address || "—",
    price: `${Number(req.price || 0)} DH`,
    time: req.created_at ? new Date(req.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" }) : "—",
    service: req.service || req.type || "عادي",
  })), [rideRequests]);

  const availableDrivers = useMemo(() => drivers.map((driver) => ({
    ...driver,
    id: driver.id,
    name: driver.fullName || driver.name || "سائق",
    car: [driver.vehicleType, driver.vehiclePlate].filter(Boolean).join(" • ") || "مركبة غير محددة",
    plate: driver.vehiclePlate || driver.license_no || "—",
    rating: Number(driver.rating || 0),
    distance: driver.current_lat && driver.current_lng ? "متصل الآن" : "بدون GPS",
    eta: driver.isAvailable === false ? "مشغول" : "متاح",
    trips: Number(driver.totalTrips || 0),
    status: driver.isAvailable === false ? "مشغول" : "متاح",
  })), [drivers]);

  const handleAssign = async () => {
    if (!selectedRequest || !selectedDriver) {
      toast({ title: "اختر الطلب والسائق أولاً", variant: "destructive" });
      return;
    }

    const driver = availableDrivers.find((d) => d.id === selectedDriver);
    const request = pendingRequests.find((r) => r.id === selectedRequest);
    if (!driver || !request) return;

    setAssigning(true);
    const [{ error: requestError }, { error: driverError }] = await Promise.all([
      supabase.from("ride_requests").update({ status: "accepted", driver_id: driver.id }).eq("id", request.id),
      supabase.from("drivers").update({ status: "busy" }).eq("id", driver.id),
    ]);
    setAssigning(false);

    if (requestError || driverError) {
      toast({ title: "تعذر تعيين السائق", variant: "destructive" });
      return;
    }

    toast({ title: `✅ تم تعيين ${driver.name} للطلب` });
    setSelectedRequest(null);
    setSelectedDriver(null);
    void Promise.all([refreshRequests(), refreshDrivers()]);
  };

  const loading = requestsLoading || driversLoading;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        {selectedRequest && selectedDriver && (
          <Button onClick={handleAssign} disabled={assigning} className="gradient-primary text-primary-foreground rounded-xl">
            {assigning ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Check className="w-4 h-4 ml-2" />} تأكيد التعيين
          </Button>
        )}
        <h1 className="text-xl font-bold text-foreground">تعيين السائقين</h1>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-warning" />
              الطلبات المعلقة ({pendingRequests.length})
            </h2>
            <div className="space-y-2">
              {pendingRequests.length === 0 && <div className="gradient-card rounded-xl p-6 border border-border text-sm text-muted-foreground text-center">لا توجد طلبات معلقة</div>}
              {pendingRequests.map((req) => (
                <motion.button key={req.id}
                  onClick={() => setSelectedRequest(req.id)}
                  className={`w-full gradient-card rounded-xl p-4 border text-right transition-all ${
                    selectedRequest === req.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-bold">{req.price}</span>
                      <span className="text-xs bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">{req.service}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-foreground font-medium text-sm">{req.client}</span>
                        <p className="text-xs text-muted-foreground">{req.phone}</p>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground">{req.id.slice(0, 8)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="text-warning">{req.time}</span>
                    <span>•</span>
                    <MapPin className="w-3 h-3 text-success" /> {req.pickup}
                    <Navigation className="w-3 h-3 text-destructive" /> {req.dest}
                  </div>
                  {selectedRequest === req.id && (
                    <div className="mt-2 pt-2 border-t border-border flex gap-2">
                      <Button size="sm" variant="outline" className="text-warning border-warning/30 rounded-lg text-xs flex-1">
                        <ArrowLeftRight className="w-3 h-3 ml-1" /> إعادة تعيين
                      </Button>
                    </div>
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-foreground font-bold text-sm mb-3 flex items-center gap-2">
              <Car className="w-4 h-4 text-success" />
              السائقون المتاحون ({availableDrivers.length})
            </h2>
            <div className="space-y-2">
              {availableDrivers.length === 0 && <div className="gradient-card rounded-xl p-6 border border-border text-sm text-muted-foreground text-center">لا يوجد سائقون متاحون</div>}
              {availableDrivers.map((d) => (
                <motion.button key={d.id}
                  onClick={() => setSelectedDriver(d.id)}
                  className={`w-full gradient-card rounded-xl p-4 border text-right transition-all ${
                    selectedDriver === d.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"
                  }`}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Car className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-warning fill-warning" />
                          <span className="text-xs text-warning">{d.rating.toFixed(1)}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{d.name}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">{d.car} • {d.plate}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="text-info">{d.distance}</span>
                        <span>{d.eta}</span>
                        <span>{d.trips} رحلة</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RideAssign;
