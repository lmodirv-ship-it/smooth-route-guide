import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Loader2, Search, X, Car, Clock, Crosshair, Bell, Globe,
  Users, Eye, ShoppingBag, Wallet as WalletIcon, Star, ShieldCheck, Share2, Radio,
  Headphones, CalendarClock, Plus, Minus, StickyNote, CreditCard, Banknote, Zap, Crown, Bus,
  ChevronDown, Sparkles, Info,
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
  const [openField, setOpenField] = useState<"vehicle" | "payment" | null>(null);
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

  const Stat = ({ icon: Icon, value, label, tone }: { icon: typeof Eye; value: string; label: string; tone: string }) => (
    <div className="flex items-center gap-1.5 px-2.5 shrink-0">
      <Icon className={`w-4 h-4 ${tone}`} />
      <div className="leading-tight">
        <p className="text-[12px] font-bold text-foreground">{value}</p>
        <p className="text-[9px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );

  const Field = ({ icon: Icon, label, value, onClick }: { icon: typeof Eye; label: string; value: string; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="glass-card border border-border/70 px-2.5 py-2 text-start w-full hover:border-primary/40 transition-colors"
      style={{ borderRadius: radius }}
    >
      <p className="text-[9px] text-muted-foreground mb-1.5 truncate">{label}</p>
      <div className="flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        <span className="text-[11px] font-semibold text-foreground truncate flex-1">{value}</span>
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      </div>
    </button>
  );

  return (
    <div className="min-h-[calc(100dvh-2.75rem)] gradient-dark pb-28" dir={dir}>
      {/* Top bar — avatar + stats pill + balance + actions */}
      {o.showTopBar && (
        <div className="sticky top-0 z-40 bg-background/85 backdrop-blur-xl px-2.5 py-2.5">
          <div className="flex items-center gap-2">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full gradient-primary flex items-center justify-center border-2 border-border/60 overflow-hidden">
                <Car className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-success border-2 border-background" />
            </div>

            <div className="flex-1 min-w-0 flex items-center glass-card border border-border/70 rounded-2xl py-1.5 overflow-x-auto no-scrollbar divide-x divide-border/60 rtl:divide-x-reverse">
              <Stat icon={Eye} value="—" label={s.views} tone="text-info" />
              <Stat icon={Users} value={String(nearbyDrivers.length)} label={s.driversAvailable} tone="text-success" />
              <Stat icon={TrendingUp} value={points !== null ? String(points) : "—"} label={s.todayOrders} tone="text-primary" />
            </div>

            <div className="glass-card border border-border/70 rounded-2xl px-2.5 py-1.5 shrink-0 text-center">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold text-foreground">
                  {balance !== null ? `${s.currency} ${balance}` : "—"}
                </span>
                <WalletIcon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-[9px] text-muted-foreground">{s.balance}</p>
            </div>

            <button
              onClick={() => navigate("/customer/notifications")}
              className="relative w-10 h-10 rounded-2xl glass-card border border-border/70 flex items-center justify-center shrink-0"
            >
              <Bell className="w-4 h-4 text-primary" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center border border-background">
                  {unreadCount}
                </span>
              )}
            </button>
            <div className="w-10 h-10 rounded-2xl glass-card border border-border/70 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-muted-foreground" />
            </div>

          </div>
        </div>
      )}

      <div className="px-2.5 pt-2.5" style={{ display: "flex", flexDirection: "column", gap }}>
        {/* Compact info cards row */}
        {o.showQuickCards && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar" style={{ gap }}>
            {/* Ride badge */}
            <div className="glass-card border border-primary/25 p-2.5 shrink-0 w-[112px]" style={{ borderRadius: radius }}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] font-bold text-foreground leading-tight">{s.requestRide.split(" ")[0]}</p>
                  <p className="text-[13px] font-bold text-primary leading-tight">{s.requestRide.split(" ").slice(1).join(" ")}</p>
                </div>
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                <span className="text-[9px] text-muted-foreground truncate">
                  {nearbyDrivers.length > 0 ? `${nearbyDrivers.length} ${s.driversAvailable}` : s.searching}
                </span>
              </div>
            </div>

            {/* Activity points */}
            <div className="glass-card border border-border/70 p-2.5 shrink-0 w-[132px]" style={{ borderRadius: radius }}>
              <p className="text-[9px] text-muted-foreground text-end">{s.activityPoints}</p>
              <p className="text-[15px] font-bold text-foreground text-end leading-tight">{points ?? 0}/999</p>
              <div className="h-1.5 rounded-full bg-secondary/60 mt-1.5 overflow-hidden">
                <div className="h-full rounded-full bg-success" style={{ width: `${Math.min(100, ((points ?? 0) / 999) * 100)}%` }} />
              </div>
              <div className="flex items-center justify-end gap-1 mt-1.5">
                <span className="text-[9px] text-muted-foreground">{s.safeTrip}</span>
                <ShieldCheck className="w-3 h-3 text-success" />
              </div>
            </div>

            {/* Plate */}
            {userCode && (
              <div className="glass-card border border-border/70 p-2.5 shrink-0 w-[120px] text-end" style={{ borderRadius: radius }}>
                <p className="text-[9px] text-muted-foreground">{s.plate}</p>
                <p className="text-[15px] font-mono font-bold text-foreground leading-tight">{userCode}</p>
                <div className="flex justify-end mt-1.5">
                  <span className="w-7 h-7 rounded-full bg-primary/12 border border-primary/25 flex items-center justify-center">
                    <Car className="w-3.5 h-3.5 text-primary" />
                  </span>
                </div>
              </div>
            )}

            {/* Pickup */}
            <button
              onClick={() => setPicker("pickup")}
              className="glass-card border border-border/70 p-2.5 shrink-0 w-[190px] text-start"
              style={{ borderRadius: radius }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-[9px] text-muted-foreground">{s.pickup}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-foreground truncate mt-0.5">
                    {selectedPickupName || (pickupLoading ? s.locating : pickupName || s.yourLocation)}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">{s.pickOnMap}</p>
                </div>
                <span className="w-9 h-9 rounded-full bg-success/12 border border-success/25 flex items-center justify-center shrink-0">
                  <Crosshair className="w-4 h-4 text-success" />
                </span>
              </div>
            </button>

            {/* Destination */}
            <button
              onClick={() => setPicker("dest")}
              className="glass-card border border-border/70 p-2.5 shrink-0 w-[210px] text-start"
              style={{ borderRadius: radius }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-info" />
                    <span className="text-[9px] text-muted-foreground">{s.destination}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-foreground truncate mt-0.5">
                    {selectedDestName || destName || s.destinationPlaceholder}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate">{s.pickOnMap}</p>
                </div>
                <span className="w-9 h-9 rounded-full bg-info/12 border border-info/25 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-info" />
                </span>
              </div>
            </button>
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
          <button
            onClick={() => setPicker("dest")}
            className="absolute top-3 start-3 z-[500] flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-background/70 backdrop-blur-md border border-border/60 text-[11px] text-foreground"
          >
            <Crosshair className="w-3.5 h-3.5 text-muted-foreground" />
            {s.pickOnMap}
          </button>
          <div className="absolute top-3 end-3 flex flex-col gap-2 z-[500]">
            <button onClick={recenter} className="w-10 h-10 rounded-2xl bg-background/70 backdrop-blur-md border border-border/60 flex items-center justify-center" aria-label={s.myLocation}>
              <Crosshair className="w-4 h-4 text-foreground" />
            </button>
            <div className="rounded-2xl bg-background/70 backdrop-blur-md border border-border/60 overflow-hidden flex flex-col">
              <span className="w-10 h-9 flex items-center justify-center text-foreground"><Plus className="w-4 h-4" /></span>
              <span className="h-px bg-border/60" />
              <span className="w-10 h-9 flex items-center justify-center text-foreground"><Minus className="w-4 h-4" /></span>
            </div>
          </div>
        </div>

        {/* Extra options + fare */}
        {(o.showOptionsBar || o.showFareCard) && (
          <div className="glass-card p-3 border border-border/70" style={{ borderRadius: radius }}>
            <div className="flex items-start gap-2.5">
              {/* Fare box (start side) */}
              {o.showFareCard && (
                <div className="rounded-2xl border border-info/25 bg-info/5 p-3 w-[142px] sm:w-[190px] shrink-0 order-first">
                  <div className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-info" />
                    <span className="text-[10px] text-muted-foreground">{s.estimatedCost}</span>
                  </div>
                  <p className="text-[22px] sm:text-[26px] font-extrabold text-success leading-tight mt-1">
                    {priceLow !== null ? `${priceLow} - ${priceHigh}` : "—"}
                    {priceLow !== null && <span className="text-[15px] font-bold ms-1">{s.currency}</span>}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground">
                      {etaLow !== null ? `${etaLow} - ${etaHigh} ${s.min}` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Share2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[10px] text-muted-foreground">
                      {rideDistance !== null ? `${rideDistance.toFixed(1)} ${s.km}` : "—"}
                    </span>
                  </div>
                </div>
              )}

              {/* Option fields */}
              {o.showOptionsBar && (
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-foreground mb-2">{s.extraOptions}</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="relative">
                      <Field icon={Car} label={s.rideType} value={activeVehicle ? vehicleLabel(activeVehicle) : "—"} onClick={() => setOpenField(f => f === "vehicle" ? null : "vehicle")} />
                      {openField === "vehicle" && (
                        <div className="absolute z-30 mt-1 w-full rounded-2xl glass-strong border border-border p-1.5 space-y-1">
                          {vehicleTypes.map(v => {
                            const Icon = ICONS[v.icon] || Car;
                            return (
                              <button
                                key={v.id}
                                onClick={() => { setVehicleCode(v.code); setPassengers(p => Math.min(p, v.max_passengers)); setOpenField(null); }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-[11px] ${v.code === vehicleCode ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {vehicleLabel(v)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="glass-card border border-border/70 px-2.5 py-2" style={{ borderRadius: radius }}>
                      <p className="text-[9px] text-muted-foreground mb-1.5">{s.passengers}</p>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <button onClick={() => setPassengers(p => Math.max(1, p - 1))} className="w-5 h-5 rounded-md glass border border-border flex items-center justify-center">
                          <Minus className="w-3 h-3 text-muted-foreground" />
                        </button>
                        <span className="text-[11px] font-semibold text-foreground flex-1 text-center">{passengers}</span>
                        <button
                          onClick={() => setPassengers(p => Math.min(activeVehicle?.max_passengers ?? 4, p + 1))}
                          className="w-5 h-5 rounded-md glass border border-border flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Field
                        icon={payment === "cash" ? Banknote : payment === "card" ? CreditCard : WalletIcon}
                        label={s.payment}
                        value={payment === "cash" ? s.cash : payment === "card" ? s.card : s.wallet}
                        onClick={() => setOpenField(f => f === "payment" ? null : "payment")}
                      />
                      {openField === "payment" && (
                        <div className="absolute z-30 mt-1 w-full rounded-2xl glass-strong border border-border p-1.5 space-y-1">
                          {([["cash", Banknote, s.cash], ["card", CreditCard, s.card], ["wallet", WalletIcon, s.wallet]] as const).map(([code, Icon, label]) => (
                            <button
                              key={code}
                              onClick={() => { setPayment(code); setOpenField(null); }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-[11px] ${payment === code ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Field icon={StickyNote} label={s.notes} value={notes ? notes.slice(0, 18) : s.addNote} onClick={() => setShowNotes(v => !v)} />
                  </div>
                </div>
              )}
            </div>

            {o.showOptionsBar && showNotes && (
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


        {/* Safety strip */}
        {o.showSafetyStrip && (
          <div className="glass-card border border-border/70 p-2.5 flex items-center gap-1" style={{ borderRadius: radius }}>
            <span className="w-10 h-10 rounded-2xl bg-success/12 border border-success/25 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-success" />
            </span>
            <div className="min-w-0 ms-1.5">
              <p className="text-[12px] font-semibold text-foreground leading-tight">{s.safeTrip}</p>
              <p className="text-[9px] text-muted-foreground truncate">{s.liveTracking}</p>
            </div>
            <div className="flex-1 min-w-2" />
            {[
              { icon: Radio, label: s.liveTracking, action: () => navigate("/customer/tracking") },
              { icon: Share2, label: s.shareTrip, action: shareTrip },
              { icon: Headphones, label: s.support, action: () => navigate("/support") },
            ].map((item, i) => (
              <div key={i} className="flex items-center shrink-0">
                {i > 0 && <span className="w-4 sm:w-6 border-t border-dashed border-border/70 mb-4" />}
                <button onClick={item.action} className="flex flex-col items-center gap-1 px-0.5">
                  <span className="w-9 h-9 rounded-full bg-success/10 border border-success/25 flex items-center justify-center">
                    <item.icon className="w-4 h-4 text-success" />
                  </span>
                  <span className="text-[8px] text-muted-foreground text-center leading-tight">{item.label}</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="h-14 px-3 rounded-2xl border-border/70 glass text-[11px] gap-1.5 text-foreground"
            onClick={() => setScheduleOpen(true)}
          >
            <Clock className="w-4 h-4 text-info" />
            {s.scheduleLater}
          </Button>
          <button
            onClick={() => submit()}
            disabled={submitting || !destCoords}
            className="flex-1 h-14 rounded-2xl text-primary-foreground font-extrabold text-[16px] flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "linear-gradient(90deg, hsl(var(--info)), hsl(var(--success)))", boxShadow: `0 10px 30px -12px hsl(var(--info) / 0.8)` }}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span className="flex-1 text-center">{s.requestNow}</span><Car className="w-6 h-6" /></>}
          </button>
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
