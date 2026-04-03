import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Clock, MapPin, Navigation, Car, XCircle, Star, Sparkles, Shield } from "lucide-react";
import TrackingInfoTable from "@/components/TrackingInfoTable";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import { useSmoothedPosition } from "@/hooks/useSmoothedPosition";
import RideChat from "@/components/RideChat";
import CancelRideDialog from "@/components/CancelRideDialog";
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
  driver_id: string | null;
}

const STATUS_STEPS = [
  { key: "pending", label: "في انتظار سائق", icon: "⏳" },
  { key: "accepted", label: "السائق قبل الطلب", icon: "✅" },
  { key: "in_progress", label: "السائق في الطريق", icon: "🚗" },
  { key: "arriving", label: "السائق وصل!", icon: "📍" },
  { key: "completed", label: "تم التوصيل", icon: "🎉" },
];

const CustomerTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideId = searchParams.get("id");
  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverRefCode, setDriverRefCode] = useState<string | null>(null);
  const [driverRating, setDriverRating] = useState<number | null>(null);
  const [vehicleInfo, setVehicleInfo] = useState<string | null>(null);
  const [driverPhone, setDriverPhone] = useState<string | null>(null);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const inAppCall = useInAppCall();

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
      setDriverLocation(null); setDriverRefCode(null); setVehicleInfo(null); setDriverPhone(null); setDriverRating(null); setDriverName(null);
      return;
    }
    const fetchDriver = async () => {
      const { data: driver } = await supabase
        .from("drivers").select("user_id, current_lat, current_lng, car_id, driver_code, rating")
        .eq("id", ride.driver_id!).single();
      if (!driver) return;
      if (driver.driver_code) setDriverRefCode(driver.driver_code);
      if (driver.rating) setDriverRating(Number(driver.rating));
      if (driver.current_lat && driver.current_lng) {
        setDriverLocation({ lat: Number(driver.current_lat), lng: Number(driver.current_lng) });
      }
      const { data: profile } = await supabase.from("profiles").select("name, phone").eq("id", driver.user_id).single();
      if (profile) { setDriverPhone(profile.phone || null); setDriverName(profile.name || null); }
      if (driver.car_id) {
        const { data: vehicle } = await supabase.from("vehicles").select("brand, model, plate_no, color").eq("id", driver.car_id).single();
        if (vehicle) setVehicleInfo(`${vehicle.brand} ${vehicle.model} — ${vehicle.plate_no}`);
      }
    };
    fetchDriver();
    const channel = supabase
      .channel(`driver-loc-${ride.driver_id}-${Date.now()}`)
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

  const targetPos = useMemo(() => {
    if (!ride) return null;
    if (["pending", "accepted", "in_progress"].includes(ride.status)) return pickupPos;
    return destPos;
  }, [ride, pickupPos, destPos]);

  const mapRoute = useMemo(() => {
    if (smoothedDriver && targetPos) return { pickup: smoothedDriver, destination: targetPos };
    if (pickupPos && destPos) return { pickup: pickupPos, destination: destPos };
    return null;
  }, [smoothedDriver, targetPos, pickupPos, destPos]);

  const distToTarget = useMemo(() => {
    if (!smoothedDriver || !targetPos) return null;
    return haversineKm(smoothedDriver, targetPos);
  }, [smoothedDriver, targetPos]);

  useEffect(() => {
    if (distToTarget != null && initialDistance == null) setInitialDistance(distToTarget);
  }, [distToTarget, initialDistance]);

  useEffect(() => { setInitialDistance(null); }, [ride?.status]);

  const progress = useMemo(() => {
    if (initialDistance == null || initialDistance === 0 || distToTarget == null) return 0;
    return Math.min(1, Math.max(0, 1 - distToTarget / initialDistance));
  }, [distToTarget, initialDistance]);

  const etaMinutes = distToTarget ? Math.max(1, Math.round(distToTarget * 2.5)) : null;

  const mapCenter = useMemo(
    () => smoothedDriver || pickupPos || { lat: 35.7595, lng: -5.834 },
    [smoothedDriver, pickupPos]
  );

  const currentStepIdx = STATUS_STEPS.findIndex(s => s.key === (ride?.status || "pending"));
  const isCompleted = ride?.status === "completed";
  const isCancelled = ride?.status === "cancelled";
  const isActive = ride && !isCompleted && !isCancelled;

  if (!ride) {
    return (
      <div className="h-[calc(100dvh-2.75rem)] flex flex-col items-center justify-center bg-background gap-3" dir="rtl">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
          <Car className="w-10 h-10 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-sm">جارٍ التحميل...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-2.75rem)] flex flex-col bg-background overflow-hidden" dir="rtl">
      {/* ─── Map ─── */}
      <div className="flex-1 relative min-h-0">
        {/* Glossy black borders */}
        <div className="absolute top-0 bottom-0 left-0 w-1 z-[1002] bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-700 shadow-[0_0_6px_rgba(0,0,0,0.8)]" />
        <div className="absolute top-0 bottom-0 right-0 w-1 z-[1002] bg-gradient-to-b from-zinc-700 via-zinc-900 to-zinc-700 shadow-[0_0_6px_rgba(0,0,0,0.8)]" />

        <LeafletMap
          center={mapCenter}
          zoom={14}
          className="w-full h-full"
          showMarker={!!targetPos && !smoothedDriver}
          markerPosition={targetPos || undefined}
          driverLocation={smoothedDriver}
          route={mapRoute}
        />

        {/* ── Status pill ── */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001]">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-card/95 backdrop-blur-xl text-foreground px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-xl border border-border"
          >
            <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-primary animate-pulse" : isCancelled ? "bg-destructive" : "bg-emerald-500"}`} />
            {STATUS_STEPS[currentStepIdx]?.icon || "❓"} {STATUS_STEPS[currentStepIdx]?.label || ride.status}
          </motion.div>
        </div>

        {/* ── Back button ── */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => navigate("/customer")}
          className="absolute top-3 right-3 z-[1001] w-9 h-9 bg-card/90 backdrop-blur-xl rounded-xl flex items-center justify-center border border-border shadow-lg"
        >
          <Navigation className="w-4 h-4 text-foreground" />
        </motion.button>

        {/* ── Driver info floating card ── */}
        <AnimatePresence>
          {ride.driver_id && driverRefCode && ride.status !== "pending" && (
            <motion.div
              initial={{ x: -80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -80, opacity: 0 }}
              className="absolute top-3 left-3 z-[1001] bg-card/95 backdrop-blur-xl rounded-2xl p-2 border border-border shadow-xl max-w-[140px]"
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/20 flex items-center justify-center">
                  <Car className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold text-foreground truncate">{driverName || "السائق"}</p>
                  <p className="text-[9px] font-mono text-primary">{driverRefCode}</p>
                </div>
              </div>
              {(driverRating || vehicleInfo) && (
                <div className="mt-1.5 pt-1.5 border-t border-border/40 space-y-0.5">
                  {driverRating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      <span className="text-[9px] font-bold text-foreground">{driverRating.toFixed(1)}</span>
                    </div>
                  )}
                  {vehicleInfo && (
                    <p className="text-[8px] text-muted-foreground truncate">{vehicleInfo}</p>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Distance + ETA floating ── */}
        <AnimatePresence>
          {distToTarget != null && ride.status !== "pending" && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2"
            >
              <div className="bg-card/95 backdrop-blur-xl px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-border shadow-xl">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-foreground">{distToTarget.toFixed(1)} كم</span>
              </div>
              {etaMinutes && (
                <div className="bg-card/95 backdrop-blur-xl px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-border shadow-xl">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  <span className="font-bold text-foreground">{etaMinutes} د</span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 z-[1002] h-1.5 bg-muted/50">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"
            initial={{ width: "0%" }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* ─── Bottom Panel ─── */}
      <motion.div
        initial={{ y: 60 }}
        animate={{ y: 0 }}
        className="shrink-0 bg-card border-t border-border max-h-[48%] overflow-y-auto"
      >
        {/* Status progress */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center gap-1">
            {STATUS_STEPS.map((step, i) => (
              <div key={step.key} className="flex-1 relative">
                <div className={`h-1.5 rounded-full transition-all duration-700 ${
                  i <= currentStepIdx
                    ? "bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]"
                    : "bg-muted"
                }`} />
                {i === currentStepIdx && i > 0 && (
                  <motion.div
                    layoutId="step-glow"
                    className="absolute -top-0.5 right-0 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)]"
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Shield className="w-3 h-3" />
              {STATUS_STEPS[currentStepIdx]?.label}
            </span>
            <span className="text-sm font-black text-primary">{ride.price || "—"} DH</span>
          </div>
        </div>

        {/* Tracking table */}
        {isActive && (
          <div className="px-3 pb-3">
            <TrackingInfoTable
              title="تفاصيل الرحلة"
              distanceKm={distToTarget ?? null}
              etaMinutes={etaMinutes}
              price={ride.price}
              pickupLabel={ride.pickup || "موقعك"}
              destinationLabel={ride.destination || "الوجهة"}
              referenceCode={driverRefCode || (ride.status === "pending" ? "⏳ بحث..." : null)}
              referenceLabel={ride.status === "pending" ? "الحالة" : "السائق"}
              onCallClient={ride.driver_id ? async () => {
                const { data: driver } = await supabase.from("drivers").select("user_id").eq("id", ride.driver_id!).single();
                if (driver) inAppCall.startCall({ id: driver.user_id, name: driverRefCode || "السائق" });
              } : undefined}
              callDisabled={inAppCall.busy}
              onCancel={() => setCancelDialogOpen(true)}
            />
          </div>
        )}

        {/* Completed */}
        {isCompleted && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="mx-4 mb-4 text-center p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/20">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
            >
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-3" />
            </motion.div>
            <p className="text-foreground font-bold text-lg">تم التوصيل بنجاح! 🎉</p>
            <p className="text-primary font-black text-2xl mt-1">{ride.price || "—"} DH</p>
            {driverRating && (
              <div className="flex items-center justify-center gap-1 mt-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="text-sm font-bold text-foreground">{driverRating.toFixed(1)}</span>
              </div>
            )}
            <Button onClick={() => navigate("/customer")}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold shadow-lg shadow-emerald-500/20">
              <Sparkles className="w-4 h-4" />العودة للرئيسية
            </Button>
          </motion.div>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="mx-4 mb-4 text-center p-5 rounded-2xl bg-destructive/5 border border-destructive/20">
            <XCircle className="w-16 h-16 text-destructive/60 mx-auto mb-3" />
            <p className="text-foreground font-bold text-lg">تم إلغاء الرحلة</p>
            <Button onClick={() => navigate("/customer")} variant="outline"
              className="mt-4 rounded-xl w-full">
              طلب رحلة جديدة
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Chat */}
      {rideId && isActive && ride.status !== "pending" && (
        <RideChat rideId={rideId} role="customer" />
      )}

      {rideId && (
        <CancelRideDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          rideId={rideId}
          role="customer"
          onCancelled={() => navigate("/customer")}
        />
      )}

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

export default CustomerTracking;
