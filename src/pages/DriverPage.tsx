import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Car, Radar, MapPin, Clock, Route, Loader2, CheckCircle, TrendingUp,
  Wallet, Star, Navigation, Volume2, Percent, Package, Crown, Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import BottomNav from "@/components/BottomNav";
import { notifyNewOrder, unlockAudio } from "@/lib/notificationSound";
import { driverNetEarnings, COMMISSION_RATE } from "@/lib/pricing";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { useI18n } from "@/i18n/context";
import { useDriverSubscription } from "@/hooks/useDriverSubscription";
import driverLogo from "@/assets/hn-driver-badge.png";
import { useUserReference } from "@/hooks/useUserReference";

const DEFAULT_LOCATION = { lat: 35.7595, lng: -5.834 };
const MAX_RADIUS_KM = 10;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
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
  const [driverAvatar, setDriverAvatar] = useState<string | null>(null);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [driverType, setDriverType] = useState<string>("ride");
  const prevOrderCountRef = useRef(0);
  const initialLoadRef = useRef(true);
  const { isExpired: subscriptionExpired, daysLeft: subDaysLeft } = useDriverSubscription();
  const { driverCode, userCode } = useUserReference();
  const refCode = driverCode || userCode;

  // Fetch stats & check active ride
  useEffect(() => {
    const fetchStats = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("name, avatar_url").eq("id", user.id).single();
      if (profile?.name) setDriverName(profile.name);
      if (profile?.avatar_url) setDriverAvatar(profile.avatar_url);

      const { data: activeRides } = await supabase.from("ride_requests").select("id, status")
        .eq("driver_id", user.id).in("status", ["accepted", "in_progress", "arriving"]).limit(1);
      setActiveRideId(activeRides?.[0]?.id || null);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: completedRides } = await supabase.from("ride_requests").select("id, price")
        .eq("driver_id", user.id).eq("status", "completed").gte("created_at", todayStart.toISOString());

      const trips = completedRides?.length || 0;
      const grossEarnings = completedRides?.reduce((sum, r) => sum + (Number(r.price) || 0), 0) || 0;

      const { data: driverData } = await supabase.from("drivers").select("rating, driver_type").eq("user_id", user.id).single();
      if (driverData?.driver_type) setDriverType(driverData.driver_type);

      setTodayStats({ trips, earnings: driverNetEarnings(grossEarnings), rating: Number(driverData?.rating) || 0 });
    };
    fetchStats();
  }, []);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) { setDriverLocation(DEFAULT_LOCATION); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setDriverLocation(DEFAULT_LOCATION), { enableHighAccuracy: true, timeout: 10000 }
    );
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}, { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // Sync location
  useEffect(() => {
    if (!driverLocation) return;
    const updateLoc = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("drivers").update({
        current_lat: driverLocation.lat, current_lng: driverLocation.lng,
        location_updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    };
    const timer = setTimeout(updateLoc, 1000);
    return () => clearTimeout(timer);
  }, [driverLocation]);

  // Fetch orders + realtime
  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase.from("ride_requests").select("*").eq("status", "pending")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const newCount = data.length;
      if (!initialLoadRef.current && newCount > prevOrderCountRef.current && soundEnabled) notifyNewOrder();
      initialLoadRef.current = false;
      prevOrderCountRef.current = newCount;
      setOrders(data as RideRow[]);
    }
  }, [soundEnabled]);

  useEffect(() => {
    fetchOrders();
    const channel = supabase.channel("driver-ride-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

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
        rideDistance = parseFloat(haversineKm({ lat: order.pickup_lat, lng: order.pickup_lng }, { lat: order.destination_lat, lng: order.destination_lng }).toFixed(2));
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
    if (!selectedOrder?.pickup_lat || !selectedOrder?.pickup_lng || !selectedOrder?.destination_lat || !selectedOrder?.destination_lng) return null;
    return { pickup: { lat: selectedOrder.pickup_lat, lng: selectedOrder.pickup_lng }, destination: { lat: selectedOrder.destination_lat, lng: selectedOrder.destination_lng } };
  }, [selectedOrder]);

  const handleAccept = async (orderId: string) => {
    if (subscriptionExpired) {
      toast({ title: "اشتراك مطلوب", description: "يجب الاشتراك في باقة لقبول الطلبات", variant: "destructive" });
      navigate("/driver/subscription"); return;
    }
    if (activeRideId) {
      toast({ title: t.driver.activeRide, description: t.driver.completeCurrentFirst, variant: "destructive" });
      navigate(`/driver/tracking?id=${activeRideId}`); return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: t.driver.mustLogin, variant: "destructive" }); return; }
    setAccepting(orderId);
    try {
      const order = nearbyOrders.find(o => o.id === orderId);
      const totalPrice = order ? order.totalPrice : 0;
      const { error } = await supabase.from("ride_requests")
        .update({ status: "accepted", driver_id: user.id, accepted_at: new Date().toISOString(), price: totalPrice })
        .eq("id", orderId).eq("status", "pending");
      if (error) throw error;
      setActiveRideId(orderId);
      toast({ title: t.driver.orderAccepted, description: `${t.common.price}: ${totalPrice} DH` });
      navigate(`/driver/tracking?id=${orderId}`);
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    } finally { setAccepting(null); }
  };

  const cityName = driverLocation ? detectCity(driverLocation) : "جارٍ التحديد...";

  // Trip progress: 0 = waiting, 0.5 = en route, 1 = arrived
  const tripProgress = useMemo(() => {
    if (!activeRideId) return 0;
    // Could be enhanced with real tracking data
    return 0.5;
  }, [activeRideId]);

  const progressColor = useMemo(() => {
    if (tripProgress >= 1) return "bg-emerald-500 shadow-emerald-500/40";
    if (tripProgress > 0) return "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 shadow-amber-500/30";
    return "bg-zinc-700";
  }, [tripProgress]);

  const progressLabel = useMemo(() => {
    if (tripProgress >= 1) return "✅ تم الوصول";
    if (tripProgress > 0) return "🚗 في الطريق...";
    return "في الانتظار";
  }, [tripProgress]);

  return (
    <div className="h-screen flex flex-col bg-background" dir={dir} onClick={() => unlockAudio()}>
      {/* Map - takes most of the screen */}
      <div className="relative flex-1 min-h-0">
        <LeafletMap center={driverLocation || DEFAULT_LOCATION} zoom={14} showMarker driverLocation={driverLocation} route={route} className="w-full h-full" />

        {/* Top overlay */}
        <div className="absolute top-0 inset-x-0 z-[1000] bg-gradient-to-b from-black/80 via-black/40 to-transparent px-4 pt-3 pb-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={driverLogo} alt="HN" className="w-8 h-8 rounded-full shadow-lg border border-white/20" />
              <div>
                <p className="text-white font-bold text-sm">{driverName}</p>
                <p className="text-emerald-400 text-[11px]">
                  {refCode && <span className="font-mono mr-1">[{refCode}]</span>}
                  {t.driver.connected}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-full backdrop-blur-sm border transition-all ${soundEnabled ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-white/10 border-white/20 text-white/40"}`}>
                <Volume2 className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full border border-white/10">
                <Radar className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="text-xs text-white/90">{cityName}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Driver avatar - bottom right of map */}
        <button
          onClick={() => navigate("/driver/profile")}
          className="absolute bottom-4 right-4 z-[1000]"
        >
          <div className="relative">
            <Avatar className="w-14 h-14 border-[3px] border-primary shadow-xl shadow-primary/30">
              <AvatarImage src={driverAvatar || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-lg">
                {driverName?.charAt(0)?.toUpperCase() || "S"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-400 border-[3px] border-black flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
          </div>
        </button>

        {/* Radius indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur-md text-foreground px-4 py-1.5 rounded-full text-xs flex items-center gap-2 border border-border">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {t.driver.searchRadius}: {MAX_RADIUS_KM} {t.driver.km}
        </div>
      </div>

      {/* Progress Bar - minimal */}
      <div className="shrink-0 bg-zinc-950 px-4 py-1 border-t border-white/5">
        <div className="h-2 rounded-full bg-zinc-800/80 overflow-hidden border border-white/5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
          <motion.div
            className={`h-full rounded-full ${progressColor} shadow-lg`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(tripProgress * 100, 2)}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
          />
        </div>
      </div>

      <BottomNav role="driver" />
    </div>
  );
};

/* ─── Reusable sub-components ─── */


const BannerCard = ({ color, icon: Icon, title, subtitle, btnLabel, onClick, gradient }: {
  color: string; icon: typeof Package; title: string; subtitle: string; btnLabel: string; onClick: () => void; gradient?: boolean;
}) => {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 border-blue-500/30",
    orange: "bg-primary/10 border-primary/30",
    amber: "bg-amber-500/10 border-amber-500/30",
  };
  const textMap: Record<string, string> = { blue: "text-blue-400", orange: "text-primary", amber: "text-amber-400" };
  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className={`mx-4 mt-3 p-3 rounded-xl ${colorMap[color] || ""} border flex items-center justify-between`}>
      <Button size="sm" onClick={onClick}
        className={`h-8 px-4 rounded-lg text-xs font-bold ${gradient ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black" : `bg-${color === "blue" ? "blue" : color === "orange" ? "primary" : "amber"}-500 hover:opacity-90 text-white`}`}>
        <Icon className="w-3.5 h-3.5 ml-1" />{btnLabel}
      </Button>
      <div className="text-right">
        <p className={`${textMap[color]} font-bold text-sm`}>{title}</p>
        <p className="text-muted-foreground text-[11px]">{subtitle}</p>
      </div>
    </motion.div>
  );
};

export default DriverPage;
