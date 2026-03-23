import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { MapPin, Navigation, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";

const DEFAULT_LOCATION = { lat: 35.7595, lng: -5.834 };
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

const CustomerPage = () => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState("");
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Get user GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation(DEFAULT_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(DEFAULT_LOCATION),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Simple geocoding via Supabase edge function or manual coords
  const handleSetDestination = useCallback(() => {
    if (!destination.trim()) return;
    // Try parsing "lat,lng" format
    const parts = destination.split(",").map((s) => parseFloat(s.trim()));
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      setDestCoords({ lat: parts[0], lng: parts[1] });
      return;
    }
    // Default: offset from user location as demo
    const base = userLocation || DEFAULT_LOCATION;
    setDestCoords({ lat: base.lat + 0.02, lng: base.lng + 0.015 });
  }, [destination, userLocation]);

  const rideDistance = userLocation && destCoords ? haversineKm(userLocation, destCoords) : null;
  // السعر = 5 (رسوم ثابتة) + (المسافة الإجمالية × 3)
  // ملاحظة: مسافة السائق→الزبون تُضاف عند حسابها في صفحة السائق
  const price = rideDistance ? Math.round(BASE_FARE + rideDistance * PRICE_PER_KM) : null;
  const distance = rideDistance;

  const handleCreateRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }
    if (!userLocation || !destCoords || !distance || !price) {
      toast({ title: "حدد الوجهة أولاً", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("ride_requests").insert({
        user_id: user.id,
        pickup: `${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`,
        destination: destination || `${destCoords.lat.toFixed(5)},${destCoords.lng.toFixed(5)}`,
        pickup_lat: userLocation.lat,
        pickup_lng: userLocation.lng,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
        distance: parseFloat(distance.toFixed(2)),
        price: price,
        status: "pending",
      });

      if (error) throw error;
      toast({ title: "تم إنشاء الطلب بنجاح ✅" });
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen customer-bg pb-8" dir="rtl">
      {/* Header */}
      <div className="customer-header sticky top-0 z-50 px-4 py-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-xl text-white">زبون</span>
        </div>
      </div>

      {/* Map */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-blue-500/20 h-56 relative">
        <LeafletMap
          center={destCoords || userLocation || DEFAULT_LOCATION}
          zoom={14}
          showMarker={!!userLocation}
          markerPosition={userLocation || undefined}
        />
        {userLocation && (
          <div className="absolute top-3 right-3 z-[1000] bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border border-blue-500/30 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            تم تحديد موقعك
          </div>
        )}
      </div>

      {/* Destination Input */}
      <div className="px-4 mt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="customer-card rounded-2xl p-5 border border-blue-500/20">
            <h2 className="text-white font-bold mb-4 flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-400" />
              إلى أين تريد الذهاب؟
            </h2>

            <div className="space-y-3">
              {/* Current location display */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/10 border border-blue-500/15">
                <div className="w-3 h-3 rounded-full bg-blue-400" />
                <div className="flex-1">
                  <p className="text-xs text-blue-300/70">موقعك الحالي</p>
                  <p className="text-sm text-blue-100">
                    {userLocation
                      ? `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                      : "جارٍ تحديد الموقع..."}
                  </p>
                </div>
              </div>

              {/* Destination input */}
              <div className="flex gap-2">
                <Input
                  value={destination}
                  onChange={(e) => {
                    setDestination(e.target.value);
                    setDestCoords(null);
                    setSubmitted(false);
                  }}
                  placeholder="أدخل الوجهة أو الإحداثيات (lat,lng)"
                  className="flex-1 bg-blue-950/50 border-blue-500/20 text-white placeholder:text-blue-300/40 focus:border-blue-400"
                />
                <Button
                  onClick={handleSetDestination}
                  variant="outline"
                  className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Price estimate */}
          {destCoords && distance !== null && price !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="customer-card rounded-2xl p-5 border border-blue-500/20">
              <div className="flex justify-between items-center">
                <div className="text-center">
                  <p className="text-xs text-blue-300/70">المسافة</p>
                  <p className="text-lg font-bold text-blue-300">{distance.toFixed(1)} كم</p>
                </div>
                <div className="w-px h-10 bg-blue-500/20" />
                <div className="text-center">
                  <p className="text-xs text-blue-300/70">السعر المبدئي</p>
                  <p className="text-2xl font-bold text-blue-400">{price} DH</p>
                </div>
                <div className="w-px h-10 bg-blue-500/20" />
                <div className="text-center">
                  <p className="text-xs text-blue-300/70">الوقت المقدر</p>
                  <p className="text-lg font-bold text-blue-300">{Math.max(2, Math.round(distance * 2.5))} د</p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-500/15 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-blue-300/70">رسوم ثابتة</span>
                  <span className="text-blue-200">{BASE_FARE} DH</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-300/70">مسافة الرحلة ({distance.toFixed(1)} كم × {PRICE_PER_KM} DH)</span>
                  <span className="text-blue-200">{Math.round(distance * PRICE_PER_KM)} DH</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-blue-300/70">مسافة السائق إليك</span>
                  <span className="text-yellow-400">تُحسب بعد قبول الطلب</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Submit button */}
          {destCoords && !submitted && (
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
                  إنشاء الطلب
                </>
              )}
            </Button>
          )}

          {submitted && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-center p-6 customer-card rounded-2xl border border-blue-400/30">
              <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
                <Navigation className="w-8 h-8 text-blue-400" />
              </div>
              <p className="text-white font-bold text-lg">تم إرسال الطلب!</p>
              <p className="text-blue-300/70 text-sm mt-1">في انتظار قبول سائق...</p>
              <Button
                onClick={() => {
                  setSubmitted(false);
                  setDestination("");
                  setDestCoords(null);
                }}
                variant="outline"
                className="mt-4 border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
              >
                طلب جديد
              </Button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default CustomerPage;
