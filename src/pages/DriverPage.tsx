import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Radar, MapPin, Clock, Route, Loader2, CheckCircle, TrendingUp, Wallet, Star, Navigation, Volume2, Percent, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import BottomNav from "@/components/BottomNav";
import { notifyNewOrder, unlockAudio } from "@/lib/notificationSound";
import { driverNetEarnings, COMMISSION_RATE } from "@/lib/pricing";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { useI18n } from "@/i18n/context";

const DEFAULT_LOCATION = { lat: 35.7595, lng: -5.834 };
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
  const pricing = usePricingSettings();
  const { t, dir } = useI18n();
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [orders, setOrders] = useState<RideRow[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState({ trips: 0, earnings: 0, rating: 0 });
  const [driverName, setDriverName] = useState("السائق");
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [driverType, setDriverType] = useState<string>("ride");
  const prevOrderCountRef = useRef(0);
  const initialLoadRef = useRef(true);

  // Check for active ride & fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile name
      const { data: profile } = await supabase.from("profiles").select("name").eq("id", user.id).single();
      if (profile?.name) setDriverName(profile.name);

      // Check if driver has an active (non-completed/cancelled) ride
      const { data: activeRides } = await supabase
        .from("ride_requests")
        .select("id, status")
        .eq("driver_id", user.id)
        .in("status", ["accepted", "in_progress", "arriving"])
        .limit(1);

      if (activeRides && activeRides.length > 0) {
        setActiveRideId(activeRides[0].id);
      } else {
        setActiveRideId(null);
      }

      // Today's completed rides
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: completedRides } = await supabase
        .from("ride_requests")
        .select("id, price")
        .eq("driver_id", user.id)
        .eq("status", "completed")
        .gte("created_at", todayStart.toISOString());

      const trips = completedRides?.length || 0;
      const grossEarnings = completedRides?.reduce((sum, r) => sum + (Number(r.price) || 0), 0) || 0;
      const earnings = driverNetEarnings(grossEarnings);

      // Rating + driver_type
      const { data: driverData } = await supabase
        .from("drivers")
        .select("rating, driver_type")
        .eq("user_id", user.id)
        .single();

      if (driverData?.driver_type) setDriverType(driverData.driver_type);

      setTodayStats({
        trips,
        earnings,
        rating: Number(driverData?.rating) || 0,
      });
    };
    fetchStats();
  }, []);

  // Continuous GPS
  useEffect(() => {
    if (!navigator.geolocation) { setDriverLocation(DEFAULT_LOCATION); return; }
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
      await supabase.from("drivers").update({
        current_lat: driverLocation.lat,
        current_lng: driverLocation.lng,
        location_updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    };
    const t = setTimeout(updateLoc, 1000);
    return () => clearTimeout(t);
  }, [driverLocation]);

  // Fetch pending orders + realtime
  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("ride_requests").select("*").eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const newCount = data.length;
      // Play sound only if new orders appeared (not on initial load)
      if (!initialLoadRef.current && newCount > prevOrderCountRef.current && soundEnabled) {
        notifyNewOrder();
      }
      initialLoadRef.current = false;
      prevOrderCountRef.current = newCount;
      setOrders(data as RideRow[]);
    }
  }, [soundEnabled]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("driver-ride-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  // Enrich orders
  const nearbyOrders = useMemo(() => {
    return orders.map((order) => {
      let distToPickup: number | null = null;
      let eta: number | null = null;
      if (driverLocation && order.pickup_lat && order.pickup_lng) {
        distToPickup = parseFloat(haversineKm(driverLocation, { lat: order.pickup_lat, lng: order.pickup_lng }).toFixed(1));
        eta = Math.max(1, Math.round(distToPickup * 2.5));
      }
      let rideDistance: number | null = order.distance;
      if (!rideDistance && order.pickup_lat && order.pickup_lng && order.destination_lat && order.destination_lng) {
        rideDistance = parseFloat(haversineKm(
          { lat: order.pickup_lat, lng: order.pickup_lng },
          { lat: order.destination_lat, lng: order.destination_lng }
        ).toFixed(2));
      }
      const totalDistance = (distToPickup || 0) + (rideDistance || 0);
      const totalPrice = totalDistance > 0 ? Math.max(pricing.minFare, Math.round(pricing.baseFare + totalDistance * pricing.perKmRate)) : (order.price || 0);
      return { ...order, distToPickup, eta, totalDistance: parseFloat(totalDistance.toFixed(1)), totalPrice, rideDistance };
    })
    .filter((o) => o.distToPickup === null || o.distToPickup <= MAX_RADIUS_KM)
    .sort((a, b) => (a.distToPickup ?? 999) - (b.distToPickup ?? 999));
  }, [orders, driverLocation, pricing.minFare, pricing.baseFare, pricing.perKmRate]);

  const selectedOrder = useMemo(() => nearbyOrders.find(o => o.id === selectedOrderId) || null, [nearbyOrders, selectedOrderId]);

  const route = useMemo(() => {
    if (!selectedOrder || !selectedOrder.pickup_lat || !selectedOrder.pickup_lng || !selectedOrder.destination_lat || !selectedOrder.destination_lng) return null;
    return {
      pickup: { lat: selectedOrder.pickup_lat, lng: selectedOrder.pickup_lng },
      destination: { lat: selectedOrder.destination_lat, lng: selectedOrder.destination_lng },
    };
  }, [selectedOrder]);

  const handleAccept = async (orderId: string) => {
    if (activeRideId) {
      toast({ title: "لديك رحلة نشطة بالفعل", description: "أكمل الرحلة الحالية أولاً", variant: "destructive" });
      navigate(`/driver/tracking?id=${activeRideId}`);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: "يجب تسجيل الدخول", variant: "destructive" }); return; }
    setAccepting(orderId);
    try {
      // Calculate total price including driver→pickup distance
      const order = nearbyOrders.find(o => o.id === orderId);
      const totalPrice = order ? order.totalPrice : 0;

      const { error } = await supabase.from("ride_requests")
        .update({
          status: "accepted",
          driver_id: user.id,
          accepted_at: new Date().toISOString(),
          price: totalPrice,
        })
        .eq("id", orderId).eq("status", "pending");
      if (error) throw error;
      setActiveRideId(orderId);
      toast({ title: "تم قبول الطلب ✅", description: `السعر: ${totalPrice} DH` });
      navigate(`/driver/tracking?id=${orderId}`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally { setAccepting(null); }
  };

  const cityName = driverLocation ? detectCity(driverLocation) : "جارٍ التحديد...";

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a]" dir="rtl" onClick={() => unlockAudio()}>
      {/* Map */}
      <div className="relative h-[30vh] min-h-[200px] shrink-0">
        <LeafletMap
          center={driverLocation || DEFAULT_LOCATION}
          zoom={14}
          showMarker
          driverLocation={driverLocation}
          route={route}
          className="w-full h-full"
        />
        {/* Top overlay */}
        <div className="absolute top-0 inset-x-0 z-[1000] bg-gradient-to-b from-black/70 to-transparent px-4 pt-3 pb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                <Car className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{driverName}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <p className="text-emerald-400 text-[11px]">متصل</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
              <Radar className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="text-xs text-white/90">{cityName}</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/60 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-xs flex items-center gap-2 border border-white/10">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          نطاق البحث: {MAX_RADIUS_KM} كم
        </div>
      </div>

      {/* Stats bar */}
      <div className="shrink-0 px-4 py-3 border-b border-white/5 bg-[#0d1320]">
        <div className="grid grid-cols-4 gap-2">
          <StatsCard icon={TrendingUp} label="رحلات اليوم" value={`${todayStats.trips}`} accent="text-emerald-400" bg="bg-emerald-500/10" />
          <StatsCard icon={Wallet} label="صافي الأرباح" value={`${todayStats.earnings} DH`} accent="text-orange-400" bg="bg-orange-500/10" />
          <StatsCard icon={Percent} label="عمولة المنصة" value={`${Math.round(COMMISSION_RATE * 100)}%`} accent="text-red-400" bg="bg-red-500/10" />
          <StatsCard icon={Star} label="التقييم" value={todayStats.rating > 0 ? todayStats.rating.toFixed(1) : "—"} accent="text-yellow-400" bg="bg-yellow-500/10" />
        </div>
      </div>

      {/* Orders Table */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-5 py-2.5 flex items-center justify-between border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
              {nearbyOrders.length}
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-1.5 rounded-full transition-colors ${
                soundEnabled ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-white/30"
              }`}
              title={soundEnabled ? "إيقاف الصوت" : "تشغيل الصوت"}
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <Route className="w-4 h-4 text-emerald-400" />
            الرحلات المتاحة
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Delivery driver banner */}
          {(driverType === "delivery" || driverType === "both") && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-3 p-3 rounded-xl bg-info/10 border border-info/30 flex items-center justify-between"
            >
              <Button
                size="sm"
                onClick={() => navigate("/driver/delivery")}
                className="h-8 px-4 rounded-lg bg-info hover:bg-info/80 text-white text-xs font-bold"
              >
                <Package className="w-3.5 h-3.5 ml-1" />
                طلبات التوصيل
              </Button>
              <div className="text-right">
                <p className="text-info font-bold text-sm">خدمة الطلبيات</p>
                <p className="text-white/40 text-[11px]">عرض وقبول طلبات توصيل الطلبيات</p>
              </div>
            </motion.div>
          )}
          {/* Active ride banner */}
          {activeRideId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mt-3 p-3 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-between"
            >
              <Button
                size="sm"
                onClick={() => navigate(`/driver/tracking?id=${activeRideId}`)}
                className="h-8 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold"
              >
                <Navigation className="w-3.5 h-3.5 ml-1" />
                متابعة الرحلة
              </Button>
              <div className="text-right">
                <p className="text-orange-400 font-bold text-sm">لديك رحلة نشطة</p>
                <p className="text-white/40 text-[11px]">أكمل الرحلة الحالية لقبول طلبات جديدة</p>
              </div>
            </motion.div>
          )}
          {nearbyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3 border border-emerald-500/15">
                <Radar className="w-8 h-8 text-emerald-500/30" />
              </div>
              <p className="text-white/70 font-medium">لا توجد رحلات في منطقتك</p>
              <p className="text-white/30 text-sm mt-1">الرحلات القريبة ستظهر هنا تلقائياً</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-[#0d1320] border-b border-white/5">
                <tr className="text-white/50 text-xs">
                  <th className="py-2 px-3 text-right font-medium">الانطلاق</th>
                  <th className="py-2 px-3 text-right font-medium">الوجهة</th>
                  <th className="py-2 px-3 text-center font-medium">المسافة</th>
                  <th className="py-2 px-3 text-center font-medium">البُعد</th>
                  <th className="py-2 px-3 text-center font-medium">ETA</th>
                  <th className="py-2 px-3 text-center font-medium">السعر</th>
                  <th className="py-2 px-3 text-center font-medium">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {nearbyOrders.map((order) => {
                  const isSelected = selectedOrderId === order.id;
                  return (
                    <motion.tr
                      key={order.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setSelectedOrderId(isSelected ? null : order.id)}
                      className={`border-b border-white/[0.04] cursor-pointer transition-colors ${
                        isSelected ? "bg-emerald-500/10 border-emerald-500/20" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                          <span className="text-white/80 truncate max-w-[100px]">{order.pickup || "—"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                          <span className="text-white/80 truncate max-w-[100px]">{order.destination || "—"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-emerald-400 font-semibold text-xs">{order.totalDistance} كم</span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-yellow-400 text-xs">
                          <MapPin className="w-3 h-3" />
                          <span>{order.distToPickup != null ? `${order.distToPickup}` : "—"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-400 text-xs">
                          <Clock className="w-3 h-3" />
                          <span>{order.eta ? `${order.eta} د` : "—"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-emerald-400 font-black text-sm">
                          {order.totalPrice || "—"} <span className="text-[9px] font-medium opacity-60">DH</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Button
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleAccept(order.id); }}
                          disabled={accepting === order.id || !!activeRideId}
                          className="h-7 px-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold shadow-[0_2px_10px_hsl(155,70%,40%,0.25)]"
                        >
                          {accepting === order.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-3 h-3 ml-1" />
                              قبول
                            </>
                          )}
                        </Button>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
};

/* ─── Stats Card ─── */
const StatsCard = ({ icon: Icon, label, value, accent, bg }: {
  icon: typeof TrendingUp; label: string; value: string; accent: string; bg: string;
}) => (
  <div className={`${bg} rounded-xl p-3 border border-white/[0.04] text-center`}>
    <Icon className={`w-4 h-4 ${accent} mx-auto mb-1`} />
    <p className={`text-base font-black ${accent}`}>{value}</p>
    <p className="text-[10px] text-white/40 mt-0.5">{label}</p>
  </div>
);

export default DriverPage;
