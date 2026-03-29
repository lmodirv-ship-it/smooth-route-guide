import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Phone, Navigation, CheckCircle, XCircle, MapPin, Clock, Car, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import RideChat from "@/components/RideChat";
import CancelRideDialog from "@/components/CancelRideDialog";
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
  const rideIdParam = searchParams.get("id");
  const [rideId, setRideId] = useState<string | null>(rideIdParam);
  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [clientName, setClientName] = useState("الزبون");
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [clientRefCode, setClientRefCode] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navMode, setNavMode] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  // Auto-find active ride if no ID provided
  useEffect(() => {
    if (rideIdParam) { setRideId(rideIdParam); return; }
    const findActiveRide = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase
        .from("ride_requests")
        .select("id")
        .eq("driver_id", user.id)
        .in("status", ["accepted", "in_progress", "arriving"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) {
        setRideId(data[0].id);
      } else {
        setLoading(false);
      }
    };
    findActiveRide();
  }, [rideIdParam]);

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

  const fetchRide = async () => {
    if (!rideId) { setLoading(false); setError(null); return; }
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("ride_requests")
        .select("*")
        .eq("id", rideId)
        .single();
      if (fetchErr) throw fetchErr;
      if (!data) {
        setError("لم يتم العثور على الرحلة");
        setRide(null);
      } else {
        setRide(data as RideData);
        const { data: profile } = await supabase
          .from("profiles")
          .select("name, phone, user_code")
          .eq("id", data.user_id)
          .single();
        if (profile) {
          setClientName(profile.name || "الزبون");
          setClientPhone(profile.phone || null);
          setClientRefCode(profile.user_code || null);
        }
      }
    } catch (err: any) {
      setError(err.message || "فشل تحميل بيانات الرحلة");
      setRide(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
    if (!rideId) return;
    const channel = supabase
      .channel(`ride-track-${rideId}`)
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "ride_requests",
        filter: `id=eq.${rideId}`,
      }, (payload) => { setRide(payload.new as RideData); })
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

  // Route for the map: driver → target when in nav mode, otherwise pickup → destination
  const mapRoute = useMemo(() => {
    if (!ride) return null;
    if (navMode && smoothedDriver && targetPosition) {
      return { pickup: smoothedDriver, destination: targetPosition };
    }
    if (ride.pickup_lat && ride.pickup_lng && ride.destination_lat && ride.destination_lng) {
      return {
        pickup: { lat: ride.pickup_lat, lng: ride.pickup_lng },
        destination: { lat: ride.destination_lat, lng: ride.destination_lng },
      };
    }
    return null;
  }, [ride, smoothedDriver, targetPosition, navMode]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!rideId || updating) return;
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("ride_requests")
        .update({ status: newStatus })
        .eq("id", rideId);
      if (error) throw error;
      if (newStatus === "completed" || newStatus === "cancelled") {
        navigate("/driver");
      }
    } catch (err: any) {
      console.error("Status update error:", err);
    } finally {
      setUpdating(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-primary animate-pulse">جارٍ التحميل...</div>
      </div>
    );
  }

  // No ride found
  if (!rideId || (!ride && !error)) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4" dir="rtl">
        <MapPin className="w-14 h-14 text-muted-foreground/30" />
        <p className="text-muted-foreground text-lg">لا توجد رحلة نشطة</p>
        <Button onClick={() => navigate("/driver")} className="rounded-xl">العودة للرئيسية</Button>
      </div>
    );
  }

  // Error state
  if (error || !ride) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4" dir="rtl">
        <XCircle className="w-14 h-14 text-destructive/50" />
        <p className="text-destructive text-lg">{error || "لم يتم العثور على الرحلة"}</p>
        <div className="flex gap-3">
          <Button onClick={fetchRide} variant="outline" className="rounded-xl">إعادة المحاولة</Button>
          <Button onClick={() => navigate("/driver")} className="rounded-xl">العودة للرئيسية</Button>
        </div>
      </div>
    );
  }

  const statusInfo = STATUS_FLOW[ride.status] || { label: ride.status, icon: "📦" };
  const isFinished = ride.status === "completed" || ride.status === "cancelled";

  return (
    <div className="h-screen flex flex-col bg-background" dir="rtl">
      {/* ─── Full-screen Navigation Mode ─── */}
      {navMode && (
        <div className="absolute inset-0 z-[100] flex flex-col bg-background">
          <div className="relative flex-1">
            <LeafletMap
              center={smoothedDriver || mapCenter}
              zoom={16}
              className="w-full h-full"
              showMarker={false}
              driverLocation={smoothedDriver}
              route={mapRoute}
            />
            {/* Floating info */}
            {distanceToTarget != null && etaMinutes != null && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-black/80 text-white px-5 py-2.5 rounded-full text-sm backdrop-blur-sm flex items-center gap-3 border border-white/10">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-orange-400" />{distanceToTarget.toFixed(1)} كم</span>
                <span className="text-white/30">|</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-blue-400" />{etaMinutes} د</span>
              </div>
            )}
            {/* Close nav mode */}
            <button
              onClick={() => setNavMode(false)}
              className="absolute top-4 right-4 z-[1001] w-10 h-10 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10"
            >
              <X className="w-5 h-5 text-white" />
            </button>
            {/* Status action floating */}
            <div className="absolute bottom-4 left-4 right-4 z-[1001] space-y-2">
              {ride.status === "accepted" && (
                <Button onClick={() => handleStatusUpdate("in_progress")} disabled={updating}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-lg gap-2">
                  <Send className="w-5 h-5" /> في الطريق
                </Button>
              )}
              {ride.status === "in_progress" && (
                <Button onClick={() => handleStatusUpdate("arriving")} disabled={updating}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-lg gap-2">
                  <Car className="w-5 h-5" /> وصلت
                </Button>
              )}
              {ride.status === "arriving" && (
                <Button onClick={() => handleStatusUpdate("completed")} disabled={updating}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold text-base shadow-lg gap-2">
                  <CheckCircle className="w-5 h-5" /> تم التوصيل
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="shrink-0 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between z-50">
        <button onClick={() => navigate("/driver")} className="p-2 rounded-full hover:bg-muted">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="font-bold text-foreground">التوصيل</span>
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
          route={mapRoute}
        />
        {distanceToTarget != null && etaMinutes != null && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm flex items-center gap-3 border border-white/10">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-orange-400" />{distanceToTarget.toFixed(1)} كم</span>
            <span className="text-white/30">|</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-blue-400" />{etaMinutes} د</span>
          </div>
        )}
      </div>

      {/* ─── Bottom Panel ─── */}
      <div className="flex-1 overflow-y-auto">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="p-4 space-y-3"
        >
          {/* Client info card */}
          <div className="rounded-2xl border border-border glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="bg-emerald-500/15 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-500/20">
                {statusInfo.label}
              </div>
              <div className="text-right">
                <p className="text-foreground font-bold text-lg">
                  {clientName}
                  {clientRefCode && (
                    <span className="font-mono text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded-md border border-primary/30 mr-2">
                      {clientRefCode}
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-sm">{clientPhone || "—"}</p>
              </div>
            </div>

            {/* Route */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border">
                <Car className="w-4 h-4 text-emerald-400" />
                <span className="text-sm text-foreground/80 flex-1">{ride.pickup || "موقعي الحالي"}</span>
              </div>
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border">
                <MapPin className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-foreground/80 flex-1">{ride.destination || "الوجهة"}</span>
              </div>
            </div>

            {/* Price & ETA */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-border">
              <span className="text-muted-foreground text-sm">ETA {etaMinutes ? `${etaMinutes} د` : "—"}</span>
              <span className="text-primary font-black text-xl">{totalTripPrice || ride.price || "—"} DH</span>
            </div>
          </div>

          {/* In-app navigation button (replaces external nav links) */}
          {targetPosition && !isFinished && (
            <Button
              onClick={() => setNavMode(true)}
              className="w-full h-12 rounded-xl gap-2 bg-gradient-to-r from-primary to-orange-500 hover:from-primary/90 hover:to-orange-600 text-primary-foreground font-bold text-base"
            >
              <Navigation className="w-5 h-5" />
              ابدأ الملاحة
            </Button>
          )}

          {/* ─── Action Buttons ─── */}
          {!isFinished && (
            <div className="space-y-2.5 pt-1">
              {clientPhone && (
                <a href={`tel:${clientPhone}`} className="block">
                  <Button className="w-full h-13 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold text-base border border-border gap-2">
                    <Phone className="w-5 h-5 text-blue-400" />
                    اتصال بالعميل
                  </Button>
                </a>
              )}

              {ride.status === "accepted" && (
                <Button onClick={() => handleStatusUpdate("in_progress")} disabled={updating}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-lg gap-2">
                  <Send className="w-5 h-5" /> في الطريق
                </Button>
              )}
              {ride.status === "in_progress" && (
                <Button onClick={() => handleStatusUpdate("arriving")} disabled={updating}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-base shadow-lg gap-2">
                  <Car className="w-5 h-5" /> وصلت
                </Button>
              )}
              {ride.status === "arriving" && (
                <Button onClick={() => handleStatusUpdate("completed")} disabled={updating}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold text-base shadow-lg gap-2">
                  <CheckCircle className="w-5 h-5" /> تم التوصيل
                </Button>
              )}

              <Button onClick={() => setCancelDialogOpen(true)} disabled={updating} variant="outline"
                className="w-full h-13 rounded-xl border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-base gap-2">
                <XCircle className="w-5 h-5" /> إلغاء الطلب
              </Button>
            </div>
          )}

          {/* Completed state */}
          {ride.status === "completed" && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
              <p className="text-foreground font-bold text-lg">تم التوصيل بنجاح! 🎉</p>
              <p className="text-muted-foreground text-sm mt-1">
                الأجرة: <span className="text-primary font-bold">{totalTripPrice || ride.price || "—"} DH</span>
              </p>
              <Button onClick={() => navigate("/driver")}
                className="mt-4 w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold">
                العودة للطلبات
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Chat */}
      {rideId && !isFinished && <RideChat rideId={rideId} role="driver" />}

      {rideId && (
        <CancelRideDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          rideId={rideId}
          role="driver"
          onCancelled={() => navigate("/driver")}
        />
      )}
    </div>
  );
};

export default DriverTracking;
