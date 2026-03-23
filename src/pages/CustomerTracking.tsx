import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, MapPin, Phone, User, Navigation, Car, Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";
import RideChat from "@/components/RideChat";

const PRICE_PER_KM = 3;
const BASE_FARE = 5;
const MIN_FARE = 10;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface RideData {
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
  driver_id: string | null;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  pending: { label: "في انتظار سائق...", color: "bg-amber-500", icon: "⏳" },
  accepted: { label: "السائق قبل الطلب", color: "bg-blue-500", icon: "✅" },
  in_progress: { label: "السائق في الطريق", color: "bg-blue-500", icon: "🚗" },
  arriving: { label: "السائق وصل!", color: "bg-emerald-500", icon: "📍" },
  completed: { label: "تم التوصيل", color: "bg-green-500", icon: "🎉" },
  cancelled: { label: "تم الإلغاء", color: "bg-red-500", icon: "❌" },
};

const CustomerTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideId = searchParams.get("id");
  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [driverPhone, setDriverPhone] = useState<string | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<string | null>(null);

  // Fetch ride + realtime
  useEffect(() => {
    if (!rideId) return;
    const fetchRide = async () => {
      const { data } = await supabase.from("ride_requests").select("*").eq("id", rideId).single();
      if (data) setRide(data as RideData);
    };
    fetchRide();
    const channel = supabase
      .channel(`customer-ride-${rideId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${rideId}` },
        (payload) => setRide(payload.new as RideData))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  // Driver info + realtime location
  useEffect(() => {
    if (!ride?.driver_id) {
      setDriverLocation(null); setDriverName(null); setDriverPhone(null); setVehicleInfo(null);
      return;
    }
    const fetchDriver = async () => {
      const { data: driver } = await supabase
        .from("drivers").select("user_id, current_lat, current_lng, car_id")
        .eq("id", ride.driver_id!).single();
      if (!driver) return;
      if (driver.current_lat && driver.current_lng) {
        setDriverLocation({ lat: Number(driver.current_lat), lng: Number(driver.current_lng) });
      }
      const { data: profile } = await supabase.from("profiles").select("name, phone").eq("id", driver.user_id).single();
      if (profile) { setDriverName(profile.name || null); setDriverPhone(profile.phone || null); }
      if (driver.car_id) {
        const { data: vehicle } = await supabase.from("vehicles").select("brand, model, plate_no, color").eq("id", driver.car_id).single();
        if (vehicle) setVehicleInfo(`${vehicle.brand} ${vehicle.model} — ${vehicle.plate_no}`);
      }
    };
    fetchDriver();
    const channel = supabase
      .channel(`driver-loc-${ride.driver_id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "drivers", filter: `id=eq.${ride.driver_id}` },
        (payload) => {
          const d = payload.new as any;
          if (d.current_lat && d.current_lng) setDriverLocation({ lat: Number(d.current_lat), lng: Number(d.current_lng) });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ride?.driver_id]);

  const smoothedDriver = useSmoothedPosition(driverLocation);

  const pickupPos = useMemo(() => {
    if (ride?.pickup_lat && ride?.pickup_lng) return { lat: Number(ride.pickup_lat), lng: Number(ride.pickup_lng) };
    return null;
  }, [ride]);

  const destPos = useMemo(() => {
    if (ride?.destination_lat && ride?.destination_lng) return { lat: Number(ride.destination_lat), lng: Number(ride.destination_lng) };
    return null;
  }, [ride]);

  // Route line for the map
  const mapRoute = useMemo(() => {
    if (!pickupPos || !destPos) return null;
    return { pickup: pickupPos, destination: destPos };
  }, [pickupPos, destPos]);

  const distDriverToPickup = useMemo(() => {
    if (!smoothedDriver || !pickupPos) return null;
    return haversineKm(smoothedDriver, pickupPos);
  }, [smoothedDriver, pickupPos]);

  const distPickupToDest = useMemo(() => {
    if (!pickupPos || !destPos) return ride?.distance ? Number(ride.distance) : null;
    return haversineKm(pickupPos, destPos);
  }, [pickupPos, destPos, ride?.distance]);

  const totalRouteKm = useMemo(() => {
    return (distDriverToPickup || 0) + (distPickupToDest || 0);
  }, [distDriverToPickup, distPickupToDest]);

  const etaMinutes = distDriverToPickup ? Math.max(1, Math.round(distDriverToPickup * 2.5)) : null;

  const totalPrice = useMemo(() => {
    if (!ride) return null;
    const total = totalRouteKm;
    return total > 0 ? Math.round(BASE_FARE + total * PRICE_PER_KM) : (ride.price || 0);
  }, [ride, totalRouteKm]);

  const mapCenter = useMemo(
    () => smoothedDriver || pickupPos || { lat: 35.7595, lng: -5.834 },
    [smoothedDriver, pickupPos]
  );

  const statusInfo = ride ? (STATUS_CONFIG[ride.status] || STATUS_CONFIG.pending) : STATUS_CONFIG.pending;
  const isCompleted = ride?.status === "completed";
  const isCancelled = ride?.status === "cancelled";
  const isActive = ride && !isCompleted && !isCancelled;

  if (!ride) {
    return (
      <div className="h-screen bg-[#0a0f1a] flex items-center justify-center" dir="rtl">
        <div className="text-blue-300 animate-pulse text-lg">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a] overflow-hidden" dir="rtl">
      {/* ─── Header ─── */}
      <div className="shrink-0 bg-[#0a0f1a]/90 backdrop-blur-sm border-b border-white/5 px-4 py-2.5 flex items-center justify-between z-50">
        <button onClick={() => navigate("/customer")} className="p-2 rounded-full hover:bg-white/5">
          <ArrowRight className="w-5 h-5 text-white/70" />
        </button>
        <span className="font-bold text-white">تتبع رحلتك</span>
        <div className="w-9" />
      </div>

      {/* ─── Map (fills available space) ─── */}
      <div className="flex-1 relative min-h-0">
        <LeafletMap
          center={mapCenter}
          zoom={14}
          className="w-full h-full"
          showMarker={!!pickupPos}
          markerPosition={pickupPos || undefined}
          driverLocation={smoothedDriver}
          route={mapRoute}
        />

        {/* Status pill */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`${statusInfo.color}/90 text-white px-5 py-2 rounded-full text-sm font-bold backdrop-blur-sm flex items-center gap-2 shadow-lg`}
          >
            <div className={`w-2 h-2 rounded-full bg-white ${isActive ? "animate-pulse" : ""}`} />
            {statusInfo.icon} {statusInfo.label}
          </motion.div>
        </div>

        {/* Live KM counter overlay */}
        {ride.status !== "pending" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2">
            {distDriverToPickup != null && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-white/10">
                <Car className="w-3.5 h-3.5 text-orange-400" />
                <span className="text-white/60">بُعد السائق:</span>
                <span className="text-orange-400 font-bold text-sm">{distDriverToPickup.toFixed(1)} كم</span>
              </div>
            )}
            {etaMinutes != null && (
              <div className="bg-black/70 backdrop-blur-sm text-white px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-white/10">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-blue-400 font-bold text-sm">{etaMinutes} د</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom Panel (compact, no scroll needed) ─── */}
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        className="shrink-0 bg-[#0d1320] border-t border-white/5 rounded-t-2xl"
      >
        {/* Pending state */}
        {ride.status === "pending" && (
          <div className="text-center py-6 px-4">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 flex items-center justify-center mx-auto mb-3 border border-amber-500/20">
              <Navigation className="w-7 h-7 text-amber-400 animate-pulse" />
            </div>
            <p className="text-white font-bold">جارٍ البحث عن سائق...</p>
            <p className="text-white/40 text-sm mt-1">سيتم تعيين أقرب سائق</p>
          </div>
        )}

        {/* Active ride info */}
        {isActive && ride.status !== "pending" && (
          <div className="p-4 space-y-3">
            {/* Driver card */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {driverPhone && (
                  <a href={`tel:${driverPhone}`} className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center border border-blue-500/25">
                    <Phone className="w-5 h-5 text-blue-400" />
                  </a>
                )}
              </div>
              <div className="text-right">
                <p className="text-white font-bold flex items-center gap-2 justify-end">
                  <User className="w-4 h-4 text-blue-400" />
                  {driverName || "السائق"}
                </p>
                {vehicleInfo && <p className="text-white/40 text-[11px]">{vehicleInfo}</p>}
              </div>
            </div>

            {/* Route summary */}
            <div className="flex items-center gap-2 text-xs">
              <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-blue-500/8 border border-blue-500/10">
                <div className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                <span className="text-white/70 truncate">{ride.pickup || "موقعك"}</span>
              </div>
              <RouteIcon className="w-3.5 h-3.5 text-white/20 shrink-0" />
              <div className="flex-1 flex items-center gap-2 p-2 rounded-lg bg-orange-500/8 border border-orange-500/10">
                <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                <span className="text-white/70 truncate">{ride.destination || "الوجهة"}</span>
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <p className="text-[10px] text-white/40">المسافة الكلية</p>
                <p className="text-blue-400 font-black text-base mt-0.5">{totalRouteKm.toFixed(1)} <span className="text-[9px] font-normal">كم</span></p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <p className="text-[10px] text-white/40">الوقت المتوقع</p>
                <p className="text-emerald-400 font-black text-base mt-0.5">{etaMinutes || "—"} <span className="text-[9px] font-normal">دقيقة</span></p>
              </div>
              <div className="text-center p-2 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <p className="text-[10px] text-white/40">السعر</p>
                <p className="text-orange-400 font-black text-base mt-0.5">{totalPrice || "—"} <span className="text-[9px] font-normal">DH</span></p>
              </div>
            </div>
          </div>
        )}

        {/* Completed */}
        {isCompleted && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center p-6">
            <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
            <p className="text-white font-bold text-lg">تم التوصيل بنجاح! 🎉</p>
            <p className="text-white/40 text-sm mt-1">
              الأجرة: <span className="text-orange-400 font-bold">{totalPrice || ride.price || "—"} DH</span>
            </p>
            <Button onClick={() => navigate("/customer")}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold">
              العودة للرئيسية
            </Button>
          </motion.div>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center p-6">
            <p className="text-white font-bold text-lg">تم إلغاء الرحلة ❌</p>
            <Button onClick={() => navigate("/customer")} variant="outline"
              className="mt-4 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 rounded-xl">
              طلب جديد
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Chat */}
      {rideId && isActive && ride.status !== "pending" && (
        <RideChat rideId={rideId} role="customer" />
      )}
    </div>
  );
};

export default CustomerTracking;
