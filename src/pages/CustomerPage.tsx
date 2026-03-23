import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Loader2, Search, MapPinned, ChevronDown, DollarSign, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { tangierLocations, locationCategories, TangierLocation } from "@/data/tangierLocations";

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

function calcPrice(km: number) {
  return Math.max(10, Math.round(km * 3 + 5));
}

const CustomerPage = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { drivers: nearbyDrivers } = useNearbyDrivers();
  const { name: pickupName, loading: pickupLoading } = useReverseGeocode(userLocation);
  const { name: destName, loading: destLoading } = useReverseGeocode(destCoords);

  // Location picker state
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedPickupName, setSelectedPickupName] = useState<string | null>(null);
  const [selectedDestName, setSelectedDestName] = useState<string | null>(null);

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
    setSelectedDestName(null);
  }, []);

  const rideDistance = userLocation && destCoords ? haversineKm(userLocation, destCoords) : null;
  const price = rideDistance !== null ? calcPrice(rideDistance) : null;

  const filteredLocations = useMemo(() => {
    let filtered = tangierLocations;
    if (activeCategory !== "all") {
      if (activeCategory === "other") {
        const mainCats = locationCategories.filter(c => c.key !== "all" && c.key !== "other").map(c => c.key);
        filtered = filtered.filter(l => !mainCats.includes(l.area));
      } else {
        filtered = filtered.filter(l => l.area === activeCategory);
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(l => l.name.toLowerCase().includes(q) || l.area.toLowerCase().includes(q));
    }
    return filtered;
  }, [activeCategory, searchQuery]);

  const selectLocation = (loc: TangierLocation, type: "pickup" | "dest") => {
    const coords = { lat: loc.lat, lng: loc.lng };
    if (type === "pickup") {
      setUserLocation(coords);
      setSelectedPickupName(loc.name);
      setShowPickupPicker(false);
    } else {
      setDestCoords(coords);
      setSelectedDestName(loc.name);
      setShowDestPicker(false);
    }
    setSearchQuery("");
    setActiveCategory("all");
  };

  const handleCreateRequest = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }
    if (!userLocation || !destCoords) {
      toast({ title: "حدد نقطة الانطلاق والوجهة", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const finalPickup = selectedPickupName || pickupName || `${userLocation.lat.toFixed(5)},${userLocation.lng.toFixed(5)}`;
      const finalDest = selectedDestName || destName || `${destCoords.lat.toFixed(5)},${destCoords.lng.toFixed(5)}`;

      const { data, error } = await supabase.from("ride_requests").insert({
        user_id: user.id,
        pickup: finalPickup,
        destination: finalDest,
        pickup_lat: userLocation.lat,
        pickup_lng: userLocation.lng,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
        distance: rideDistance ? parseFloat(rideDistance.toFixed(2)) : null,
        price: price || 0,
        status: "pending",
      }).select("id").single();

      if (error) throw error;
      toast({ title: "تم إنشاء الطلب ✅", description: `السعر: ${price} درهم` });
      navigate(`/customer-tracking?id=${data.id}`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const mapRoute = userLocation && destCoords ? { pickup: userLocation, destination: destCoords } : null;

  const LocationPicker = ({ type, onClose }: { type: "pickup" | "dest"; onClose: () => void }) => (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      className="fixed inset-0 z-[9999] bg-background/95 backdrop-blur-md flex flex-col"
      dir="rtl"
    >
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <MapPinned className="w-5 h-5 text-primary" />
          {type === "pickup" ? "اختر نقطة الانطلاق" : "اختر الوجهة"}
        </h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary"><X className="w-5 h-5 text-muted-foreground" /></button>
      </div>

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث عن حي، شارع أو مكان..."
            className="pr-9 bg-secondary/60 border-border rounded-xl"
            autoFocus
          />
        </div>
      </div>

      {/* Category filters */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
        {locationCategories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat.key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-secondary/80"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Location list */}
      <div className="flex-1 overflow-auto px-4 pb-4 space-y-1.5">
        {filteredLocations.map((loc, i) => {
          const dist = userLocation ? haversineKm(userLocation, loc).toFixed(1) : null;
          return (
            <button
              key={i}
              onClick={() => selectLocation(loc, type)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/40 hover:bg-secondary/70 transition-colors text-right"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{loc.name}</p>
                <p className="text-xs text-muted-foreground">{loc.area}</p>
              </div>
              {dist && type === "dest" && (
                <div className="text-left shrink-0">
                  <p className="text-xs text-muted-foreground">{dist} كم</p>
                  <p className="text-xs font-bold text-primary">{calcPrice(parseFloat(dist))} DH</p>
                </div>
              )}
            </button>
          );
        })}
        {filteredLocations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">لا توجد نتائج</div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background pb-8" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 px-4 py-4 flex items-center justify-center bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-6 h-6 text-primary" />
          <span className="font-bold text-xl text-foreground">طلب رحلة</span>
        </div>
      </div>

      {/* Location selectors */}
      <div className="px-4 mt-4 space-y-2">
        <button
          onClick={() => { setShowPickupPicker(true); setShowDestPicker(false); }}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
        >
          <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
          <div className="flex-1 text-right min-w-0">
            <p className="text-xs text-muted-foreground">نقطة الانطلاق</p>
            <p className="text-sm text-foreground truncate">
              {selectedPickupName || (pickupLoading ? "جارٍ تحديد الموقع..." : pickupName || "موقعك الحالي")}
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>

        <button
          onClick={() => { setShowDestPicker(true); setShowPickupPicker(false); }}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
        >
          <div className="w-3 h-3 rounded-full bg-orange-500 shrink-0" />
          <div className="flex-1 text-right min-w-0">
            <p className="text-xs text-muted-foreground">الوجهة</p>
            <p className="text-sm text-foreground truncate">
              {selectedDestName || (destCoords ? (destLoading ? "جارٍ تحديد..." : destName || "وجهة محددة على الخريطة") : "اختر وجهتك...")}
            </p>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* Map */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-primary/20 h-64 relative">
        <LeafletMap
          center={userLocation || DEFAULT_LOCATION}
          zoom={14}
          showMarker={!!userLocation}
          markerPosition={userLocation || undefined}
          nearbyDrivers={nearbyDrivers}
          route={mapRoute}
          onMapClick={handleMapClick}
        />
        <div className="absolute top-3 right-3 z-[1000] bg-primary/20 text-primary px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border border-primary/30 backdrop-blur-sm">
          <MapPin className="w-3 h-3" />
          أو اضغط على الخريطة
        </div>
      </div>

      <div className="px-4 mt-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Price card */}
          {destCoords && rideDistance !== null && price !== null && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl p-5 border border-primary/20 bg-card">
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  <span className="font-bold text-foreground">تفاصيل الرحلة</span>
                </div>
                <button
                  onClick={() => { setDestCoords(null); setSelectedDestName(null); }}
                  className="text-xs text-destructive hover:underline"
                >
                  إعادة تحديد
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                  <p className="text-sm text-foreground truncate">{selectedPickupName || pickupName || "موقعك الحالي"}</p>
                </div>
                <div className="mr-1 border-r border-dashed border-muted h-3" />
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <p className="text-sm text-foreground truncate">{selectedDestName || destName || "الوجهة"}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 bg-secondary/50 rounded-xl p-3">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">المسافة</p>
                  <p className="text-lg font-bold text-foreground">{rideDistance.toFixed(1)}<span className="text-xs text-muted-foreground mr-1">كم</span></p>
                </div>
                <div className="text-center border-x border-border">
                  <p className="text-xs text-muted-foreground">الوقت</p>
                  <p className="text-lg font-bold text-foreground">{Math.max(2, Math.round(rideDistance * 2.5))}<span className="text-xs text-muted-foreground mr-1">د</span></p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">السعر</p>
                  <p className="text-lg font-bold text-primary">{price}<span className="text-xs text-muted-foreground mr-1">DH</span></p>
                </div>
              </div>

              <div className="mt-3 p-2 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-xs text-muted-foreground text-center">
                  💡 الحساب: {rideDistance.toFixed(1)} كم × 3 + 5 = <span className="font-bold text-primary">{price} درهم</span>
                  {price === 10 && " (الحد الأدنى 10 DH)"}
                </p>
              </div>
            </motion.div>
          )}

          {/* Submit */}
          {destCoords && price !== null && (
            <Button
              onClick={handleCreateRequest}
              disabled={submitting}
              className="w-full h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-lg glow-primary"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Navigation className="w-5 h-5 ml-2" />
                  تأكيد الطلب — {price} DH
                </>
              )}
            </Button>
          )}
        </motion.div>
      </div>

      {/* Location Pickers */}
      <AnimatePresence>
        {showPickupPicker && <LocationPicker type="pickup" onClose={() => { setShowPickupPicker(false); setSearchQuery(""); setActiveCategory("all"); }} />}
        {showDestPicker && <LocationPicker type="dest" onClose={() => { setShowDestPicker(false); setSearchQuery(""); setActiveCategory("all"); }} />}
      </AnimatePresence>
    </div>
  );
};

export default CustomerPage;
