import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Navigation, Loader2, Search, X, Car, Clock, Crosshair, Bell, Globe, Check,
  Users, Eye, ShoppingBag, Wallet as WalletIcon, Star, ShieldCheck, Share2, Radio,
  Headphones, CalendarClock, Plus, Minus, StickyNote, CreditCard, Banknote, Zap, Crown, Bus,
  ChevronDown, Sparkles, Info, TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const { t, dir, locale, locales, setLocale } = useI18n();
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
  const [vehicleCode, setVehicleCode] = useState(() => PREFS.get("vehicle", "economy"));
  const [passengers, setPassengers] = useState(() => Number(PREFS.get("passengers", "1")) || 1);
  const [payment, setPayment] = useState<"cash" | "card" | "wallet">(() => PREFS.get("payment", "cash") as "cash" | "card" | "wallet");
  const [notes, setNotes] = useState(() => PREFS.get("notes", ""));
  const [sheet, setSheet] = useState<"vehicle" | "payment" | "passengers" | "notes" | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const [balance, setBalance] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [todayOrders, setTodayOrders] = useState(0);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const [activeDriverId, setActiveDriverId] = useState<string | null>(null);
  const [activeRideStatus, setActiveRideStatus] = useState<string | null>(null);
  const [zoomCommand, setZoomCommand] = useState<"in" | "out" | null>(null);
  const [zoomCommandId, setZoomCommandId] = useState(0);

  const { position: livePosition } = useDriverRealtimeTracking(activeDriverId);
  const smoothedDriver = useSmoothedPosition(livePosition ? { lat: livePosition.lat, lng: livePosition.lng } : null);
  const isLive = !!smoothedDriver && !!activeRideId;
  const { results: searchResults, loading: searchLoading, search: runSearch, clear: clearSearch } = usePlaceSearch(locale);

  // Persist option choices
  useEffect(() => { PREFS.set("vehicle", vehicleCode); }, [vehicleCode]);
  useEffect(() => { PREFS.set("passengers", String(passengers)); }, [passengers]);
  useEffect(() => { PREFS.set("payment", payment); }, [payment]);
  useEffect(() => { PREFS.set("notes", notes); }, [notes]);



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
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [{ data: w }, { data: st }, { data: profile }, { count: ordersCount }, { data: visits }, { data: activeRide }] = await Promise.all([
        supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("reward_stars").select("stars").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("ride_requests").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", startOfDay.toISOString()),
        supabase.from("site_visit_counter").select("today_visits").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("ride_requests").select("id").eq("user_id", user.id).in("status", ["pending", "accepted", "in_progress"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (w) setBalance(Number((w as any).balance) || 0);
      if (st) setPoints(Number((st as any).stars) || 0);
      setAvatarUrl(profile?.avatar_url ?? null);
      setTodayOrders(ordersCount ?? 0);
      setViewCount(visits ? Number(visits.today_visits) || 0 : null);
      setActiveRideId(activeRide?.id ?? null);
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("read_at", null);
      setUnreadCount(count ?? 0);
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
    const url = activeRideId
      ? `${window.location.origin}/customer/tracking?id=${activeRideId}`
      : `${window.location.origin}/customer/ride`;
    try { await navigator.clipboard.writeText(url); toast({ title: s.linkCopied }); } catch { /* ignore */ }
  };

  const trackActiveRide = () => {
    if (!activeRideId) {
      toast({ title: s.noActiveRide });
      return;
    }
    navigate(`/customer/tracking?id=${activeRideId}`);
  };

  const commandZoom = (command: "in" | "out") => {
    setZoomCommand(command);
    setZoomCommandId((value) => value + 1);
  };

  // Design spec: 390x844 — outer padding 16, radius 20, 8px grid
  const SPEC = {
    pad: 16,
    radius: 20,
    grid: 8,
    header: 72,
    avatar: 44,
    statW: 72,
    statH: 56,
    iconBtn: 40,
    cardW: 160,
    cardH: 110,
    cardRadius: 18,
    cardPad: 16,
    mapH: 360,
    locateBtn: 44,
    zoomBtn: 48,
    pickBtnW: 120,
    pickBtnH: 40,
    optW: 80,
    optH: 70,
    fareW: 140,
    fareH: 120,
    svcW: 80,
    svcH: 60,
    ctaLaterW: 110,
    ctaMainW: 230,
    cta: 56,
    ctaRadius: 18,
  };

  const radius = `${SPEC.radius}px`;
  const gap = `${SPEC.grid}px`;

  const mapRoute = userLocation && destCoords ? { pickup: userLocation, destination: destCoords } : null;


  const Stat = ({ icon: Icon, value, label, tone }: { icon: typeof Eye; value: string; label: string; tone: string }) => (
    <div
      className="glass-card border border-ride-border/80 shrink-0 flex flex-col items-center justify-center gap-0.5"
      style={{ width: SPEC.statW, height: SPEC.statH, borderRadius: 14 }}
    >
      <Icon className={`w-3.5 h-3.5 ${tone}`} />
      <p className="text-[13px] font-bold text-foreground leading-none truncate max-w-full px-1">{value}</p>
      <p className="text-[9px] text-ride-muted truncate max-w-full px-1">{label}</p>
    </div>
  );

  const Field = ({ icon: Icon, label, value, onClick }: { icon: typeof Eye; label: string; value: string; onClick?: () => void }) => (
    <button
      onClick={onClick}
      className="glass-card border border-ride-border/80 px-1.5 py-1 text-start flex flex-col justify-center shrink-0 hover:border-ride-blue/50 transition-colors"
      style={{ width: SPEC.optW, height: SPEC.optH, borderRadius: SPEC.cardRadius }}
    >
      <Icon className="w-3.5 h-3.5 text-ride-blue mb-1" />
      <p className="text-[9px] text-ride-muted truncate w-full">{label}</p>
      <div className="flex items-center gap-1 w-full">
        <span className="text-[11px] font-semibold text-foreground truncate flex-1">{value}</span>
        <ChevronDown className="w-2.5 h-2.5 text-ride-muted shrink-0" />
      </div>
    </button>
  );



  return (
    <div className="min-h-[calc(100dvh-2.75rem)] gradient-dark pb-28" dir={dir}>
      {/* Top bar — avatar + stats pill + balance + actions */}
      {o.showTopBar && (
        <div
          className="sticky top-0 z-40 bg-background/70 backdrop-blur-2xl border-b border-ride-border/60"
          style={{ paddingInline: SPEC.pad, minHeight: SPEC.header, display: "flex", alignItems: "center" }}
        >
          <div className="flex items-center overflow-x-auto no-scrollbar w-full" style={{ gap: SPEC.grid }}>

            <div className="relative shrink-0">
              <div
                className="rounded-full gradient-primary flex items-center justify-center border border-ride-border overflow-hidden"
                style={{ width: SPEC.avatar, height: SPEC.avatar }}
              >
                {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : <Car className="w-5 h-5 text-primary-foreground" />}
              </div>
              <span className="absolute -bottom-0.5 -end-0.5 w-3 h-3 rounded-full bg-ride-green border-2 border-background" />
            </div>

            <Stat icon={Eye} value={viewCount !== null ? String(viewCount) : "—"} label={s.views} tone="text-ride-blue" />
            <Stat icon={Users} value={String(nearbyDrivers.length)} label={s.driversAvailable} tone="text-ride-green" />
            <Stat icon={TrendingUp} value={String(todayOrders)} label={s.todayOrders} tone="text-ride-amber" />

            <div
              className="glass-card border border-ride-border/80 px-2.5 shrink-0 flex flex-col justify-center"
              style={{ height: SPEC.statH, borderRadius: 14 }}
            >
              <div className="flex items-center gap-1">
                <span className="text-[13px] font-bold text-foreground whitespace-nowrap">
                  {balance !== null ? `${s.currency} ${balance}` : "—"}
                </span>
                <WalletIcon className="w-3.5 h-3.5 text-ride-muted" />
              </div>
              <p className="text-[9px] text-ride-muted">{s.balance}</p>
            </div>

            <div className="flex-1 min-w-0" />

            <button
              onClick={() => navigate("/customer/notifications")}
              className="relative rounded-xl glass-card border border-ride-border/80 flex items-center justify-center shrink-0"
              style={{ width: SPEC.iconBtn, height: SPEC.iconBtn }}
            >
              <Bell className="w-4 h-4 text-ride-amber" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -end-1 min-w-[14px] h-3.5 px-1 rounded-full bg-primary text-primary-foreground text-[8px] font-bold flex items-center justify-center border border-background">
                  {unreadCount}
                </span>
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl glass-card border-ride-border/80 shrink-0"
                  style={{ width: SPEC.iconBtn, height: SPEC.iconBtn }}
                  aria-label={locales.find((item) => item.code === locale)?.label}
                >
                  <Globe className="w-4 h-4 text-ride-muted" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[2100] min-w-[150px]">
                {locales.map((language) => (
                  <DropdownMenuItem key={language.code} onClick={() => setLocale(language.code)} className="gap-2">
                    <span>{language.flag}</span>
                    <span className="flex-1">{language.label}</span>
                    {language.code === locale && <Check className="w-4 h-4 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

      )}


      <div style={{ display: "flex", flexDirection: "column", gap, paddingInline: SPEC.pad, paddingTop: SPEC.grid * 2 }}>
        {/* Compact info cards row — uniform height */}
        {o.showQuickCards && (
          <div className="flex items-stretch overflow-x-auto no-scrollbar" style={{ gap }}>
            {/* Ride badge */}
            <div
              className="glass-card border border-ride-blue/30 shrink-0 flex flex-col justify-between"
              style={{ width: SPEC.cardW, height: SPEC.cardH, borderRadius: SPEC.cardRadius, padding: SPEC.cardPad }}
            >
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p className="text-[16px] font-medium text-foreground leading-tight truncate">{s.requestRide.split(" ")[0]}</p>
                  <p className="text-[16px] font-semibold text-ride-blue leading-tight truncate">{s.requestRide.split(" ").slice(1).join(" ")}</p>
                </div>
                <Sparkles className="w-4 h-4 text-ride-amber shrink-0" />
              </div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-ride-green shrink-0" />
                <span className="text-[13px] text-ride-muted truncate">
                  {nearbyDrivers.length > 0 ? `${nearbyDrivers.length} ${s.driversAvailable}` : s.searching}
                </span>
              </div>
            </div>

            {/* Activity points */}
            <div
              className="glass-card border border-ride-border/80 shrink-0 flex flex-col justify-between"
              style={{ width: SPEC.cardW, height: SPEC.cardH, borderRadius: SPEC.cardRadius, padding: SPEC.cardPad }}
            >
              <div className="text-end">
                <p className="text-[13px] text-ride-muted">{s.activityPoints}</p>
                <p className="text-[22px] font-bold text-foreground leading-tight">{points ?? 0}/999</p>
              </div>
              <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                <div className="h-full rounded-full bg-ride-green" style={{ width: `${Math.min(100, ((points ?? 0) / 999) * 100)}%` }} />
              </div>
              <div className="flex items-center justify-end gap-1">
                <span className="text-[13px] text-ride-muted">{s.safeTrip}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-ride-green" />
              </div>
            </div>

            {/* Plate */}
            {userCode && (
              <div
                className="glass-card border border-ride-border/80 shrink-0 text-end flex flex-col justify-between"
                style={{ width: SPEC.cardW, height: SPEC.cardH, borderRadius: SPEC.cardRadius, padding: SPEC.cardPad }}
              >
                <div>
                  <p className="text-[13px] text-ride-muted">{s.plate}</p>
                  <p className="text-[22px] font-mono font-bold text-foreground leading-tight">{userCode}</p>
                </div>
                <div className="flex justify-end">
                  <span className="w-8 h-8 rounded-full bg-ride-blue/15 border border-ride-blue/30 flex items-center justify-center">
                    <Car className="w-4 h-4 text-ride-blue" />
                  </span>
                </div>
              </div>
            )}

            {/* Pickup */}
            <button
              onClick={() => setPicker("pickup")}
              className="glass-card border border-ride-border/80 shrink-0 text-start"
              style={{ width: SPEC.cardW, height: SPEC.cardH, borderRadius: SPEC.cardRadius, padding: SPEC.cardPad }}
            >
              <div className="flex items-center justify-between gap-1.5 h-full">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ride-green" />
                    <span className="text-[13px] text-ride-muted">{s.pickup}</span>
                  </div>
                  <p className="text-[16px] font-medium text-foreground truncate mt-1">
                    {selectedPickupName || (pickupLoading ? s.locating : pickupName || s.yourLocation)}
                  </p>
                  <p className="text-[13px] text-ride-muted truncate">{s.pickOnMap}</p>
                </div>
                <span className="w-8 h-8 rounded-full bg-ride-green/15 border border-ride-green/30 flex items-center justify-center shrink-0">
                  <Crosshair className="w-4 h-4 text-ride-green" />
                </span>
              </div>
            </button>

            {/* Destination */}
            <button
              onClick={() => setPicker("dest")}
              className="glass-card border border-ride-border/80 shrink-0 text-start"
              style={{ width: SPEC.cardW, height: SPEC.cardH, borderRadius: SPEC.cardRadius, padding: SPEC.cardPad }}
            >
              <div className="flex items-center justify-between gap-1.5 h-full">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-ride-blue" />
                    <span className="text-[13px] text-ride-muted">{s.destination}</span>
                  </div>
                  <p className="text-[16px] font-medium text-foreground truncate mt-1">
                    {selectedDestName || destName || s.destinationPlaceholder}
                  </p>
                  <p className="text-[13px] text-ride-muted truncate">{s.pickOnMap}</p>
                </div>
                <span className="w-8 h-8 rounded-full bg-ride-blue/15 border border-ride-blue/30 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-ride-blue" />
                </span>
              </div>
            </button>
          </div>
        )}


        {/* Map — 358x360 */}
        <div
          className="relative overflow-hidden border border-ride-border w-full"
          style={{ height: SPEC.mapH, borderRadius: SPEC.radius, boxShadow: `0 12px 32px -18px hsl(var(--ride-blue) / 0.9), 0 0 ${o.glow}px hsl(var(--primary) / ${Math.min(o.glow, 60) / 200})` }}
        >
          <LeafletMap
            center={userLocation || DEFAULT_LOCATION}
            markerPosition={destCoords || undefined}
            nearbyDrivers={nearbyDrivers.map(d => ({ id: d.id, lat: d.lat, lng: d.lng } as any))}
            route={mapRoute}
            onMapClick={handleMapClick}
            expandable={false}
            hideControls
            zoomCommand={zoomCommand}
            zoomCommandId={zoomCommandId}
            className="w-full h-full"
          />
          <button
            onClick={() => setPicker("dest")}
            className="absolute top-2 start-2 z-[500] flex items-center justify-center gap-1 rounded-xl bg-background/70 backdrop-blur-md border border-ride-border/70 text-[13px] text-foreground"
            style={{ width: SPEC.pickBtnW, height: SPEC.pickBtnH }}
          >
            <Crosshair className="w-3.5 h-3.5 text-ride-muted" />
            {s.pickOnMap}
          </button>
          <div className="absolute top-2 end-2 flex flex-col gap-2 z-[500]">
            <button
              onClick={recenter}
              className="rounded-xl bg-background/70 backdrop-blur-md border border-ride-border/70 flex items-center justify-center"
              style={{ width: SPEC.locateBtn, height: SPEC.locateBtn }}
              aria-label={s.myLocation}
            >
              <Crosshair className="w-4 h-4 text-foreground" />
            </button>
            <div className="rounded-xl bg-background/70 backdrop-blur-md border border-ride-border/70 overflow-hidden flex flex-col">
              <button onClick={() => commandZoom("in")} className="flex items-center justify-center text-foreground" style={{ width: SPEC.zoomBtn, height: SPEC.zoomBtn }} aria-label="+"><Plus className="w-4 h-4" /></button>
              <span className="h-px bg-ride-border/70" />
              <button onClick={() => commandZoom("out")} className="flex items-center justify-center text-foreground" style={{ width: SPEC.zoomBtn, height: SPEC.zoomBtn }} aria-label="−"><Minus className="w-4 h-4" /></button>
            </div>
          </div>

        </div>


        {/* Extra options + fare */}
        {(o.showOptionsBar || o.showFareCard) && (
          <div className="glass-card border border-ride-border/80" style={{ borderRadius: SPEC.radius, padding: SPEC.grid * 1.5 }}>
            <div className="flex items-start" style={{ gap: SPEC.grid }}>
              {/* Fare box 140x120 */}
              {o.showFareCard && (
                <div
                  className="rounded-2xl border border-ride-blue/30 bg-ride-blue/5 shrink-0 order-first flex flex-col justify-between"
                  style={{ width: SPEC.fareW, height: SPEC.fareH, padding: 10 }}
                >
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3 text-ride-blue" />
                    <span className="text-[13px] text-ride-muted truncate">{s.estimatedCost}</span>
                  </div>
                  <p className="text-[22px] font-bold text-ride-green leading-tight">
                    {priceLow !== null ? `${priceLow}-${priceHigh}` : "—"}
                    {priceLow !== null && <span className="text-[13px] font-bold ms-1">{s.currency}</span>}
                  </p>

                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-ride-muted shrink-0" />
                    <span className="text-[13px] text-ride-muted">
                      {etaLow !== null ? `${etaLow}-${etaHigh} ${s.min}` : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Share2 className="w-3.5 h-3.5 text-ride-muted shrink-0" />
                    <span className="text-[13px] text-ride-muted">
                      {rideDistance !== null ? `${rideDistance.toFixed(1)} ${s.km}` : "—"}
                    </span>
                  </div>
                </div>
              )}

              {/* Option fields — 80x70 each, horizontal scroll */}
              {o.showOptionsBar && (
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground mb-1.5">{s.extraOptions}</p>
                  <div className="flex overflow-x-auto no-scrollbar" style={{ gap: SPEC.grid }}>


                    <div className="relative shrink-0">
                      <Field icon={Car} label={s.rideType} value={activeVehicle ? vehicleLabel(activeVehicle) : "—"} onClick={() => setOpenField(f => f === "vehicle" ? null : "vehicle")} />
                      {openField === "vehicle" && (
                        <div className="absolute z-30 mt-1 min-w-[140px] rounded-2xl glass-strong border border-ride-border p-1.5 space-y-1">
                          {vehicleTypes.map(v => {
                            const Icon = ICONS[v.icon] || Car;
                            return (
                              <button
                                key={v.id}
                                onClick={() => { setVehicleCode(v.code); setPassengers(p => Math.min(p, v.max_passengers)); setOpenField(null); }}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-[13px] ${v.code === vehicleCode ? "bg-ride-blue/15 text-ride-blue" : "text-ride-muted"}`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                                {vehicleLabel(v)}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div
                      className="glass-card border border-ride-border/80 px-1.5 py-1 shrink-0 flex flex-col justify-center"
                      style={{ width: SPEC.optW, height: SPEC.optH, borderRadius: SPEC.cardRadius }}
                    >
                      <p className="text-[9px] text-ride-muted mb-0.5 truncate">{s.passengers}</p>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => setPassengers(p => Math.max(1, p - 1))} className="w-5 h-5 rounded glass border border-ride-border flex items-center justify-center">
                          <Minus className="w-2.5 h-2.5 text-ride-muted" />
                        </button>
                        <span className="text-[13px] font-semibold text-foreground flex-1 text-center">{passengers}</span>
                        <button
                          onClick={() => setPassengers(p => Math.min(activeVehicle?.max_passengers ?? 4, p + 1))}
                          className="w-5 h-5 rounded glass border border-ride-border flex items-center justify-center"
                        >
                          <Plus className="w-2.5 h-2.5 text-ride-muted" />
                        </button>
                      </div>
                    </div>


                    <div className="relative shrink-0">
                      <Field
                        icon={payment === "cash" ? Banknote : payment === "card" ? CreditCard : WalletIcon}
                        label={s.payment}
                        value={payment === "cash" ? s.cash : payment === "card" ? s.card : s.wallet}
                        onClick={() => setOpenField(f => f === "payment" ? null : "payment")}
                      />
                      {openField === "payment" && (
                        <div className="absolute z-30 mt-1 min-w-[140px] rounded-2xl glass-strong border border-ride-border p-1.5 space-y-1">
                          {([["cash", Banknote, s.cash], ["card", CreditCard, s.card], ["wallet", WalletIcon, s.wallet]] as const).map(([code, Icon, label]) => (
                            <button
                              key={code}
                              onClick={() => { setPayment(code); setOpenField(null); }}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-xl text-[13px] ${payment === code ? "bg-ride-blue/15 text-ride-blue" : "text-ride-muted"}`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <Field icon={StickyNote} label={s.notes} value={notes ? notes.slice(0, 12) : s.addNote} onClick={() => setShowNotes(v => !v)} />
                  </div>
                </div>
              )}
            </div>

            {o.showOptionsBar && showNotes && (
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder={s.notePlaceholder}
                className="mt-2 text-xs glass border-ride-border rounded-xl"
                rows={2}
              />
            )}
          </div>
        )}


        {/* Services strip — 80x60 items */}
        {o.showSafetyStrip && (
          <div className="glass-card border border-ride-border/80 p-2 flex items-center overflow-x-auto no-scrollbar" style={{ borderRadius: SPEC.radius, gap: SPEC.grid }}>
            {[
              { icon: ShieldCheck, label: s.safeTrip, action: () => {} },
              { icon: Radio, label: s.liveTracking, action: trackActiveRide },
              { icon: Share2, label: s.shareTrip, action: shareTrip },
              { icon: Headphones, label: s.support, action: () => navigate("/customer/support") },
            ].map((item, i) => (
              <button
                key={i}
                onClick={item.action}
                className="shrink-0 flex flex-col items-center justify-center gap-1"
                style={{ width: SPEC.svcW, height: SPEC.svcH }}
              >
                <span className="w-7 h-7 rounded-full bg-ride-green/10 border border-ride-green/25 flex items-center justify-center">
                  <item.icon className="w-3.5 h-3.5 text-ride-green" />
                </span>
                <span className="text-[9px] text-ride-muted text-center leading-tight truncate w-full">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="flex" style={{ gap: SPEC.grid }}>
          <Button
            variant="outline"
            className="border-ride-border/80 glass text-[13px] gap-1 text-foreground shrink-0 px-2"
            style={{ height: SPEC.cta, width: SPEC.ctaLaterW, borderRadius: SPEC.ctaRadius }}
            onClick={() => setScheduleOpen(true)}
          >
            <Clock className="w-4 h-4 text-ride-blue" />
            {s.scheduleLater}
          </Button>
          <Button
            onClick={() => submit()}
            disabled={submitting || !destCoords}
            className="flex-1 text-primary-foreground font-bold text-[16px] flex items-center justify-center gap-2 disabled:opacity-50 transition-transform active:scale-[0.98]"
            style={{
              height: SPEC.cta,
              borderRadius: SPEC.ctaRadius,
              background: "linear-gradient(90deg, hsl(var(--ride-green)), hsl(var(--ride-blue)))",
              boxShadow: `0 14px 32px -14px hsl(var(--ride-blue) / 0.9)`,
            }}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><span className="flex-1 text-center">{s.requestNow}</span><Car className="w-5 h-5" /></>}
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
