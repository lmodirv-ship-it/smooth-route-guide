import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Search, Star, Clock, MapPin,
  UtensilsCrossed, Loader2, Globe, Filter, ShoppingBag,
  Coffee, Store, Navigation, Sparkles, ChevronDown,
  SlidersHorizontal, X, TrendingUp, DollarSign
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface RestaurantItem {
  id: string;
  name: string;
  description?: string;
  address?: string;
  area?: string;
  category?: string;
  rating?: number;
  image_url?: string;
  is_open?: boolean;
  delivery_fee?: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
  city?: string;
  source: "db" | "google";
  google_place_id?: string;
  lat?: number;
  lng?: number;
  distance?: number;
}

type SortMode = "nearest" | "rating" | "price" | "default";
type CategoryFilter = "all" | "restaurant" | "cafe" | "bakery" | "pharmacy" | "grocery" | "store";

const CATEGORY_META: Record<string, { label: string; icon: React.ReactNode }> = {
  all: { label: "الكل", icon: <Filter className="w-4 h-4" /> },
  restaurant: { label: "مطاعم", icon: <UtensilsCrossed className="w-4 h-4" /> },
  cafe: { label: "مقاهي", icon: <Coffee className="w-4 h-4" /> },
  bakery: { label: "مخبزات", icon: <Store className="w-4 h-4" /> },
  pharmacy: { label: "صيدليات", icon: <Store className="w-4 h-4" /> },
  grocery: { label: "بقالة", icon: <ShoppingBag className="w-4 h-4" /> },
  store: { label: "متاجر", icon: <Store className="w-4 h-4" /> },
};

const SORT_OPTIONS: { value: SortMode; label: string; icon: React.ReactNode }[] = [
  { value: "default", label: "الافتراضي", icon: <SlidersHorizontal className="w-3.5 h-3.5" /> },
  { value: "nearest", label: "الأقرب", icon: <Navigation className="w-3.5 h-3.5" /> },
  { value: "rating", label: "التقييم", icon: <TrendingUp className="w-3.5 h-3.5" /> },
  { value: "price", label: "السعر", icon: <DollarSign className="w-3.5 h-3.5" /> },
];

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=300&fit=crop",
];

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getDefaultImage(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  return DEFAULT_IMAGES[Math.abs(hash) % DEFAULT_IMAGES.length];
}

const RestaurantsList = () => {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [search, setSearch] = useState("");
  const [dbStores, setDbStores] = useState<RestaurantItem[]>([]);
  const [googleStores, setGoogleStores] = useState<RestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [userCity, setUserCity] = useState("Tanger");
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("default");
  const [showOnlyOpen, setShowOnlyOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDbStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from("stores")
        .select("*")
        .order("rating", { ascending: false });

      if (dbErr) {
        setError("حدث خطأ أثناء جلب المطاعم");
        console.error("[restaurants] db:", dbErr);
      }

      setDbStores(
        (data || []).map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          address: s.address,
          area: s.area,
          category: s.category || "restaurant",
          rating: s.rating,
          image_url: s.image_url,
          is_open: s.is_open,
          delivery_fee: s.delivery_fee,
          delivery_time_min: s.delivery_time_min,
          delivery_time_max: s.delivery_time_max,
          city: s.city || s.area,
          source: "db" as const,
          google_place_id: s.google_place_id,
          lat: s.lat ? Number(s.lat) : undefined,
          lng: s.lng ? Number(s.lng) : undefined,
        }))
      );
    } catch {
      setError("حدث خطأ غير متوقع");
      setDbStores([]);
    }
    setLoading(false);
  }, []);

  const fetchGooglePlaces = useCallback(async (city: string) => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-places-search", {
        body: { city, type: "restaurants", useGoogle: true },
      });
      if (error) {
        setGoogleStores([]);
        setGoogleLoading(false);
        return;
      }
      setGoogleStores(
        (data?.restaurants || [])
          .filter((r: any) => r.is_open !== false)
          .map((r: any, i: number) => ({
            id: `google_${r.google_place_id || i}`,
            name: r.name,
            description: r.address,
            address: r.address,
            area: r.area,
            category: "restaurant",
            rating: r.rating,
            image_url: r.image_url,
            is_open: r.is_open,
            delivery_fee: 15,
            delivery_time_min: 25,
            delivery_time_max: 45,
            city,
            source: "google" as const,
            google_place_id: r.google_place_id,
            lat: r.lat ? Number(r.lat) : undefined,
            lng: r.lng ? Number(r.lng) : undefined,
          }))
      );
    } catch {
      setGoogleStores([]);
    }
    setGoogleLoading(false);
  }, []);

  useEffect(() => {
    fetchDbStores();
  }, [fetchDbStores]);

  useEffect(() => {
    if (!navigator.geolocation) {
      fetchGooglePlaces(userCity);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLat(lat);
        setUserLng(lng);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`
          );
          const geo = await res.json();
          const city = geo?.address?.city || geo?.address?.town || geo?.address?.village || "Tanger";
          setUserCity(city);
          fetchGooglePlaces(city);
        } catch {
          fetchGooglePlaces(userCity);
        }
      },
      () => fetchGooglePlaces(userCity),
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    const ch = supabase
      .channel("stores-client-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => fetchDbStores())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchDbStores]);

  const allWithDistance = useMemo(() => {
    const dbPlaceIds = new Set(dbStores.map((s) => s.google_place_id).filter(Boolean));
    const uniqueGoogle = googleStores.filter(
      (g) => !g.google_place_id || !dbPlaceIds.has(g.google_place_id)
    );
    let all = [...dbStores, ...uniqueGoogle];
    if (userLat && userLng) {
      all = all.map((s) => ({
        ...s,
        distance: s.lat && s.lng ? calcDistance(userLat, userLng, s.lat, s.lng) : undefined,
      }));
    }
    return all;
  }, [dbStores, googleStores, userLat, userLng]);

  // Horizontal sections
  const nearestStores = useMemo(() =>
    [...allWithDistance].filter((s) => s.distance != null && s.is_open !== false)
      .sort((a, b) => (a.distance || 99) - (b.distance || 99)).slice(0, 8),
    [allWithDistance]
  );

  const recommendedStores = useMemo(() =>
    [...allWithDistance].filter((s) => s.is_open !== false && (s.rating || 0) >= 4)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 8),
    [allWithDistance]
  );

  const displayStores = useMemo(() => {
    let all = [...allWithDistance];

    if (showOnlyOpen) all = all.filter((s) => s.is_open !== false);
    if (categoryFilter !== "all") all = all.filter((s) => s.category === categoryFilter);

    if (search.trim()) {
      const q = search.toLowerCase();
      all = all.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q) ||
          s.area?.toLowerCase().includes(q) ||
          (CATEGORY_META[s.category || ""]?.label || "").includes(q)
      );
    }

    switch (sortMode) {
      case "nearest":
        all.sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999));
        break;
      case "rating":
        all.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case "price":
        all.sort((a, b) => (a.delivery_fee || 10) - (b.delivery_fee || 10));
        break;
      default:
        all.sort((a, b) => {
          const aOpen = a.is_open !== false ? 0 : 1;
          const bOpen = b.is_open !== false ? 0 : 1;
          if (aOpen !== bOpen) return aOpen - bOpen;
          if (a.distance != null && b.distance != null) return a.distance - b.distance;
          return (b.rating || 0) - (a.rating || 0);
        });
    }
    return all;
  }, [allWithDistance, showOnlyOpen, categoryFilter, search, sortMode]);

  const isLoading = loading && googleLoading;
  const showSections = !search.trim() && !isLoading && categoryFilter === "all";
  const activeFiltersCount = (categoryFilter !== "all" ? 1 : 0) + (showOnlyOpen ? 1 : 0) + (sortMode !== "default" ? 1 : 0);

  const handleStoreClick = useCallback((store: RestaurantItem) => {
    if (store.source === "db") {
      navigate(`/delivery/restaurant/${store.id}`);
    } else {
      toast({ title: store.name, description: `📍 ${store.address || store.area || userCity}` });
    }
  }, [navigate, userCity]);

  const clearFilters = () => {
    setCategoryFilter("all");
    setSortMode("default");
    setShowOnlyOpen(false);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="px-4 pt-4 pb-3">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate("/delivery")}
              className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-foreground" />
            </button>

            <div className="text-center flex-1">
              <h1 className="text-lg font-bold text-foreground font-cairo">المطاعم والمتاجر</h1>
              <div className="flex items-center justify-center gap-1.5 mt-0.5">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="text-[11px] text-muted-foreground">{userCity}</span>
                {googleLoading && <Loader2 className="w-3 h-3 text-primary animate-spin" />}
              </div>
            </div>

            <button
              onClick={() => navigate("/delivery/cart")}
              className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:border-primary/40 transition-colors relative"
            >
              <ShoppingBag className="w-5 h-5 text-foreground" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                  {totalItems}
                </span>
              )}
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن مطعم، مقهى، متجر..."
              className="bg-card border-border h-11 rounded-xl pr-10 text-right placeholder:text-muted-foreground/60 focus:border-primary/50"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-muted flex items-center justify-center"
              >
                <X className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
          {Object.entries(CATEGORY_META).map(([key, meta]) => (
            <button
              key={key}
              onClick={() => setCategoryFilter(key as CategoryFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                categoryFilter === key
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                  : "bg-card border border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {meta.icon}
              {meta.label}
            </button>
          ))}
        </div>

        {/* Sort & filters bar */}
        <div className="flex items-center gap-2 px-4 pb-3">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setSortMode(opt.value)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                sortMode === opt.value
                  ? "bg-accent/20 text-accent border border-accent/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
          <div className="h-4 w-px bg-border mx-1" />
          <button
            onClick={() => setShowOnlyOpen(!showOnlyOpen)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              showOnlyOpen
                ? "bg-green-500/15 text-green-400 border border-green-500/30"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showOnlyOpen ? "bg-green-500" : "bg-muted-foreground/40"}`} />
            مفتوح
          </button>
          {activeFiltersCount > 0 && (
            <button onClick={clearFilters} className="text-[11px] text-destructive hover:underline mr-auto">
              مسح ({activeFiltersCount})
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pb-28">
        {/* Error */}
        {error && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center mt-4">
            <p className="text-destructive text-sm font-medium">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchDbStores} className="mt-2 border-destructive/30 text-destructive">
              إعادة المحاولة
            </Button>
          </motion.div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
                <Skeleton className="w-full h-40" />
                <div className="p-3.5 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ Horizontal Sections ═══ */}
        {showSections && (
          <div className="space-y-5 mt-4">
            {nearestStores.length > 0 && (
              <HorizontalSection
                title="أقرب إليك"
                icon={<Navigation className="w-4 h-4 text-primary" />}
                stores={nearestStores}
                onStoreClick={handleStoreClick}
              />
            )}
            {recommendedStores.length > 0 && (
              <HorizontalSection
                title="موصى به"
                icon={<Sparkles className="w-4 h-4 text-warning" />}
                stores={recommendedStores}
                onStoreClick={handleStoreClick}
                accent="warning"
              />
            )}
            <div className="flex items-center gap-3 pt-2">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <ChevronDown className="w-3.5 h-3.5" />
                جميع المطاعم ({displayStores.length})
              </span>
              <div className="h-px flex-1 bg-border" />
            </div>
          </div>
        )}

        {/* Google loading */}
        {!loading && googleLoading && (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">جاري البحث عن مطاعم قريبة...</span>
          </div>
        )}

        {/* ═══ Main Grid ═══ */}
        <AnimatePresence mode="popLayout">
          {!isLoading && displayStores.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4"
            >
              {displayStores.map((store, i) => (
                <RestaurantCard
                  key={store.id}
                  store={store}
                  index={i}
                  onView={() => handleStoreClick(store)}
                  isGoogle={store.source === "google"}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty */}
        {!isLoading && displayStores.length === 0 && !error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 mt-4">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-foreground font-bold text-lg">لا توجد نتائج</p>
            <p className="text-muted-foreground text-sm mt-1">
              {search ? "جرب بحثاً مختلفاً" : "لا توجد مطاعم بهذه الفلاتر"}
            </p>
            {(search || activeFiltersCount > 0) && (
              <Button variant="outline" size="sm" onClick={() => { setSearch(""); clearFilters(); }} className="mt-3">
                مسح الفلاتر
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

/* ─── Horizontal Section ─── */
const HorizontalSection = ({
  title, icon, stores, onStoreClick, accent = "primary",
}: {
  title: string;
  icon: React.ReactNode;
  stores: RestaurantItem[];
  onStoreClick: (store: RestaurantItem) => void;
  accent?: "primary" | "warning";
}) => (
  <div className="space-y-2.5">
    <div className="flex items-center gap-2">
      {icon}
      <h2 className="text-sm font-bold text-foreground">{title}</h2>
      <Badge className={`border-0 text-[10px] px-1.5 ${accent === "warning" ? "bg-warning/15 text-warning" : "bg-primary/15 text-primary"}`}>
        {stores.length}
      </Badge>
    </div>
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
      {stores.map((store, i) => (
        <motion.div
          key={`h-${store.id}`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onStoreClick(store)}
          className={`flex-shrink-0 w-44 bg-card rounded-xl border border-border overflow-hidden cursor-pointer transition-all active:scale-95 hover:border-primary/40 ${store.is_open === false ? "opacity-60" : ""}`}
        >
          <div className="relative w-full h-28 bg-secondary overflow-hidden">
            <img
              src={store.image_url || getDefaultImage(store.id)}
              alt={store.name}
              className={`w-full h-full object-cover ${store.is_open === false ? "grayscale" : ""}`}
              loading="lazy"
            />
            <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-md ${
              store.is_open === false ? "bg-destructive/80 text-destructive-foreground" : "bg-green-500/80 text-white"
            }`}>
              {store.is_open === false ? "مغلق" : "مفتوح"}
            </div>
            {store.distance != null && (
              <div className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-background/80 text-primary backdrop-blur-md">
                {store.distance < 1 ? `${Math.round(store.distance * 1000)} م` : `${store.distance.toFixed(1)} كم`}
              </div>
            )}
          </div>
          <div className="p-2.5 space-y-1">
            <h3 className="font-bold text-foreground text-xs truncate">{store.name}</h3>
            <div className="flex items-center justify-between">
              {store.rating != null && store.rating > 0 && (
                <span className="flex items-center gap-0.5 text-[10px] font-bold text-warning">
                  <Star className="w-3 h-3 fill-current" />
                  {store.rating.toFixed(1)}
                </span>
              )}
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                {store.delivery_time_min || 20} د
              </span>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

/* ─── Restaurant Card (Grid) ─── */
const RestaurantCard = ({
  store, index, onView, isGoogle = false,
}: {
  store: RestaurantItem;
  index: number;
  onView: () => void;
  isGoogle?: boolean;
}) => {
  const isClosed = store.is_open === false;
  const categoryLabel = CATEGORY_META[store.category || "restaurant"]?.label || store.category || "مطعم";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.03, 0.25) }}
      onClick={onView}
      className={`group bg-card rounded-2xl border overflow-hidden cursor-pointer transition-all duration-300
        hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 active:scale-[0.98]
        ${isClosed ? "border-border/50 opacity-70" : isGoogle ? "border-info/20 hover:border-info/40" : "border-border hover:border-primary/40"}`}
    >
      {/* Cover Image */}
      <div className="relative w-full h-44 bg-secondary overflow-hidden">
        <img
          src={store.image_url || getDefaultImage(store.id)}
          alt={store.name}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${isClosed ? "grayscale" : ""}`}
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Status badge */}
        <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-md ${
          isClosed ? "bg-destructive/90 text-destructive-foreground" : "bg-green-500/90 text-white"
        }`}>
          {isClosed ? "مغلق" : "✓ مفتوح"}
        </div>

        {/* Google badge */}
        {isGoogle && (
          <div className="absolute top-3 left-3 px-2 py-1 rounded-lg text-[10px] font-bold bg-info/90 text-white backdrop-blur-md flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Google
          </div>
        )}

        {/* Bottom info on image */}
        <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between">
          <div>
            <h3 className="font-bold text-white text-base drop-shadow-lg leading-tight">{store.name}</h3>
            <span className="text-white/70 text-[11px]">{categoryLabel}</span>
          </div>
          {store.rating != null && store.rating > 0 && (
            <div className="flex items-center gap-1 bg-background/80 backdrop-blur-md px-2 py-1 rounded-lg">
              <Star className="w-3.5 h-3.5 text-warning fill-current" />
              <span className="text-xs font-bold text-foreground">{store.rating.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-3.5">
        {store.description && (
          <p className="text-[12px] text-muted-foreground line-clamp-1 mb-2.5">{store.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {store.delivery_time_min || 20}-{store.delivery_time_max || 40} د
            </span>
            {store.distance != null && (
              <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                <MapPin className="w-3.5 h-3.5" />
                {store.distance < 1 ? `${Math.round(store.distance * 1000)} م` : `${store.distance.toFixed(1)} كم`}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-primary">{store.delivery_fee || 10} DH</span>
            <span className="text-[10px] text-muted-foreground">توصيل</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RestaurantsList;
