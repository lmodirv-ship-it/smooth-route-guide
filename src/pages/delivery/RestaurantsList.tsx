import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Search, Star, Clock, MapPin, ChevronLeft,
  UtensilsCrossed, Loader2, Globe, Filter, ShoppingBag,
  Coffee, Store, Eye
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

type FilterType = "all" | "open";

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  restaurant: <UtensilsCrossed className="w-3.5 h-3.5" />,
  cafe: <Coffee className="w-3.5 h-3.5" />,
  store: <Store className="w-3.5 h-3.5" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  restaurant: "مطعم",
  cafe: "مقهى",
  store: "متجر",
  bakery: "مخبزة",
  pharmacy: "صيدلية",
  grocery: "بقالة",
};

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
  const [filter, setFilter] = useState<FilterType>("all");
  const [error, setError] = useState<string | null>(null);

  // Fetch DB stores
  const fetchDbStores = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbErr } = await supabase
        .from("stores")
        .select("*")
        .order("rating", { ascending: false });

      if (dbErr) {
        console.error("[restaurants] db fetch error:", dbErr);
        setError("حدث خطأ أثناء جلب المطاعم");
      }

      const mapped: RestaurantItem[] = (data || []).map((s: any) => ({
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
      }));
      setDbStores(mapped);
    } catch (err) {
      console.error("[restaurants] unexpected error:", err);
      setError("حدث خطأ غير متوقع");
      setDbStores([]);
    }
    setLoading(false);
  };

  // Fetch Google Places nearby restaurants
  const fetchGooglePlaces = async (city: string) => {
    setGoogleLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("google-places-search", {
        body: { city, type: "restaurants", useGoogle: true },
      });

      if (error) {
        console.error("[google-places] error:", error);
        setGoogleStores([]);
        setGoogleLoading(false);
        return;
      }

      const restaurants = (data?.restaurants || [])
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
          city: city,
          source: "google" as const,
          google_place_id: r.google_place_id,
          lat: r.lat ? Number(r.lat) : undefined,
          lng: r.lng ? Number(r.lng) : undefined,
        }));

      setGoogleStores(restaurants);
    } catch (err) {
      console.error("[google-places] unexpected:", err);
      setGoogleStores([]);
    }
    setGoogleLoading(false);
  };

  // Detect user city from geolocation
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
          const city =
            geo?.address?.city ||
            geo?.address?.town ||
            geo?.address?.village ||
            geo?.address?.state ||
            "Tanger";
          setUserCity(city);
          fetchGooglePlaces(city);
        } catch {
          fetchGooglePlaces(userCity);
        }
      },
      () => {
        fetchGooglePlaces(userCity);
      },
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    fetchDbStores();
  }, []);

  // Realtime for DB stores
  useEffect(() => {
    const ch = supabase
      .channel("stores-client-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => fetchDbStores())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  // Merge, deduplicate, add distance, filter & sort
  const displayStores = useMemo(() => {
    const dbPlaceIds = new Set(dbStores.map((s) => s.google_place_id).filter(Boolean));
    const uniqueGoogle = googleStores.filter(
      (g) => !g.google_place_id || !dbPlaceIds.has(g.google_place_id)
    );
    let all = [...dbStores, ...uniqueGoogle];

    // Add distance
    if (userLat && userLng) {
      all = all.map((s) => ({
        ...s,
        distance: s.lat && s.lng ? calcDistance(userLat, userLng, s.lat, s.lng) : undefined,
      }));
    }

    // Filter
    if (filter === "open") {
      all = all.filter((s) => s.is_open !== false);
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      all = all.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.address?.toLowerCase().includes(q) ||
          s.area?.toLowerCase().includes(q)
      );
    }

    // Sort: open first, then by distance (if available), then by rating
    all.sort((a, b) => {
      const aOpen = a.is_open !== false ? 0 : 1;
      const bOpen = b.is_open !== false ? 0 : 1;
      if (aOpen !== bOpen) return aOpen - bOpen;
      if (a.distance != null && b.distance != null) return a.distance - b.distance;
      if (a.distance != null) return -1;
      if (b.distance != null) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

    return all;
  }, [dbStores, googleStores, userLat, userLng, filter, search]);

  const isLoading = loading && googleLoading;
  const dbCount = dbStores.length;
  const googleCount = googleStores.length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] rounded-full bg-primary/8 blur-[100px] pointer-events-none" />

        <div className="relative pt-6 pb-6 px-5">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => navigate("/delivery")}
              className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center hover:border-primary/40 transition-colors"
            >
              <ArrowRight className="w-5 h-5 text-foreground" />
            </button>

            <div className="text-center flex-1">
              <h1 className="text-xl font-bold text-foreground font-cairo">المطاعم والمتاجر</h1>
              <div className="flex items-center justify-center gap-1.5 mt-1">
                <MapPin className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">{userCity}</span>
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
          <div className="relative mb-4">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن مطعم أو متجر..."
              className="bg-card border-border h-11 rounded-xl pr-10 text-right placeholder:text-muted-foreground/60 focus:border-primary/50"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-2">
            <FilterTab
              active={filter === "all"}
              onClick={() => setFilter("all")}
              icon={<Filter className="w-3.5 h-3.5" />}
              label="الكل"
              count={dbCount + googleCount}
            />
            <FilterTab
              active={filter === "open"}
              onClick={() => setFilter("open")}
              icon={<span className="w-2 h-2 rounded-full bg-green-500" />}
              label="مفتوح الآن"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pb-28 space-y-3">
        {/* Error state */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 text-center"
          >
            <p className="text-destructive text-sm font-medium">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDbStores}
              className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              إعادة المحاولة
            </Button>
          </motion.div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-4 flex gap-3">
                <Skeleton className="w-20 h-20 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* DB section label */}
        {!loading && dbStores.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            <UtensilsCrossed className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">مطاعمنا الشريكة</h2>
            <Badge className="bg-primary/15 text-primary border-0 text-[10px] px-1.5">{dbCount}</Badge>
          </div>
        )}

        {/* Restaurant cards */}
        <AnimatePresence mode="popLayout">
          {!isLoading && displayStores.length > 0 && displayStores.map((store, i) => {
            const isGoogleSection = store.source === "google" && i > 0 && displayStores[i - 1]?.source !== "google";
            return (
              <div key={store.id}>
                {isGoogleSection && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-2 pt-3 pb-1"
                  >
                    <Globe className="w-4 h-4 text-info" />
                    <h2 className="text-sm font-bold text-foreground">مطاعم قريبة</h2>
                    <Badge variant="outline" className="text-[10px] border-info/30 text-info px-1.5">{googleCount}</Badge>
                  </motion.div>
                )}
                <RestaurantCard
                  store={store}
                  index={i}
                  onView={() => {
                    if (store.source === "db") {
                      navigate(`/delivery/restaurant/${store.id}`);
                    } else {
                      toast({
                        title: store.name,
                        description: `📍 ${store.address || store.area || userCity}`,
                      });
                    }
                  }}
                  isGoogle={store.source === "google"}
                />
              </div>
            );
          })}
        </AnimatePresence>

        {/* Google loading inline */}
        {!loading && googleLoading && (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">جاري البحث عن مطاعم قريبة...</span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && displayStores.length === 0 && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-foreground font-bold text-lg">لا توجد مطاعم</p>
            <p className="text-muted-foreground text-sm mt-1">
              {search ? "لا توجد نتائج لبحثك" : "لا توجد مطاعم متاحة حالياً"}
            </p>
            {search && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearch("")}
                className="mt-3"
              >
                مسح البحث
              </Button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

/* ─── Filter Tab ─── */
const FilterTab = ({
  active, onClick, icon, label, count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count?: number;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
      active
        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
        : "bg-card border border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
    }`}
  >
    {icon}
    <span>{label}</span>
    {count != null && (
      <span className={`text-[10px] ${active ? "text-primary-foreground/70" : "text-muted-foreground/60"}`}>
        ({count})
      </span>
    )}
  </button>
);

/* ─── Restaurant Card ─── */
const RestaurantCard = ({
  store, index, onView, isGoogle = false,
}: {
  store: RestaurantItem;
  index: number;
  onView: () => void;
  isGoogle?: boolean;
}) => {
  const isClosed = store.is_open === false;
  const categoryLabel = CATEGORY_LABELS[store.category || "restaurant"] || store.category || "مطعم";
  const categoryIcon = CATEGORY_ICONS[store.category || "restaurant"] || <Store className="w-3.5 h-3.5" />;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      onClick={onView}
      className={`group bg-card rounded-2xl border overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:shadow-primary/5 active:scale-[0.98] ${
        isClosed
          ? "border-border/50 opacity-70"
          : isGoogle
          ? "border-info/20 hover:border-info/40"
          : "border-border hover:border-primary/40"
      }`}
    >
      <div className="flex gap-3 p-3">
        {/* Image */}
        <div className="relative w-24 h-24 rounded-xl bg-secondary flex-shrink-0 overflow-hidden">
          {store.image_url ? (
            <img
              src={store.image_url}
              alt={store.name}
              className={`w-full h-full object-cover ${isClosed ? "grayscale" : ""}`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8 text-muted-foreground/30" />
            </div>
          )}
          {/* Status badge on image */}
          <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-sm ${
            isClosed
              ? "bg-destructive/80 text-destructive-foreground"
              : "bg-green-500/80 text-white"
          }`}>
            {isClosed ? "مغلق" : "مفتوح"}
          </div>
          {isGoogle && (
            <div className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-info/80 text-white backdrop-blur-sm">
              Google
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <h3 className="font-bold text-foreground text-base truncate leading-tight">
              {store.name || "مطعم"}
            </h3>

            {/* Category & distance row */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                {categoryIcon}
                {categoryLabel}
              </span>
              {store.distance != null && (
                <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                  <MapPin className="w-3 h-3" />
                  {store.distance < 1
                    ? `${Math.round(store.distance * 1000)} م`
                    : `${store.distance.toFixed(1)} كم`}
                </span>
              )}
            </div>

            {store.description && (
              <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{store.description}</p>
            )}
          </div>

          {/* Bottom row: rating, time, action */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              {store.rating != null && store.rating > 0 && (
                <span className="flex items-center gap-0.5 text-xs font-bold text-warning">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {store.rating.toFixed(1)}
                </span>
              )}
              <span className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {store.delivery_time_min || 20}-{store.delivery_time_max || 40} د
              </span>
              <span className="text-[11px] font-bold text-primary">
                {store.delivery_fee || 10} DH
              </span>
            </div>

            <Button
              size="sm"
              variant={isClosed ? "outline" : "default"}
              className={`h-7 text-[11px] px-2.5 rounded-lg ${
                isClosed
                  ? "border-border text-muted-foreground"
                  : "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onView();
              }}
            >
              {isClosed ? (
                <>
                  <Eye className="w-3 h-3 ml-1" />
                  عرض
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3 h-3 ml-1" />
                  اطلب
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default RestaurantsList;
