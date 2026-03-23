import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, Navigation, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";

const DEFAULT_LOCATION = { lat: 35.7595, lng: -5.834 };

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const CustomerPage = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { drivers: nearbyDrivers } = useNearbyDrivers();
  const { name: pickupName, loading: pickupLoading } = useReverseGeocode(userLocation);
  const { name: destName, loading: destLoading } = useReverseGeocode(destCoords);

  useEffect(() => {
    if (!navigator.geolocation) { setUserLocation(DEFAULT_LOCATION); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(DEFAULT_LOCATION),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleMapClick = useCallback((latlng: { lat: number; lng: number }) => {
    setDestCoords(latlng);
  }, []);

  const rideDistance = userLocation && destCoords ? haversineKm(userLocation, destCoords) : null;

  const handleCreateRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }
    if (!userLocation || !destCoords) {
      toast({ title: "اضغط على الخريطة لتحديد الوجهة", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.from("ride_requests").insert({
        user_id: user.id,
        pickup: pickupName || `${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`,
        destination: destName || `${destCoords.lat.toFixed(5)},${destCoords.lng.toFixed(5)}`,
        pickup_lat: userLocation.lat,
        pickup_lng: userLocation.lng,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
        distance: rideDistance ? parseFloat(rideDistance.toFixed(2)) : null,
        price: 0,
        status: "pending",
      }).select("id").single();

      if (error) throw error;
      toast({ title: "تم إنشاء الطلب ✅", description: "جارٍ البحث عن سائق..." });
      navigate(`/customer-tracking?id=${data.id}`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const mapRoute = userLocation && destCoords ? { pickup: userLocation, destination: destCoords } : null;

  return (
    <div className="min-h-screen bg-[#0a0f1a] pb-8" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-4 flex items-center justify-center bg-[#0a0f1a]/90 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-xl text-white">طلب رحلة</span>
        </div>
      </div>

      {/* Map - tap to set destination */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-blue-500/20 h-72 relative">
        <LeafletMap
          center={userLocation || DEFAULT_LOCATION}
          zoom={14}
          showMarker={!!userLocation}
          markerPosition={userLocation || undefined}
          nearbyDrivers={nearbyDrivers}
          route={mapRoute}
          onMapClick={handleMapClick}
        />
        {/* Instruction overlay */}
        <div className="absolute top-3 right-3 z-[1000] bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border border-blue-500/30 backdrop-blur-sm">
          <MapPin className="w-3 h-3" />
          اضغط على الخريطة لتحديد الوجهة
        </div>
        {userLocation && (
          <div className="absolute bottom-3 right-3 z-[1000] bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border border-emerald-500/30 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            موقعك محدد
          </div>
        )}
      </div>

      <div className="px-4 mt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Ride info card */}
          {destCoords && rideDistance !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 border border-blue-500/20 bg-[#0d1320]">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/50">نقطة الانطلاق</p>
                    <p className="text-sm text-white truncate">
                      {pickupLoading ? "جارٍ تحديد الموقع..." : (pickupName || `${userLocation?.lat.toFixed(4)}, ${userLocation?.lng.toFixed(4)}`)}
                    </p>
                  </div>
                </div>
                <div className="mr-1.5 border-r border-dashed border-white/20 h-4" />
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-orange-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/50">الوجهة</p>
                    <p className="text-sm text-white truncate">
                      {destLoading ? "جارٍ تحديد الموقع..." : (destName || `${destCoords.lat.toFixed(4)}, ${destCoords.lng.toFixed(4)}`)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/10">
                <div className="text-center">
                  <p className="text-xs text-white/50">المسافة</p>
                  <p className="text-lg font-bold text-blue-300">{rideDistance.toFixed(1)} كم</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-xs text-white/50">الوقت المقدر</p>
                  <p className="text-lg font-bold text-blue-300">{Math.max(2, Math.round(rideDistance * 2.5))} د</p>
                </div>
                <div className="w-px h-10 bg-white/10" />
                <div className="text-center">
                  <p className="text-xs text-white/50">السعر</p>
                  <p className="text-lg font-bold text-amber-400">يُحدد بعد القبول</p>
                </div>
              </div>

              <button
                onClick={() => setDestCoords(null)}
                className="mt-3 text-xs text-red-400 hover:text-red-300 underline"
              >
                إعادة تحديد الوجهة
              </button>
            </motion.div>
          )}

          {/* Submit button */}
          {destCoords && (
            <Button
              onClick={handleCreateRequest}
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-[0_0_20px_hsl(220,80%,50%,0.3)]"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Navigation className="w-5 h-5 ml-2" />
                  تأكيد الطلب
                </>
              )}
            </Button>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CustomerPage;
