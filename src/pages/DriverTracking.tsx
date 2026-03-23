import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Phone, Navigation, CheckCircle, XCircle, MapPin, User, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import NavigationLinks from "@/components/NavigationLinks";
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
  user_id: string;
}

const DriverTracking = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rideId = searchParams.get("id");
  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [clientName, setClientName] = useState("الزبون");

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

  // Fetch ride data + realtime
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
        // Fetch client name
        const { data: profile } = await supabase
          .from("profiles")
          .select("name")
          .eq("id", data.user_id)
          .single();
        if (profile?.name) setClientName(profile.name);
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
    if (ride.status === "accepted" && ride.pickup_lat && ride.pickup_lng) {
      return { lat: ride.pickup_lat, lng: ride.pickup_lng };
    }
    if (["in_progress", "arriving"].includes(ride.status) && ride.destination_lat && ride.destination_lng) {
      return { lat: ride.destination_lat, lng: ride.destination_lng };
    }
    return null;
  }, [ride]);

  const distanceToTarget = useMemo(() => {
    if (!driverLocation || !targetPosition) return null;
    return haversineKm(driverLocation, targetPosition);
  }, [driverLocation, targetPosition]);

  const etaMinutes = distanceToTarget ? Math.max(1, Math.round(distanceToTarget * 2.5)) : null;

  const mapCenter = useMemo(
    () => smoothedDriver || targetPosition || { lat: 35.7595, lng: -5.834 },
    [smoothedDriver, targetPosition]
  );

  const handleStatusUpdate = async (newStatus: string) => {
    if (!rideId) return;
    await supabase
      .from("ride_requests")
      .update({ status: newStatus })
      .eq("id", rideId);
    if (newStatus === "completed" || newStatus === "cancelled") {
      navigate("/driver-panel");
    }
  };

  if (!ride) {
    return (
      <div className="min-h-screen driver-bg flex items-center justify-center" dir="rtl">
        <div className="text-emerald-300 animate-pulse">جارٍ التحميل...</div>
      </div>
    );
  }

  const statusLabels: Record<string, string> = {
    accepted: "في الطريق للزبون",
    arriving: "وصلت للزبون",
    in_progress: "الرحلة جارية",
    completed: "تم إتمام الرحلة",
  };

  return (
    <div className="min-h-screen driver-bg flex flex-col" dir="rtl">
      {/* Header */}
      <div className="driver-header sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver-panel")} className="p-2">
          <ArrowRight className="w-5 h-5 text-emerald-300" />
        </button>
        <span className="font-bold text-lg text-white">تتبع الرحلة</span>
        <div className="w-9" />
      </div>

      {/* Map */}
      <div className="flex-1 relative min-h-[40vh]">
        <LeafletMap
          center={mapCenter}
          zoom={15}
          className="w-full h-full"
          showMarker={!!targetPosition}
          markerPosition={targetPosition || undefined}
          driverLocation={smoothedDriver}
        />

        {/* Status badge */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-emerald-600/90 text-white px-4 py-2 rounded-full text-sm font-bold backdrop-blur-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          {statusLabels[ride.status] || ride.status}
        </div>

        {/* Distance/ETA overlay */}
        {distanceToTarget != null && etaMinutes != null && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[1000] bg-black/70 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm flex items-center gap-3">
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{distanceToTarget.toFixed(1)} كم</span>
            <span className="text-emerald-300/50">|</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{etaMinutes} دقيقة</span>
          </div>
        )}
      </div>

      {/* Bottom panel */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="bg-[hsl(var(--card))] border-t border-emerald-500/20 rounded-t-3xl p-5 space-y-4"
      >
        {/* Client info */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {ride.user_id && (
              <a href={`tel:0600000000`} className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Phone className="w-5 h-5 text-emerald-400" />
              </a>
            )}
          </div>
          <div className="text-right">
            <p className="text-white font-bold flex items-center gap-2 justify-end">
              <User className="w-4 h-4 text-emerald-400" />
              {clientName}
            </p>
            <p className="text-emerald-300/60 text-xs">{ride.status === "accepted" ? "في انتظارك" : "جارية"}</p>
          </div>
        </div>

        {/* Route info */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-white flex-1">{ride.pickup || "نقطة الانطلاق"}</span>
          </div>
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/15">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <span className="text-white flex-1">{ride.destination || "الوجهة"}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex justify-between items-center text-sm px-1">
          <span className="text-emerald-400 font-bold text-lg">{ride.price || "—"} DH</span>
          <span className="text-emerald-300/60">{ride.distance ? `${ride.distance} كم` : ""}</span>
        </div>

        {/* Navigation button (Waze priority) */}
        {targetPosition && (
          <NavigationLinks
            lat={targetPosition.lat}
            lng={targetPosition.lng}
            label={ride.status === "accepted" ? "نقطة الاستلام" : "الوجهة"}
            compact
          />
        )}

        {/* Action buttons */}
        <div className="grid gap-3">
          {ride.status === "accepted" && (
            <Button
              onClick={() => handleStatusUpdate("in_progress")}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
            >
              <Navigation className="w-5 h-5" />
              بدأت الرحلة
            </Button>
          )}
          {ride.status === "in_progress" && (
            <Button
              onClick={() => handleStatusUpdate("completed")}
              className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
            >
              <CheckCircle className="w-5 h-5" />
              تم التوصيل
            </Button>
          )}
          {!["completed", "cancelled"].includes(ride.status) && (
            <Button
              variant="outline"
              onClick={() => handleStatusUpdate("cancelled")}
              className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 rounded-xl"
            >
              <XCircle className="w-4 h-4 ml-2" />
              إلغاء الرحلة
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DriverTracking;
