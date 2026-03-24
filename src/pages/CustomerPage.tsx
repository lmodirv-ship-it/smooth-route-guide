import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Loader2, Search, MapPinned, ChevronDown, DollarSign, X, Car, Clock, Sparkles, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import BottomNav from "@/components/BottomNav";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { tangierLocations, locationCategories, TangierLocation } from "@/data/tangierLocations";
import { usePricingSettings } from "@/hooks/usePricingSettings";

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

// calcPrice is now defined inside the component using DB settings

const CustomerPage = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { drivers: nearbyDrivers } = useNearbyDrivers();
  const { name: pickupName, loading: pickupLoading } = useReverseGeocode(userLocation);
  const { name: destName, loading: destLoading } = useReverseGeocode(destCoords);
  const pricing = usePricingSettings();

  const calcPrice = useCallback((km: number) => {
    return Math.max(pricing.minFare, Math.round(pricing.baseFare + km * pricing.perKmRate));
  }, [pricing.minFare, pricing.baseFare, pricing.perKmRate]);

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
      navigate(`/customer/tracking?id=${data.id}`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const mapRoute = userLocation && destCoords ? { pickup: userLocation, destination: destCoords } : null;

  const LocationPicker = ({ type, onClose }: { type: "pickup" | "dest"; onClose: () => void }) => (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="fixed inset-0 z-[9999] gradient-dark flex flex-col"
      dir="rtl"
    >
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
            <MapPinned className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-bold text-foreground text-lg">
              {type === "pickup" ? "نقطة الانطلاق" : "اختر الوجهة"}
            </h2>
            <p className="text-xs text-muted-foreground">طنجة، المغرب</p>
          </div>
        </div>
        <button onClick={onClose} className="w-9 h-9 rounded-xl glass flex items-center justify-center hover:bg-secondary transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="ابحث عن حي، شارع أو مكان..."
            className="pr-10 h-12 glass border-border rounded-2xl text-sm focus:border-primary/50 focus:ring-primary/20"
            autoFocus
          />
        </div>
      </div>

      {/* Category pills */}
      <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
        {locationCategories.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all duration-200 ${
              activeCategory === cat.key
                ? "gradient-primary text-primary-foreground shadow-lg glow-primary"
                : "glass text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Locations */}
      <div className="flex-1 overflow-auto px-5 pb-6 space-y-2">
        {filteredLocations.map((loc, i) => {
          const dist = userLocation ? haversineKm(userLocation, loc) : null;
          const locPrice = dist !== null ? calcPrice(dist) : null;
          return (
            <motion.button
              key={i}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              onClick={() => selectLocation(loc, type)}
              className="w-full flex items-center gap-3 p-4 rounded-2xl glass border border-border hover:border-primary/30 transition-all duration-200 text-right group"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{loc.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{loc.area}</p>
              </div>
              {dist !== null && type === "dest" && (
                <div className="text-left shrink-0 space-y-0.5">
                  <p className="text-[11px] text-muted-foreground">{dist.toFixed(1)} كم</p>
                  <p className="text-sm font-bold text-primary">{locPrice} DH</p>
                </div>
              )}
            </motion.button>
          );
        })}
        {filteredLocations.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">لا توجد نتائج</p>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen gradient-dark pb-8 relative overflow-hidden" dir="rtl">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/3 blur-[150px]" />
        <div className="absolute bottom-1/3 left-0 w-[300px] h-[300px] rounded-full bg-info/3 blur-[100px]" />
      </div>

      {/* Header */}
      <div className="sticky top-0 z-50 px-5 py-4 flex items-center justify-between glass-strong border-b border-border">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground px-2 py-1 rounded-full glass border border-border">
            {nearbyDrivers.length > 0 ? `${nearbyDrivers.length} سائق متاح` : "جارٍ البحث..."}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-bold text-xl text-gradient-primary font-display">طلب رحلة</span>
        </div>
      </div>

      {/* Location selectors */}
      <div className="px-5 mt-5 relative z-10">
        <div className="glass-strong rounded-2xl border border-border p-4 space-y-3">
          {/* Pickup */}
          <button
            onClick={() => { setShowPickupPicker(true); setShowDestPicker(false); }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all duration-200 group"
          >
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
              </div>
            </div>
            <div className="flex-1 text-right min-w-0">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">نقطة الانطلاق</p>
              <p className="text-sm font-medium text-foreground truncate mt-0.5">
                {selectedPickupName || (pickupLoading ? "جارٍ تحديد الموقع..." : pickupName || "موقعك الحالي")}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </button>

          {/* Divider with line */}
          <div className="flex items-center gap-3 px-3">
            <div className="w-10 flex justify-center">
              <div className="w-0.5 h-6 bg-gradient-to-b from-green-500/50 to-primary/50 rounded-full" />
            </div>
            <div className="flex-1 border-t border-dashed border-border" />
          </div>

          {/* Destination */}
          <button
            onClick={() => { setShowDestPicker(true); setShowPickupPicker(false); }}
            className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.5)]" />
            </div>
            <div className="flex-1 text-right min-w-0">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">الوجهة</p>
              <p className="text-sm font-medium text-foreground truncate mt-0.5">
                {selectedDestName || (destCoords ? (destLoading ? "جارٍ تحديد..." : destName || "وجهة محددة") : "إلى أين تريد الذهاب؟")}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors" />
          </button>
        </div>
      </div>

      {/* Map */}
      <div className="mx-5 mt-4 rounded-2xl overflow-hidden border border-border relative z-10" style={{ height: destCoords ? "200px" : "280px" }}>
        <LeafletMap
          center={userLocation || DEFAULT_LOCATION}
          zoom={14}
          showMarker={!!userLocation}
          markerPosition={userLocation || undefined}
          nearbyDrivers={nearbyDrivers}
          route={mapRoute}
          onMapClick={handleMapClick}
        />
        <div className="absolute top-3 right-3 z-[1000] glass-strong px-3 py-2 rounded-xl text-xs flex items-center gap-2 border border-border shadow-lg">
          <Crosshair className="w-3.5 h-3.5 text-primary" />
          <span className="text-foreground">اضغط لتحديد الوجهة</span>
        </div>
        {userLocation && (
          <div className="absolute bottom-3 right-3 z-[1000] glass-strong px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 border border-border">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
            <span className="text-foreground">موقعك</span>
          </div>
        )}
      </div>

      {/* Price card */}
      <div className="px-5 mt-4 relative z-10">
        <AnimatePresence mode="wait">
          {destCoords && rideDistance !== null && price !== null && (
            <motion.div
              key="price-card"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="space-y-4"
            >
              {/* Trip details */}
              <div className="glass-strong rounded-2xl border border-border overflow-hidden">
                {/* Route visualization */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                      <div className="w-0.5 h-8 bg-gradient-to-b from-green-500/50 to-primary/50 rounded-full" />
                      <div className="w-3 h-3 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.5)]" />
                    </div>
                    <div className="flex-1 space-y-5">
                      <div>
                        <p className="text-[11px] text-muted-foreground">الانطلاق</p>
                        <p className="text-sm font-medium text-foreground truncate">{selectedPickupName || pickupName || "موقعك الحالي"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground">الوجهة</p>
                        <p className="text-sm font-medium text-foreground truncate">{selectedDestName || destName || "الوجهة"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 border-t border-border">
                  <div className="p-4 text-center border-l border-border">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Navigation className="w-3.5 h-3.5 text-info" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{rideDistance.toFixed(1)}</p>
                    <p className="text-[11px] text-muted-foreground">كم</p>
                  </div>
                  <div className="p-4 text-center border-l border-border">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Clock className="w-3.5 h-3.5 text-warning" />
                    </div>
                    <p className="text-lg font-bold text-foreground">{Math.max(2, Math.round(rideDistance * 2.5))}</p>
                    <p className="text-[11px] text-muted-foreground">دقيقة</p>
                  </div>
                  <div className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <DollarSign className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <p className="text-lg font-bold text-primary">{price}</p>
                    <p className="text-[11px] text-muted-foreground">درهم</p>
                  </div>
                </div>

                {/* Pricing formula */}
                <div className="px-5 py-3 bg-primary/5 border-t border-primary/10">
                  <p className="text-xs text-muted-foreground text-center">
                    💡 {rideDistance.toFixed(1)} كم × 3 = <span className="font-bold text-primary">{price} DH</span>
                    {price === 3 && " (الحد الأدنى)"}
                  </p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => { setDestCoords(null); setSelectedDestName(null); }}
                  className="flex-1 h-12 rounded-2xl glass border-border text-muted-foreground hover:text-foreground"
                >
                  إعادة تحديد
                </Button>
                <Button
                  onClick={handleCreateRequest}
                  disabled={submitting}
                  className="flex-[2] h-14 rounded-2xl gradient-primary text-primary-foreground font-bold text-base glow-primary shadow-xl"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span className="flex items-center gap-2">
                      <Car className="w-5 h-5" />
                      تأكيد — {price} DH
                    </span>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty state hint */}
        {!destCoords && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-6"
          >
            <div className="inline-flex items-center gap-2 glass rounded-2xl px-5 py-3 border border-border">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="text-sm text-muted-foreground">اختر وجهتك من القائمة أو اضغط على الخريطة</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Location Pickers */}
      <AnimatePresence>
        {showPickupPicker && <LocationPicker type="pickup" onClose={() => { setShowPickupPicker(false); setSearchQuery(""); setActiveCategory("all"); }} />}
        {showDestPicker && <LocationPicker type="dest" onClose={() => { setShowDestPicker(false); setSearchQuery(""); setActiveCategory("all"); }} />}
      </AnimatePresence>

      <BottomNav role="client" />
    </div>
  );
};

export default CustomerPage;
