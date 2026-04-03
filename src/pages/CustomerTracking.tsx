import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, MapPin, Phone, User, Navigation, Car, Route as RouteIcon, XCircle, Star, PhoneCall } from "lucide-react";
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
      setDriverLocation(null); setDriverRefCode(null); setVehicleInfo(null); setDriverPhone(null); setDriverRating(null);
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
      if (profile) { setDriverPhone(profile.phone || null); }
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

  // Target position based on status
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

  // Set initial distance once
  useEffect(() => {
    if (distToTarget != null && initialDistance == null) setInitialDistance(distToTarget);
  }, [distToTarget, initialDistance]);

  // Reset on status change
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
      <div className="h-[calc(100dvh-2.75rem)] flex items-center justify-center bg-background" dir="rtl">
        <div className="text-primary animate-pulse text-lg">جارٍ التحميل...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100dvh-2.75rem)] flex flex-col bg-background overflow-hidden" dir="rtl">
      {/* ─── Map Section (top half) ─── */}
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

        {/* Status pill */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1001]">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-card/90 backdrop-blur-xl text-foreground px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg border border-border"
          >
            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-primary animate-pulse" : isCancelled ? "bg-destructive" : "bg-emerald-500"}`} />
            {STATUS_STEPS[currentStepIdx]?.icon || "❓"} {STATUS_STEPS[currentStepIdx]?.label || ride.status}
          </motion.div>
        </div>

        {/* Distance + ETA overlay */}
        {distToTarget != null && ride.status !== "pending" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1001] flex items-center gap-2">
            <div className="bg-card/90 backdrop-blur-xl px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-border shadow-lg">
              <Car className="w-3.5 h-3.5 text-primary" />
              <span className="font-bold text-foreground">{distToTarget.toFixed(1)} كم</span>
            </div>
            {etaMinutes && (
              <div className="bg-card/90 backdrop-blur-xl px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-border shadow-lg">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span className="font-bold text-foreground">{etaMinutes} د</span>
              </div>
            )}
          </div>
        )}

        {/* Progress bar at bottom of map */}
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
        className="shrink-0 bg-card border-t border-border max-h-[45%] overflow-y-auto"
      >
        {/* Status progress steps */}
        <div className="px-4 pt-3 pb-2">
          <div className="flex items-center gap-1">
            {STATUS_STEPS.map((step, i) => (
              <div key={step.key} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                i <= currentStepIdx ? "bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.4)]" : "bg-muted"
              }`} />
            ))}
          </div>
        </div>

        {/* Always show tracking table for active rides */}
        {isActive && (
          <div className="p-3">
            <TrackingInfoTable
              distanceKm={distToTarget ?? null}
              etaMinutes={etaMinutes}
              price={ride.price}
              pickupLabel={ride.pickup || "موقعك"}
              destinationLabel={ride.destination || "الوجهة"}
              referenceCode={driverRefCode || (ride.status === "pending" ? "⏳" : null)}
              referenceLabel={ride.status === "pending" ? "الحالة" : "رمز السائق"}
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
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center p-6">
            <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-3" />
            <p className="text-foreground font-bold text-lg">تم التوصيل بنجاح! 🎉</p>
            <p className="text-muted-foreground text-sm mt-1">
              الأجرة: <span className="text-primary font-bold">{ride.price || "—"} DH</span>
            </p>
            <Button onClick={() => navigate("/customer")}
              className="mt-4 w-full rounded-xl font-bold">
              العودة للرئيسية
            </Button>
          </motion.div>
        )}

        {/* Cancelled */}
        {isCancelled && (
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="text-center p-6">
            <XCircle className="w-14 h-14 text-destructive mx-auto mb-3" />
            <p className="text-foreground font-bold text-lg">تم إلغاء الرحلة ❌</p>
            <Button onClick={() => navigate("/customer")} variant="outline"
              className="mt-4 rounded-xl">
              طلب جديد
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

export default CustomerTracking;
