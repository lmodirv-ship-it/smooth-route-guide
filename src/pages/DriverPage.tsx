import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Loader2, CheckCircle, Car, Radar, MapPin, Clock, ArrowLeft, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";

const DEFAULT_LOCATION = { lat: 35.7595, lng: -5.834 };
const PRICE_PER_KM = 3;
const BASE_FARE = 5;
const MAX_RADIUS_KM = 10;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function detectCity(loc: { lat: number; lng: number }): string {
  if (loc.lat > 35.6 && loc.lat < 35.85 && loc.lng > -5.95 && loc.lng < -5.7) return "طنجة";
  if (loc.lat > 35.5 && loc.lat < 35.65 && loc.lng > -5.45 && loc.lng < -5.2) return "تطوان";
  if (loc.lat > 33.95 && loc.lat < 34.1 && loc.lng > -6.9 && loc.lng < -6.7) return "الرباط";
  if (loc.lat > 33.5 && loc.lat < 33.7 && loc.lng > -7.7 && loc.lng < -7.4) return "الدار البيضاء";
  if (loc.lat > 31.55 && loc.lat < 31.7 && loc.lng > -8.1 && loc.lng < -7.9) return "مراكش";
  if (loc.lat > 33.95 && loc.lat < 34.15 && loc.lng > -5.05 && loc.lng < -4.9) return "فاس";
  return "منطقتك";
}

interface RideRow {
  id: string;
  pickup: string;
  destination: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  distance: number | null;
  price: number | null;
  status: string;
  created_at: string;
}

const DriverPage = () => {
  const navigate = useNavigate();
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [orders, setOrders] = useState<RideRow[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);

  // Continuous GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setDriverLocation(DEFAULT_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setDriverLocation(DEFAULT_LOCATION),
      { enableHighAccuracy: true, timeout: 10000 }
    );
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // Sync location to DB
  useEffect(() => {
    if (!driverLocation) return;
    const updateLoc = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("drivers")
        .update({
          current_lat: driverLocation.lat,
          current_lng: driverLocation.lng,
          location_updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    };
    const t = setTimeout(updateLoc, 1000);
    return () => clearTimeout(t);
  }, [driverLocation]);

  // Fetch pending orders + realtime
  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!error && data) setOrders(data as RideRow[]);
  }, []);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("driver-ride-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  // Filter & enrich nearby orders
  const nearbyOrders = useMemo(() => {
    return orders
      .map((order) => {
        let distToPickup: number | null = null;
        let eta: number | null = null;

        if (driverLocation && order.pickup_lat && order.pickup_lng) {
          distToPickup = parseFloat(haversineKm(driverLocation, { lat: order.pickup_lat, lng: order.pickup_lng }).toFixed(1));
          eta = Math.max(1, Math.round(distToPickup * 2.5));
        }

        let rideDistance: number | null = order.distance;
        if (!rideDistance && order.pickup_lat && order.pickup_lng && order.destination_lat && order.destination_lng) {
          rideDistance = parseFloat(
            haversineKm(
              { lat: order.pickup_lat, lng: order.pickup_lng },
              { lat: order.destination_lat, lng: order.destination_lng }
            ).toFixed(2)
          );
        }

        const totalDistance = (distToPickup || 0) + (rideDistance || 0);
        const totalPrice = totalDistance > 0 ? Math.round(BASE_FARE + totalDistance * PRICE_PER_KM) : (order.price || 0);

        return { ...order, distToPickup, eta, totalDistance: parseFloat(totalDistance.toFixed(1)), totalPrice, rideDistance };
      })
      .filter((o) => o.distToPickup === null || o.distToPickup <= MAX_RADIUS_KM)
      .sort((a, b) => (a.distToPickup ?? 999) - (b.distToPickup ?? 999));
  }, [orders, driverLocation]);

  const handleAccept = async (orderId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "يجب تسجيل الدخول", variant: "destructive" });
      return;
    }
    setAccepting(orderId);
    try {
      const { error } = await supabase
        .from("ride_requests")
        .update({ status: "accepted", driver_id: user.id, accepted_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("status", "pending");
      if (error) throw error;
      toast({ title: "تم قبول الطلب ✅" });
      navigate(`/driver-tracking?id=${orderId}`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setAccepting(null);
    }
  };

  const cityName = driverLocation ? detectCity(driverLocation) : "جارٍ التحديد...";

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a]" dir="rtl">
      {/* ─── Mini Map (30%) ─── */}
      <div className="relative h-[30vh] min-h-[200px] shrink-0">
        <LeafletMap
          center={driverLocation || DEFAULT_LOCATION}
          zoom={14}
          showMarker
          driverLocation={driverLocation}
          className="w-full h-full"
        />

        {/* Top bar overlay */}
        <div className="absolute top-0 inset-x-0 z-[1000] bg-gradient-to-b from-black/60 to-transparent px-4 pt-3 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Car className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">وضع السائق</p>
                <p className="text-emerald-400 text-[11px]">متصل</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
              <Radar className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs text-white/90">{cityName}</span>
            </div>
          </div>
        </div>

        {/* Bottom radius badge */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-xs flex items-center gap-2 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          نطاق البحث: {MAX_RADIUS_KM} كم
        </div>
      </div>

      {/* ─── Requests Feed (70%) ─── */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Section header */}
        <div className="px-5 py-3 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
            {nearbyOrders.length}
          </div>
          <h2 className="text-white font-bold flex items-center gap-2">
            <Route className="w-4 h-4 text-emerald-400" />
            الرحلات المتاحة
          </h2>
        </div>

        {/* Scrollable feed */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {nearbyOrders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/15">
                <Radar className="w-10 h-10 text-emerald-500/30" />
              </div>
              <p className="text-white/70 font-medium text-lg">لا توجد رحلات في منطقتك</p>
              <p className="text-white/30 text-sm mt-1">الرحلات القريبة ستظهر هنا تلقائياً</p>
            </motion.div>
          ) : (
            <AnimatePresence mode="popLayout">
              {nearbyOrders.map((order, idx) => (
                <TripCard
                  key={order.id}
                  order={order}
                  index={idx}
                  accepting={accepting === order.id}
                  onAccept={() => handleAccept(order.id)}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─── Trip Card Component ─── */
interface TripCardProps {
  order: {
    id: string;
    pickup: string;
    destination: string;
    distToPickup: number | null;
    eta: number | null;
    totalDistance: number;
    totalPrice: number | null;
    rideDistance: number | null;
  };
  index: number;
  accepting: boolean;
  onAccept: () => void;
}

const TripCard = ({ order, index, accepting, onAccept }: TripCardProps) => (
  <motion.div
    initial={{ opacity: 0, y: 24 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, x: -100 }}
    transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 30 }}
    className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] backdrop-blur-sm overflow-hidden"
  >
    {/* Route section */}
    <div className="p-4 pb-3">
      <div className="flex gap-3">
        {/* Route dots */}
        <div className="flex flex-col items-center pt-1 gap-0.5">
          <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_8px_hsl(155,70%,50%,0.4)]" />
          <div className="w-px h-8 bg-gradient-to-b from-emerald-400/60 to-orange-400/60" />
          <div className="w-3 h-3 rounded-full bg-orange-400 shadow-[0_0_8px_hsl(30,80%,55%,0.4)]" />
        </div>

        {/* Addresses */}
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-emerald-400/70 font-medium">نقطة الانطلاق</p>
            <p className="text-sm text-white/90 leading-tight">{order.pickup || "غير محدد"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-orange-400/70 font-medium">الوجهة</p>
            <p className="text-sm text-white/90 leading-tight">{order.destination || "غير محدد"}</p>
          </div>
        </div>
      </div>
    </div>

    {/* Stats bar */}
    <div className="flex items-center gap-1 px-4 py-2.5 bg-white/[0.02] border-t border-white/[0.04]">
      <StatPill icon={MapPin} label="بُعدك" value={order.distToPickup != null ? `${order.distToPickup} كم` : "—"} accent="text-yellow-400" />
      <div className="w-px h-5 bg-white/10" />
      <StatPill icon={Route} label="المسافة" value={`${order.totalDistance} كم`} accent="text-emerald-400" />
      <div className="w-px h-5 bg-white/10" />
      <StatPill icon={Clock} label="ETA" value={order.eta ? `${order.eta} د` : "—"} accent="text-blue-400" />
    </div>

    {/* Price + Accept */}
    <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/[0.04] border-t border-emerald-500/10">
      <Button
        onClick={onAccept}
        disabled={accepting}
        className="h-11 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-[0_4px_20px_hsl(155,70%,40%,0.25)] transition-all hover:shadow-[0_4px_25px_hsl(155,70%,40%,0.4)] active:scale-[0.97]"
      >
        {accepting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <CheckCircle className="w-4 h-4 ml-1.5" />
            قبول الرحلة
          </>
        )}
      </Button>

      <div className="text-left">
        <p className="text-[10px] text-white/40">الأجرة</p>
        <p className="text-xl font-black text-emerald-400 tracking-tight">
          {order.totalPrice || "—"} <span className="text-xs font-medium text-emerald-400/60">DH</span>
        </p>
      </div>
    </div>
  </motion.div>
);

/* ─── Stat Pill ─── */
const StatPill = ({ icon: Icon, label, value, accent }: { icon: typeof MapPin; label: string; value: string; accent: string }) => (
  <div className="flex-1 text-center">
    <div className="flex items-center justify-center gap-1">
      <Icon className={`w-3 h-3 ${accent}`} />
      <span className="text-[10px] text-white/40">{label}</span>
    </div>
    <p className={`text-xs font-bold ${accent} mt-0.5`}>{value}</p>
  </div>
);

export default DriverPage;
