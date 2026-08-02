import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Loader2, Search, X, Car, Clock, Crosshair, Bell, Globe,
  Users, Eye, ShoppingBag, Wallet as WalletIcon, Star, ShieldCheck, Share2, Radio,
  Headphones, CalendarClock, Plus, Minus, StickyNote, CreditCard, Banknote, Zap, Crown, Bus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { useReverseGeocode } from "@/hooks/useReverseGeocode";
import { usePricingSettings } from "@/hooks/usePricingSettings";
import { useUserReference } from "@/hooks/useUserReference";
import { useI18n } from "@/i18n/context";
import { rideStudioT } from "@/i18n/rideStudio";
import { tangierLocations, locationCategories, TangierLocation } from "@/data/tangierLocations";
import { useUiStudio, DENSITY_GAP, type UiStudioOptions } from "@/hooks/useUiStudio";

const DEFAULT_LOCATION = { lat: 35.7595, lng: -5.834 };

const ICONS: Record<string, typeof Car> = { car: Car, bus: Bus, crown: Crown, zap: Zap };

interface VehicleType {
  id: string;
  code: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  icon: string;
  price_multiplier: number;
  max_passengers: number;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

const RideStudioLayout = () => {
  const navigate = useNavigate();
  const { t, dir, locale } = useI18n();
  const s = rideStudioT(locale);
  const ui = useUiStudio("customer");
  const o: UiStudioOptions = ui.options;

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedPickupName, setSelectedPickupName] = useState<string | null>(null);
  const [selectedDestName, setSelectedDestName] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState<"pickup" | "dest" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [vehicleCode, setVehicleCode] = useState("economy");
  const [passengers, setPassengers] = useState(1);
  const [payment, setPayment] = useState<"cash" | "card" | "wallet">("cash");
  const [notes, setNotes] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);

  const { drivers: nearbyDrivers } = useNearbyDrivers();
  const { name: pickupName, loading: pickupLoading } = useReverseGeocode(userLocation);
  const { name: destName } = useReverseGeocode(destCoords);
  const pricing = usePricingSettings();
  const { userCode } = useUserReference();

  useEffect(() => {
    if (!navigator.geolocation) { setUserLocation(DEFAULT_LOCATION); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserLocation(DEFAULT_LOCATION),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ride_vehicle_types")
        .select("id, code, name_ar, name_fr, name_en, icon, price_multiplier, max_passengers")
        .eq("is_active", true)
        .order("sort_order");
      if (data?.length) setVehicleTypes(data as VehicleType[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data: w }, { data: st }] = await Promise.all([
        supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("reward_stars").select("stars").eq("user_id", user.id).maybeSingle(),
      ]);
      if (w) setBalance(Number((w as any).balance) || 0);
      if (st) setPoints(Number((st as any).stars) || 0);
    })();
  }, []);

  const activeVehicle = vehicleTypes.find(v => v.code === vehicleCode);
  const multiplier = activeVehicle?.price_multiplier ?? 1;
  const vehicleLabel = (v: VehicleType) =>
    locale === "ar" ? v.name_ar : locale === "fr" ? v.name_fr || v.name_en : v.name_en || v.name_ar;

  const rideDistance = userLocation && destCoords ? haversineKm(userLocation, destCoords) : null;
  const basePrice = useMemo(() => {
    if (rideDistance === null) return null;
    return Math.max(pricing.minFare, Math.round((pricing.baseFare + rideDistance * pricing.perKmRate) * multiplier));
  }, [rideDistance, pricing.minFare, pricing.baseFare, pricing.perKmRate, multiplier]);
  const priceLow = basePrice !== null ? Math.round(basePrice * 0.9) : null;
  const priceHigh = basePrice !== null ? Math.round(basePrice * 1.2) : null;
  const etaLow = rideDistance !== null ? Math.max(5, Math.round(rideDistance * 2.2)) : null;
  const etaHigh = rideDistance !== null ? Math.max(8, Math.round(rideDistance * 3.2)) : null;

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

  const selectLocation = (loc: TangierLocation) => {
    const coords = { lat: loc.lat, lng: loc.lng };
    if (picker === "pickup") { setUserLocation(coords); setSelectedPickupName(loc.name); }
    else { setDestCoords(coords); setSelectedDestName(loc.name); }
    setPicker(null); setSearchQuery(""); setActiveCategory("all");
  };

  const handleMapClick = useCallback((latlng: { lat: number; lng: number }) => {
    setDestCoords(latlng);
    setSelectedDestName(null);
  }, []);

  const recenter = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setSelectedPickupName(null); },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const submit = async (scheduled?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: s.loginRequired, variant: "destructive" }); return; }
    if (!userLocation || !destCoords) { toast({ title: s.selectBoth, variant: "destructive" }); return; }

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
        price: basePrice || 0,
        status: "pending",
        vehicle_type: vehicleCode,
        passengers,
        customer_notes: notes || null,
        payment_method: payment,
        scheduled_at: scheduled ? new Date(scheduled).toISOString() : null,
      }).select("id").single();
      if (error) throw error;
      toast({ title: scheduled ? s.scheduled : s.created, description: `${s.estimatedCost}: ${basePrice} ${s.currency}` });
      navigate(`/customer/tracking?id=${data.id}`);
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setScheduleOpen(false);
    }
  };

  const shareTrip = async () => {
    const url = `${window.location.origin}/customer/tracking`;
    try { await navigator.clipboard.writeText(url); toast({ title: s.linkCopied }); } catch { /* ignore */ }
  };

  const radius = `${o.radius}px`;
  const gap = DENSITY_GAP[o.density];
  const mapRoute = userLocation && destCoords ? { pickup: userLocation, destination: destCoords } : null;

  const Stat = ({ icon: Icon, value, label }: { icon: typeof Eye; value: string; label: string }) => (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl glass border border-border/60 shrink-0">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <div className="leading-none">
        <p className="text-[11px] font-bold text-foreground">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100dvh-2.75rem)] gradient-dark pb-24" dir={dir}>
      {/* Top stats bar */}
      {o.showTopBar && (
        <div className="sticky top-0 z-40 glass-strong border-b border-border px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Stat icon={Radio} value={String(nearbyDrivers.length)} label={s.driversAvailable} />
          <Stat icon={WalletIcon} value={balance !== null ? `${balance} ${s.currency}` : "—"} label={s.balance} />
          <Stat icon={Star} value={points !== null ? String(points) : "—"} label={s.activityPoints} />
          <div className="flex-1" />
          <button onClick={() => navigate("/customer/notifications")} className="w-8 h-8 rounded-xl glass border border-border flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="w-8 h-8 rounded-xl glass border border-border flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      )}

      <div className="px-3 pt-3" style={{ display: "flex", flexDirection: "column", gap }}>
        {/* Compact quick cards */}
        {o.showQuickCards && (
          <div className="grid grid-cols-2" style={{ gap }}>
            <button
              onClick={() => setPicker("pickup")}
              className="glass-card p-2.5 text-start border border-border hover:border-primary/40 transition-colors"
              style={{ borderRadius: radius }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2 h-2 rounded-full bg-success" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.pickup}</span>
              </div>
              <p className="text-xs font-semibold text-foreground truncate">
                {selectedPickupName || (pickupLoading ? s.locating : pickupName || s.yourLocation)}
              </p>
            </button>
            <button
              onClick={() => setPicker("dest")}
              className="glass-card p-2.5 text-start border border-border hover:border-primary/40 transition-colors"
              style={{ borderRadius: radius }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.destination}</span>
              </div>
              <p className="text-xs font-semibold text-foreground truncate">
                {selectedDestName || destName || s.destinationPlaceholder}
              </p>
            </button>
            {userCode && (
              <div className="glass-card p-2.5 border border-border" style={{ borderRadius: radius }}>
                <p className="text-[10px] text-muted-foreground mb-1">{s.plate}</p>
                <p className="text-xs font-mono font-bold text-primary">{userCode}</p>
              </div>
            )}
            <div className="glass-card p-2.5 border border-border" style={{ borderRadius: radius }}>
              <p className="text-[10px] text-muted-foreground mb-1">{s.requestRide}</p>
              <p className="text-xs font-semibold text-foreground">
                {nearbyDrivers.length > 0 ? `${nearbyDrivers.length} ${s.driversAvailable}` : s.searching}
              </p>
            </div>
          </div>
        )}

        {/* Map — biggest element */}
        <div
          className="relative overflow-hidden border border-border"
          style={{ height: o.mapHeight, borderRadius: radius, boxShadow: `0 0 ${o.glow}px hsl(var(--primary) / ${Math.min(o.glow, 60) / 200})` }}
        >
          <LeafletMap
            center={userLocation || DEFAULT_LOCATION}
            markerPosition={destCoords || undefined}
            nearbyDrivers={nearbyDrivers.map(d => ({ id: d.id, lat: d.lat, lng: d.lng } as any))}
            route={mapRoute}
            onMapClick={handleMapClick}
            expandable={false}
            hideControls
            className="w-full h-full"
          />
          <div className="absolute bottom-3 end-3 flex flex-col gap-2 z-[500]">
            <button onClick={recenter} className="w-9 h-9 rounded-xl glass-strong border border-border flex items-center justify-center" aria-label={s.myLocation}>
              <Crosshair className="w-4 h-4 text-primary" />
            </button>
            <button onClick={() => setPicker("dest")} className="w-9 h-9 rounded-xl glass-strong border border-border flex items-center justify-center" aria-label={s.pickOnMap}>
              <Navigation className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>

        {/* Extra options */}
        {o.showOptionsBar && (
          <div className="glass-card p-3 border border-border" style={{ borderRadius: radius }}>
            <p className="text-[11px] text-muted-foreground mb-2">{s.extraOptions}</p>

            <p className="text-[10px] text-muted-foreground mb-1.5">{s.rideType}</p>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
              {vehicleTypes.map(v => {
                const Icon = ICONS[v.icon] || Car;
                const active = v.code === vehicleCode;
                return (
                  <button
                    key={v.id}
                    onClick={() => { setVehicleCode(v.code); setPassengers(p => Math.min(p, v.max_passengers)); }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium whitespace-nowrap border transition-all ${
                      active ? "gradient-primary text-primary-foreground border-transparent" : "glass border-border text-muted-foreground"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {vehicleLabel(v)}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="glass p-2 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground mb-1.5">{s.passengers}</p>
                <div className="flex items-center justify-between">
                  <button onClick={() => setPassengers(p => Math.max(1, p - 1))} className="w-6 h-6 rounded-lg glass border border-border flex items-center justify-center">
                    <Minus className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <span className="text-sm font-bold text-foreground">{passengers}</span>
                  <button
                    onClick={() => setPassengers(p => Math.min(activeVehicle?.max_passengers ?? 4, p + 1))}
                    className="w-6 h-6 rounded-lg glass border border-border flex items-center justify-center"
                  >
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div className="glass p-2 rounded-xl border border-border">
                <p className="text-[10px] text-muted-foreground mb-1.5">{s.payment}</p>
                <div className="flex gap-1">
                  {([["cash", Banknote, s.cash], ["card", CreditCard, s.card], ["wallet", WalletIcon, s.wallet]] as const).map(([code, Icon, label]) => (
                    <button
                      key={code}
                      onClick={() => setPayment(code)}
                      className={`flex-1 py-1 rounded-lg text-[9px] flex flex-col items-center gap-0.5 border transition-all ${
                        payment === code ? "bg-primary/15 border-primary/40 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowNotes(v => !v)}
              className="mt-2 w-full flex items-center gap-2 px-3 py-2 rounded-xl glass border border-border text-[11px] text-muted-foreground"
            >
              <StickyNote className="w-3.5 h-3.5 text-primary" />
              {notes ? notes.slice(0, 40) : s.addNote}
            </button>
            {showNotes && (
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={s.notePlaceholder}
                className="mt-2 text-xs glass border-border rounded-xl"
                rows={2}
              />
            )}
          </div>
        )}

        {/* Fare card */}
        {o.showFareCard && (
          <div className="glass-card p-3 border border-border flex items-center justify-around" style={{ borderRadius: radius }}>
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">{s.estimatedCost}</p>
              <p className="text-sm font-bold text-primary">
                {priceLow !== null ? `${priceLow}–${priceHigh} ${s.currency}` : "—"}
              </p>
            </div>
            <div className="w-px h-7 bg-border" />
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">{s.duration}</p>
              <p className="text-sm font-bold text-foreground">{etaLow !== null ? `${etaLow}–${etaHigh} ${s.min}` : "—"}</p>
            </div>
            <div className="w-px h-7 bg-border" />
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground">{s.distance}</p>
              <p className="text-sm font-bold text-foreground">{rideDistance !== null ? `${rideDistance.toFixed(1)} ${s.km}` : "—"}</p>
            </div>
          </div>
        )}

        {/* Safety strip */}
        {o.showSafetyStrip && (
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: ShieldCheck, label: s.safeTrip, action: () => undefined },
              { icon: Radio, label: s.liveTracking, action: () => navigate("/customer/tracking") },
              { icon: Share2, label: s.shareTrip, action: shareTrip },
              { icon: Headphones, label: s.support, action: () => navigate("/support") },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="glass p-2 border border-border flex flex-col items-center gap-1"
                style={{ borderRadius: radius }}
              >
                <item.icon className="w-4 h-4 text-primary" />
                <span className="text-[9px] text-muted-foreground text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-12 px-4 rounded-2xl border-border glass text-xs"
            onClick={() => setScheduleOpen(true)}
          >
            <CalendarClock className="w-4 h-4 me-1.5" />
            {s.scheduleLater}
          </Button>
          <Button
            onClick={() => submit()}
            disabled={submitting || !destCoords}
            className="flex-1 h-12 rounded-2xl gradient-primary text-primary-foreground font-bold glow-primary"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Car className="w-4 h-4 me-2" />{s.requestNow}</>}
          </Button>
        </div>
      </div>

      {/* Schedule sheet */}
      <AnimatePresence>
        {scheduleOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] bg-background/80 backdrop-blur-sm flex items-end"
            onClick={() => setScheduleOpen(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              onClick={e => e.stopPropagation()}
              className="w-full glass-strong border-t border-border rounded-t-3xl p-5 space-y-3"
              dir={dir}
            >
              <h3 className="font-bold text-foreground">{s.scheduleTitle}</h3>
              <p className="text-xs text-muted-foreground">{s.scheduleHint}</p>
              <Input type="datetime-local" value={scheduleAt} onChange={e => setScheduleAt(e.target.value)} className="glass border-border rounded-xl" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setScheduleOpen(false)}>{s.cancel}</Button>
                <Button className="flex-1 rounded-xl gradient-primary text-primary-foreground" disabled={!scheduleAt || submitting} onClick={() => submit(scheduleAt)}>
                  {s.confirm}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location picker */}
      <AnimatePresence>
        {picker && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed inset-0 z-[2001] gradient-dark flex flex-col"
            dir={dir}
          >
            <div className="px-5 py-4 flex items-center justify-between">
              <h2 className="font-bold text-foreground text-lg">{picker === "pickup" ? s.pickup : s.destination}</h2>
              <button onClick={() => setPicker(null)} className="w-9 h-9 rounded-xl glass flex items-center justify-center">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <div className="px-5 pb-3 relative">
              <Search className="absolute end-8 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="h-12 glass border-border rounded-2xl text-sm" autoFocus />
            </div>
            <div className="px-5 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
              {locationCategories.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-4 py-2 rounded-xl text-xs font-medium whitespace-nowrap ${
                    activeCategory === cat.key ? "gradient-primary text-primary-foreground" : "glass text-muted-foreground border border-border"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-auto px-5 pb-6 space-y-2">
              {filteredLocations.map((loc, i) => (
                <button
                  key={i}
                  onClick={() => selectLocation(loc)}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl glass border border-border text-start"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{loc.name}</p>
                    <p className="text-xs text-muted-foreground">{loc.area}</p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RideStudioLayout;
