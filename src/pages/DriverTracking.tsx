import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Navigation, CheckCircle, XCircle, MapPin, Clock, Car, Send, ChevronUp, ChevronDown, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import RideChat from "@/components/RideChat";
import CancelRideDialog from "@/components/CancelRideDialog";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { useI18n } from "@/i18n/context";
import { useInAppCall } from "@/hooks/useInAppCall";
import InAppCallDialog from "@/components/calls/InAppCallDialog";

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

const STATUS_STEPS = ["accepted", "in_progress", "arriving", "completed"];
const STATUS_LABELS: Record<string, { label: string; icon: string }> = {
  accepted: { label: "تم قبول الطلب", icon: "✅" },
  in_progress: { label: "في الطريق للزبون", icon: "🚗" },
  arriving: { label: "وصلت — في انتظار الزبون", icon: "📍" },
  completed: { label: "تم التوصيل بنجاح", icon: "🎉" },
  cancelled: { label: "تم الإلغاء", icon: "❌" },
};

const DriverTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideIdParam = searchParams.get("id");
  const [rideId, setRideId] = useState<string | null>(rideIdParam);
  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [clientRefCode, setClientRefCode] = useState<string | null>(null);
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const pricing = usePricingSettings();
  const { dir } = useI18n();
  const inAppCall = useInAppCall();

  // Auto-find active ride
  useEffect(() => {
    if (rideIdParam) { setRideId(rideIdParam); return; }
    const findActiveRide = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      
      // Get driver record
      const { data: driverRecord } = await supabase.from("drivers").select("id").eq("user_id", user.id).single();
      if (!driverRecord) { setLoading(false); return; }
      
      const { data } = await supabase
        .from("ride_requests").select("id")
        .eq("driver_id", driverRecord.id)
        .in("status", ["accepted", "in_progress", "arriving"])
        .order("created_at", { ascending: false }).limit(1);
      if (data && data.length > 0) setRideId(data[0].id);
      else setLoading(false);
    };
    findActiveRide();
  }, [rideIdParam]);

  // GPS watch
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watcher = navigator.geolocation.watchPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 3000 }
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
        current_lat: driverLocation.lat, current_lng: driverLocation.lng,
        location_updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    };
    const t = setTimeout(updateLoc, 4000);
    return () => clearTimeout(t);
  }, [driverLocation]);

  // Fetch ride data
  const fetchRide = useCallback(async () => {
    if (!rideId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("ride_requests").select("*").eq("id", rideId).single();
      if (fetchErr) throw fetchErr;
      if (!data) { setError("لم يتم العثور على الرحلة"); setRide(null); }
      else {
        setRide(data as RideData);
        const { data: profile } = await supabase
          .from("profiles").select("phone, user_code").eq("id", data.user_id).single();
        if (profile) {
          setClientPhone(profile.phone || null);
          setClientRefCode((profile as any).user_code || null);
        }
      }
    } catch (err: any) {
      setError(err.message || "خطأ"); setRide(null);
    } finally { setLoading(false); }
  }, [rideId]);

  useEffect(() => {
    fetchRide();
    if (!rideId) return;
    const channel = supabase
      .channel(`ride-track-${rideId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "ride_requests", filter: `id=eq.${rideId}` },
        (payload) => { setRide(payload.new as RideData); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [rideId, fetchRide]);

  const smoothedDriver = useSmoothedPosition(driverLocation);

  const targetPosition = useMemo(() => {
    if (!ride) return null;
    if (["accepted", "in_progress"].includes(ride.status) && ride.pickup_lat && ride.pickup_lng)
      return { lat: ride.pickup_lat, lng: ride.pickup_lng };
    if (["arriving", "completed"].includes(ride.status) && ride.destination_lat && ride.destination_lng)
      return { lat: ride.destination_lat, lng: ride.destination_lng };
    return null;
  }, [ride]);

  const distanceToTarget = useMemo(() => {
    if (!driverLocation || !targetPosition) return null;
    return haversineKm(driverLocation, targetPosition);
  }, [driverLocation, targetPosition]);

  // Set initial distance once
  useEffect(() => {
    if (distanceToTarget != null && initialDistance == null) {
      setInitialDistance(distanceToTarget);
    }
  }, [distanceToTarget, initialDistance]);

  // Reset initial distance on status change
  useEffect(() => {
    setInitialDistance(null);
  }, [ride?.status]);

  // Progress bar (0 to 1)
  const progress = useMemo(() => {
    if (initialDistance == null || initialDistance === 0 || distanceToTarget == null) return 0;
    return Math.min(1, Math.max(0, 1 - distanceToTarget / initialDistance));
  }, [distanceToTarget, initialDistance]);

  // Price from DB settings
  const totalTripPrice = useMemo(() => {
    if (!ride) return ride?.price || null;
    let pickupToDest = ride.distance || 0;
    if (!pickupToDest && ride.pickup_lat && ride.pickup_lng && ride.destination_lat && ride.destination_lng) {
      pickupToDest = haversineKm({ lat: ride.pickup_lat, lng: ride.pickup_lng }, { lat: ride.destination_lat, lng: ride.destination_lng });
    }
    if (pickupToDest > 0) {
      return Math.max(pricing.minFare, Math.round(pricing.baseFare + pickupToDest * pricing.perKmRate));
    }
    return ride.price || null;
  }, [ride, pricing]);

  const etaMinutes = distanceToTarget ? Math.max(1, Math.round(distanceToTarget * 2.5)) : null;

  const mapCenter = useMemo(
    () => smoothedDriver || targetPosition || { lat: 35.7595, lng: -5.834 },
    [smoothedDriver, targetPosition]
  );

  // Throttle route updates to avoid OSRM rate limits (429)
  const lastRouteFetchRef = useRef<number>(0);
  const [throttledDriverPos, setThrottledDriverPos] = useState(smoothedDriver);

  useEffect(() => {
    if (!smoothedDriver) return;
    const now = Date.now();
    if (!throttledDriverPos || now - lastRouteFetchRef.current > 30000) {
      setThrottledDriverPos(smoothedDriver);
      lastRouteFetchRef.current = now;
    }
  }, [smoothedDriver]);

  useEffect(() => {
    if (smoothedDriver) {
      setThrottledDriverPos(smoothedDriver);
      lastRouteFetchRef.current = Date.now();
    }
  }, [ride?.status]);

  const mapRoute = useMemo(() => {
    if (!ride) return null;
    if (throttledDriverPos && targetPosition) {
      return { pickup: throttledDriverPos, destination: targetPosition };
    }
    if (ride.pickup_lat && ride.pickup_lng && ride.destination_lat && ride.destination_lng) {
      return { pickup: { lat: ride.pickup_lat, lng: ride.pickup_lng }, destination: { lat: ride.destination_lat, lng: ride.destination_lng } };
    }
    return null;
  }, [ride, throttledDriverPos, targetPosition]);

  const handleStatusUpdate = async (newStatus: string) => {
    if (!rideId || updating) return;
    setUpdating(true);
    try {
      const updates: any = { status: newStatus };
      if (newStatus === "completed" && totalTripPrice) updates.price = totalTripPrice;
      const { error } = await supabase.from("ride_requests").update(updates).eq("id", rideId);
      if (error) throw error;
      if (newStatus === "completed" || newStatus === "cancelled") navigate("/driver");
    } catch (err: any) { console.error(err); }
    finally { setUpdating(false); }
  };

  const statusStep = STATUS_STEPS.indexOf(ride?.status || "");

  // Loading / Error / No ride states
  if (loading) return (
    <div className="h-dvh bg-background flex items-center justify-center" dir={dir}>
      <div className="text-primary animate-pulse text-lg">جارٍ التحميل...</div>
    </div>
  );
  if (!rideId || (!ride && !error)) return (
    <div className="h-dvh bg-background flex flex-col items-center justify-center gap-4" dir={dir}>
      <MapPin className="w-14 h-14 text-muted-foreground/30" />
      <p className="text-muted-foreground text-lg">لا توجد رحلة نشطة</p>
      <Button onClick={() => navigate("/driver")} className="rounded-xl">العودة</Button>
    </div>
  );
  if (error || !ride) return (
    <div className="h-dvh bg-background flex flex-col items-center justify-center gap-4" dir={dir}>
      <XCircle className="w-14 h-14 text-destructive/50" />
      <p className="text-destructive">{error}</p>
      <div className="flex gap-3">
        <Button onClick={fetchRide} variant="outline" className="rounded-xl">إعادة</Button>
        <Button onClick={() => navigate("/driver")} className="rounded-xl">العودة</Button>
      </div>
    </div>
  );

  const statusInfo = STATUS_LABELS[ride.status] || { label: ride.status, icon: "📦" };
  const isFinished = ride.status === "completed" || ride.status === "cancelled";

  const nextAction = ride.status === "accepted"
    ? { label: "🚗 في الطريق", status: "in_progress", colors: "from-amber-500 to-orange-500" }
    : ride.status === "in_progress"
    ? { label: "📍 وصلت للزبون", status: "arriving", colors: "from-blue-500 to-cyan-500" }
    : ride.status === "arriving"
    ? { label: "✅ تم التوصيل", status: "completed", colors: "from-emerald-500 to-green-500" }
    : null;

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden" dir={dir}>
      {/* ── Fullscreen Map ── */}
      <div className="flex-1 relative min-h-0">
        <LeafletMap
          center={mapCenter}
          zoom={16}
          className="w-full h-full"
          showMarker={!!targetPosition}
          markerPosition={targetPosition || undefined}
          driverLocation={smoothedDriver}
          route={mapRoute}
        />

        {/* Top floating: distance + ETA */}
        {distanceToTarget != null && etaMinutes != null && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1001] bg-card/95 backdrop-blur-xl px-5 py-2.5 rounded-2xl text-sm flex items-center gap-4 border border-border shadow-xl">
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <MapPin className="w-4 h-4 text-primary" />{distanceToTarget.toFixed(1)} كم
            </span>
            <div className="w-px h-5 bg-border" />
            <span className="flex items-center gap-1.5 font-bold text-foreground">
              <Clock className="w-4 h-4 text-blue-500" />{etaMinutes} د
            </span>
          </div>
        )}

        {/* Back button */}
        <button
          onClick={() => navigate("/driver")}
          className="absolute top-4 right-4 z-[1001] w-10 h-10 bg-card/90 backdrop-blur-xl rounded-full flex items-center justify-center border border-border shadow-lg"
        >
          <Navigation className="w-5 h-5 text-foreground" />
        </button>

        {/* Client reference floating */}
        {clientRefCode && (
          <div className="absolute top-4 left-4 z-[1001] bg-primary/90 backdrop-blur-xl px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
            <span className="text-primary-foreground text-xs font-mono font-bold">{clientRefCode}</span>
          </div>
        )}

        {/* Progress bar at bottom of map */}
        <div className="absolute bottom-0 left-0 right-0 z-[1001] h-1.5 bg-muted/50">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ── Bottom Action Panel ── */}
      <div className="shrink-0 bg-card border-t border-border safe-area-bottom">
        {/* Status steps */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex-1 flex items-center gap-1">
                <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                  i <= statusStep ? "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.4)]" : "bg-muted"
                }`} />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-muted-foreground">{statusInfo.icon} {statusInfo.label}</span>
            <span className="text-lg font-black text-primary">{totalTripPrice || ride.price || "—"} DH</span>
          </div>
        </div>

        {/* Expandable details */}
        <button
          onClick={() => setPanelOpen(!panelOpen)}
          className="w-full flex items-center justify-center py-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {panelOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
        </button>

        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden px-4 pb-2"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border">
                  <Car className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-sm text-foreground/80 flex-1 truncate">{ride.pickup || "نقطة الانطلاق"}</span>
                </div>
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30 border border-border">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground/80 flex-1 truncate">{ride.destination || "الوجهة"}</span>
                </div>
                {ride.user_id && (
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl gap-2 border-border"
                    onClick={() => inAppCall.startCall({ id: ride.user_id, name: clientRefCode || "الزبون" })}
                    disabled={inAppCall.busy}
                  >
                    <PhoneCall className="w-4 h-4 text-blue-500" /> اتصال بالزبون (داخلي)
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main action button */}
        {!isFinished && nextAction && (
          <div className="px-4 pb-3 pt-1 space-y-2">
            <Button
              onClick={() => handleStatusUpdate(nextAction.status)}
              disabled={updating}
              className={`w-full h-14 rounded-2xl bg-gradient-to-r ${nextAction.colors} text-white font-bold text-base shadow-xl gap-2`}
            >
              {updating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : nextAction.label}
            </Button>

            {/* In-app call button */}
            {ride.user_id && (
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl gap-2 border-blue-500/30 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"
                onClick={() => inAppCall.startCall({ id: ride.user_id, name: clientRefCode || "الزبون" })}
                disabled={inAppCall.busy}
              >
                <PhoneCall className="w-4 h-4" /> اتصال بالزبون
              </Button>
            )}

            {/* Cancel button */}
            <Button
              onClick={() => setCancelDialogOpen(true)}
              disabled={updating}
              variant="outline"
              className="w-full h-10 rounded-xl border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm gap-1 font-bold"
            >
              <XCircle className="w-4 h-4" /> إلغاء الرحلة
            </Button>
          </div>
        )}

        {/* Completed */}
        {ride.status === "completed" && (
          <div className="px-4 pb-4">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-2" />
              <p className="text-foreground font-bold text-lg">تم التوصيل بنجاح! 🎉</p>
              <p className="text-primary font-black text-2xl mt-1">{totalTripPrice || ride.price || "—"} DH</p>
              <Button onClick={() => navigate("/driver")}
                className="mt-3 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                العودة
              </Button>
            </motion.div>
          </div>
        )}
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

      {/* In-App Call Dialog */}
      <InAppCallDialog
        incomingCall={inAppCall.incomingCall}
        activeCall={inAppCall.activeCall}
        localStream={inAppCall.localStream}
        remoteStream={inAppCall.remoteStream}
        isMuted={inAppCall.isMuted}
        isVideoEnabled={inAppCall.isVideoEnabled}
        onAccept={inAppCall.acceptCall}
        onEnd={inAppCall.endCall}
        onToggleMute={inAppCall.toggleMute}
        onToggleVideo={inAppCall.toggleVideo}
        busy={inAppCall.busy}
        callDuration={inAppCall.callDuration}
        connectionQuality={inAppCall.connectionQuality}
      />
    </div>
  );
};

export default DriverTracking;
