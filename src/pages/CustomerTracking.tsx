import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, MapPin, Phone, User, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";

const PRICE_PER_KM = 3;
const BASE_FARE = 5;

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "في انتظار سائق...", color: "bg-yellow-500" },
  accepted: { label: "السائق قبل الطلب", color: "bg-blue-500" },
  in_progress: { label: "السائق في الطريق إليك", color: "bg-blue-500" },
  arriving: { label: "السائق وصل!", color: "bg-emerald-500" },
  completed: { label: "تم التوصيل بنجاح ✅", color: "bg-green-500" },
  cancelled: { label: "تم إلغاء الرحلة", color: "bg-red-500" },
};

const CustomerTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideId = searchParams.get("id");
  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [driverPhone, setDriverPhone] = useState<string | null>(null);

  // Fetch ride + realtime subscription
  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("id", rideId)
        .single();
      if (data) setRide(data as RideData);
    };
    fetchRide();

    const channel = supabase
      .channel(`customer-ride-${rideId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "ride_requests",
        filter: `id=eq.${rideId}`,
      }, (payload) => {
        setRide(payload.new as RideData);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [rideId]);

  // When driver is assigned, subscribe to driver location + fetch driver info
  useEffect(() => {
    if (!ride?.driver_id) {
      setDriverLocation(null);
      setDriverName(null);
      setDriverPhone(null);
      return;
    }

    const fetchDriver = async () => {
      const { data: driver } = await supabase
        .from("drivers")
        .select("user_id, current_lat, current_lng")
        .eq("id", ride.driver_id!)
        .single();

      if (driver) {
        if (driver.current_lat && driver.current_lng) {
          setDriverLocation({ lat: Number(driver.current_lat), lng: Number(driver.current_lng) });
        }
        // Get driver profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, phone")
          .eq("id", driver.user_id)
          .single();
        if (profile) {
          setDriverName(profile.name || null);
          setDriverPhone(profile.phone || null);
        }
      }
    };
    fetchDriver();

    // Realtime driver location
    const channel = supabase
      .channel(`driver-loc-${ride.driver_id}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "drivers",
        filter: `id=eq.${ride.driver_id}`,
      }, (payload) => {
        const d = payload.new as any;
        if (d.current_lat && d.current_lng) {
          setDriverLocation({ lat: Number(d.current_lat), lng: Number(d.current_lng) });
        }
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

  // Show pickup when waiting, destination when in_progress
  const targetOnMap = useMemo(() => {
    if (ride?.status === "in_progress" && destPos) return destPos;
    return pickupPos;
  }, [ride?.status, pickupPos, destPos]);

  const distanceDriverToTarget = useMemo(() => {
    if (!smoothedDriver || !targetOnMap) return null;
    return haversineKm(smoothedDriver, targetOnMap);
  }, [smoothedDriver, targetOnMap]);

  const etaMinutes = distanceDriverToTarget ? Math.max(1, Math.round(distanceDriverToTarget * 2.5)) : null;

  // Total price calculation
  const totalPrice = useMemo(() => {
    if (!ride) return null;
    let driverToPickup = 0;
    if (smoothedDriver && pickupPos) {
      driverToPickup = haversineKm(smoothedDriver, pickupPos);
    }
    const rideDistance = ride.distance || (pickupPos && destPos ? haversineKm(pickupPos, destPos) : 0);
    const total = driverToPickup + rideDistance;
    return total > 0 ? Math.round(BASE_FARE + total * PRICE_PER_KM) : (ride.price || 0);
  }, [ride, smoothedDriver, pickupPos, destPos]);

  const mapCenter = useMemo(
    () => smoothedDriver || pickupPos || { lat: 35.7595, lng: -5.834 },
    [smoothedDriver, pickupPos]
  );

  const statusInfo = ride ? (STATUS_LABELS[ride.status] || STATUS_LABELS.pending) : STATUS_LABELS.pending;
  const isCompleted = ride?.status === "completed";
  const isCancelled = ride?.status === "cancelled";

  if (!ride) {
    return (
      <div className="min-h-screen customer-bg flex items-center justify-center" dir="rtl">
        <div className="text-blue-300 animate-pulse">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen customer-bg flex flex-col" dir="rtl">
      {/* Header */}
      <div className="customer-header sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/customer")} className="p-2">
          <ArrowRight className="w-5 h-5 text-blue-300" />
        </button>
        <span className="font-bold text-lg text-white">تتبع رحلتك</span>
        <div className="w-9" />
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-[45vh]">
        <LeafletMap
          center={mapCenter}
          zoom={15}
          className="w-full h-full"
          showMarker={!!targetOnMap}
          markerPosition={targetOnMap || undefined}
          driverLocation={smoothedDriver}
        />

        {/* Status badge */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-blue-600/90 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${ride.status === "pending" ? "bg-yellow-400 animate-pulse" : "bg-white animate-pulse"}`} />
          {statusInfo.label}
        </div>

        {/* Distance/ETA overlay */}
        {ride.status !== "pending" && distanceDriverToTarget != null && etaMinutes != null && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm flex items-center gap-3">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{distanceDriverToTarget.toFixed(1)} كم</span>
            <span className="text-blue-300/50">|</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{etaMinutes} دقيقة</span>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="bg-[hsl(var(--card))] border-t border-blue-500/20 rounded-t-3xl p-5 space-y-4"
      >
        {/* Driver info or waiting */}
        {ride.status === "pending" ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <Navigation className="w-8 h-8 text-blue-400 animate-pulse" />
            </div>
            <p className="text-white font-bold text-lg">جارٍ البحث عن سائق...</p>
            <p className="text-blue-300/70 text-sm mt-1">يرجى الانتظار، سيتم تعيين سائق قريباً</p>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {driverPhone && (
                <a href={`tel:${driverPhone}`} className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                  <Phone className="w-5 h-5 text-blue-400" />
                </a>
              )}
            </div>
            <div className="text-right">
              <p className="text-white font-bold flex items-center gap-2 justify-end">
                <User className="w-4 h-4 text-blue-400" />
                {driverName || "السائق"}
              </p>
              <p className="text-blue-300/60 text-xs">
                {ride.status === "accepted" ? "في الطريق إليك" : "الرحلة جارية"}
              </p>
            </div>
          </div>
        )}

        {/* Route info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/15">
            <div className="w-3 h-3 rounded-full bg-blue-400" />
            <span className="text-white flex-1">{ride.pickup || "موقعك"}</span>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-white flex-1">{ride.destination || "الوجهة"}</span>
          </div>
        </div>

        {/* Price & distance */}
        <div className="flex justify-between items-center px-1">
          <div>
            <p className="text-xs text-blue-300/70">السعر الإجمالي</p>
            <p className="text-2xl font-bold text-blue-400">{totalPrice || ride.price || "—"} DH</p>
          </div>
          <div className="text-left">
            <p className="text-xs text-blue-300/70">المسافة</p>
            <p className="text-lg font-bold text-blue-300">{ride.distance ? `${ride.distance} كم` : "—"}</p>
          </div>
        </div>

        {/* Completed */}
        {isCompleted && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center p-6 rounded-2xl bg-green-500/10 border border-green-500/30">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
            <p className="text-white font-bold text-lg">تم التوصيل بنجاح!</p>
            <p className="text-blue-300/70 text-sm mt-1">شكراً لاستخدامك التطبيق</p>
            <Button onClick={() => navigate("/customer")}
              className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
              العودة للرئيسية
            </Button>
          </motion.div>
        )}

        {isCancelled && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
            <p className="text-white font-bold text-lg">تم إلغاء الرحلة</p>
            <Button onClick={() => navigate("/customer")} variant="outline"
              className="mt-4 border-blue-500/30 text-blue-300 hover:bg-blue-500/10 rounded-xl">
              طلب جديد
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default CustomerTracking;
