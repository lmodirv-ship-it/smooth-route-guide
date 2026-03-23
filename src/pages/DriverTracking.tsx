import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Phone, Navigation, CheckCircle, XCircle, MapPin, User, Clock, Car, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import NavigationLinks from "@/components/NavigationLinks";
import RideChat from "@/components/RideChat";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";

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
  user_id: string;
}

const STATUS_FLOW: Record<string, { label: string; icon: string }> = {
  accepted: { label: "تم قبول الطلب", icon: "✅" },
  in_progress: { label: "في الطريق", icon: "🚗" },
  arriving: { label: "وصلت للزبون", icon: "📍" },
  completed: { label: "تم التوصيل", icon: "🎉" },
  cancelled: { label: "تم الإلغاء", icon: "❌" },
};

const DriverTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideId = searchParams.get("id");
  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [clientName, setClientName] = useState("الزبون");
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  // Watch driver GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
    );
    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  // Update driver location in DB
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
    const t = setTimeout(updateLoc, 500);
    return () => clearTimeout(t);
  }, [driverLocation]);

  // Fetch ride data + client info + realtime
  useEffect(() => {
    if (!rideId) return;

    const fetchRide = async () => {
      const { data } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("id", rideId)
        .single();
      if (data) {
        setRide(data as RideData);
        // Fetch client profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, phone")
          .eq("id", data.user_id)
          .single();
        if (profile) {
          setClientName(profile.name || "الزبون");
          setClientPhone(profile.phone || null);
        }
      }
    };

    fetchRide();

    const channel = supabase
      .channel(`ride-track-${rideId}`)
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

  const smoothedDriver = useSmoothedPosition(driverLocation);

  const targetPosition = useMemo(() => {
    if (!ride) return null;
    if (["accepted", "in_progress"].includes(ride.status) && ride.pickup_lat && ride.pickup_lng) {
      return { lat: ride.pickup_lat, lng: ride.pickup_lng };
    }
    if (["arriving", "completed"].includes(ride.status) && ride.destination_lat && ride.destination_lng) {
      return { lat: ride.destination_lat, lng: ride.destination_lng };
    }
    return null;
  }, [ride]);

  const distanceToTarget = useMemo(() => {
    if (!driverLocation || !targetPosition) return null;
    return haversineKm(driverLocation, targetPosition);
  }, [driverLocation, targetPosition]);

  const totalTripPrice = useMemo(() => {
    if (!ride) return ride?.price || null;
    let driverToPickup = 0;
    if (driverLocation && ride.pickup_lat && ride.pickup_lng) {
      driverToPickup = haversineKm(driverLocation, { lat: ride.pickup_lat, lng: ride.pickup_lng });
    }
    let pickupToDest = ride.distance || 0;
    if (!pickupToDest && ride.pickup_lat && ride.pickup_lng && ride.destination_lat && ride.destination_lng) {
      pickupToDest = haversineKm({ lat: ride.pickup_lat, lng: ride.pickup_lng }, { lat: ride.destination_lat, lng: ride.destination_lng });
    }
    const totalDist = driverToPickup + pickupToDest;
    return totalDist > 0 ? Math.max(MIN_FARE, Math.round(BASE_FARE + totalDist * PRICE_PER_KM)) : (ride.price || null);
  }, [ride, driverLocation]);

  const etaMinutes = distanceToTarget ? Math.max(1, Math.round(distanceToTarget * 2.5)) : null;

  const mapCenter = useMemo(
    () => smoothedDriver || targetPosition || { lat: 35.7595, lng: -5.834 },
    [smoothedDriver, targetPosition]
  );

  const handleStatusUpdate = async (newStatus: string) => {
    if (!rideId || updating) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("ride_requests")
        .update({ status: newStatus })
        .eq("id", rideId);
      if (error) throw error;

      if (newStatus === "completed") {
        navigate("/driver");
      } else if (newStatus === "cancelled") {
        navigate("/driver");
      }
    } catch (err: any) {
      console.error("Status update error:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (!ride) {
    return (
      <div className="min-h-screen bg-[#0a0f1a] flex items-center justify-center" dir="rtl">
        <div className="text-emerald-300 animate-pulse">جارٍ التحميل...</div>
      </div>
    );
  }

  const statusInfo = STATUS_FLOW[ride.status] || { label: ride.status, icon: "📦" };
  const isFinished = ride.status === "completed" || ride.status === "cancelled";

  return (
    <div className="h-screen flex flex-col bg-[#0a0f1a]" dir="rtl">
      {/* ─── Header ─── */}
      <div className="shrink-0 bg-[#0a0f1a]/90 backdrop-blur-sm border-b border-white/5 px-4 py-3 flex items-center justify-between z-50">
        <button onClick={() => navigate("/driver-panel")} className="p-2 rounded-full hover:bg-white/5">
          <ArrowRight className="w-5 h-5 text-white/70" />
        </button>
        <span className="font-bold text-white">التوصيل</span>
        <div className="w-9" />
      </div>

      {/* ─── Map (top section) ─── */}
      <div className="relative h-[30vh] min-h-[180px] shrink-0">
        <LeafletMap
          center={mapCenter}
          zoom={15}
          className="w-full h-full"
          showMarker={!!targetPosition}
          markerPosition={targetPosition || undefined}
          driverLocation={smoothedDriver}
        />
        {distanceToTarget != null && etaMinutes != null && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm flex items-center gap-3 border border-white/10">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-400" />{distanceToTarget.toFixed(1)} كم</span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" />{etaMinutes} د</span>
          </div>
        )}
      </div>

      {/* ─── Bottom Panel (scrollable) ─── */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 space-y-3"
        >
          {/* Client info card */}
          <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-white/[0.01] p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                {statusInfo.label}
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-lg">{clientName}</p>
                <p className="text-white/40 text-sm">{clientPhone || "—"}</p>
              </div>
            </div>

            {/* Route */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <Car className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-white/80 flex-1">{ride.pickup || "موقعي الحالي"}</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-white/80 flex-1">{ride.destination || "الوجهة"}</span>
              </div>
            </div>

            {/* Price & ETA */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/[0.05]">
              <span className="text-white/40 text-sm">ETA {etaMinutes ? `${etaMinutes} د` : "—"}</span>
              <span className="text-orange-400 font-black text-xl">{totalTripPrice || ride.price || "—"} DH</span>
            </div>
          </div>

          {/* Navigation link */}
          {targetPosition && !isFinished && (
            <NavigationLinks
              lat={targetPosition.lat}
              lng={targetPosition.lng}
              label={["accepted", "in_progress"].includes(ride.status) ? "نقطة الاستلام" : "الوجهة"}
              compact
            />
          )}

          {/* ─── Action Buttons ─── */}
          {!isFinished && (
            <div className="space-y-2.5 pt-1">
              {/* Call client */}
              {clientPhone && (
                <a href={`tel:${clientPhone}`} className="block">
                  <Button className="w-full h-13 rounded-xl bg-[#1a2a3a] hover:bg-[#1e3040] text-white font-bold text-base border border-white/[0.06] gap-2">
                    <Phone className="w-5 h-5 text-blue-400" />
                    اتصال بالعميل
                  </Button>
                </a>
              )}

              {/* في الطريق — from accepted */}
              {ride.status === "accepted" && (
                <Button
                  onClick={() => handleStatusUpdate("in_progress")}
                  disabled={updating}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-[0_4px_20px_hsl(30,80%,50%,0.3)] gap-2"
                >
                  <Send className="w-5 h-5" />
                  في الطريق
                </Button>
              )}

              {/* وصلت — from in_progress */}
              {ride.status === "in_progress" && (
                <Button
                  onClick={() => handleStatusUpdate("arriving")}
                  disabled={updating}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-[0_4px_20px_hsl(30,80%,50%,0.3)] gap-2"
                >
                  <Car className="w-5 h-5" />
                  وصلت
                </Button>
              )}

              {/* تم التوصيل — from arriving */}
              {ride.status === "arriving" && (
                <Button
                  onClick={() => handleStatusUpdate("completed")}
                  disabled={updating}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold text-base shadow-[0_4px_20px_hsl(155,70%,40%,0.3)] gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  تم التوصيل
                </Button>
              )}

              {/* إلغاء الطلب */}
              <Button
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={updating}
                variant="outline"
                className="w-full h-13 rounded-xl border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 font-bold text-base gap-2"
              >
                <XCircle className="w-5 h-5" />
                إلغاء الطلب
              </Button>
            </div>
          )}

          {/* Completed state */}
          {ride.status === "completed" && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
              <p className="text-white font-bold text-lg">تم التوصيل بنجاح! 🎉</p>
              <p className="text-white/40 text-sm mt-1">
                الأجرة: <span className="text-orange-400 font-bold">{totalTripPrice || ride.price || "—"} DH</span>
              </p>
              <Button onClick={() => navigate("/driver-panel")}
                className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold">
                العودة للطلبات
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Chat with client */}
      {rideId && !isFinished && <RideChat rideId={rideId} role="driver" />}
    </div>
  );
};

export default DriverTracking;
