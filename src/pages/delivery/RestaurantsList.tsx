import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Search, Star, Clock, MapPin, ChevronLeft, UtensilsCrossed, Loader2, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";

interface RestaurantItem {
  id: string;
  name: string;
  description?: string;
  address?: string;
  area?: string;
  rating?: number;
  image_url?: string;
  is_open?: boolean;
  delivery_fee?: number;
  delivery_time_min?: number;
  delivery_time_max?: number;
  city?: string;
  source: "db" | "google";
  google_place_id?: string;
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

  // Fetch DB stores
  const fetchDbStores = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("is_open", true)
        .order("rating", { ascending: false });

      if (error) console.error("[restaurants] db fetch error:", error);

      const mapped: RestaurantItem[] = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        address: s.address,
        area: s.area,
        rating: s.rating,
        image_url: s.image_url,
        is_open: s.is_open,
        delivery_fee: s.delivery_fee,
        delivery_time_min: s.delivery_time_min,
        delivery_time_max: s.delivery_time_max,
        city: s.city || s.area,
        source: "db" as const,
        google_place_id: s.google_place_id,
      }));
      setDbStores(mapped);
    } catch (err) {
      console.error("[restaurants] unexpected error:", err);
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
          rating: r.rating,
          image_url: r.image_url,
          is_open: r.is_open,
          delivery_fee: 15,
          delivery_time_min: 25,
          delivery_time_max: 45,
          city: city,
          source: "google" as const,
          google_place_id: r.google_place_id,
        }));

      console.info(`[google-places] fetched ${restaurants.length} restaurants from ${data?.source} for ${city}`);
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
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          // Reverse geocode to get city name
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

  // Merge and deduplicate: DB stores take priority over Google results
  const allStores = useMemo(() => {
    const dbPlaceIds = new Set(dbStores.map((s) => s.google_place_id).filter(Boolean));
    const uniqueGoogle = googleStores.filter(
      (g) => !g.google_place_id || !dbPlaceIds.has(g.google_place_id)
    );
    return [...dbStores, ...uniqueGoogle];
  }, [dbStores, googleStores]);

  const filtered = allStores.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase()) ||
      s.area?.toLowerCase().includes(search.toLowerCase())
  );

  const isLoading = loading && googleLoading;

  return (
    <div className="min-h-screen delivery-bg" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/80 via-accent/60 to-primary/40 pt-6 pb-8 px-5 rounded-b-3xl relative">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/delivery")} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
            <ArrowRight className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="text-center">
            <span className="text-3xl">🍽️</span>
            <h1 className="text-xl font-bold text-primary-foreground">مطاعم {userCity}</h1>
            <p className="text-xs text-primary-foreground/70">Restaurants - {userCity}</p>
          </div>
          <button onClick={() => navigate("/delivery/cart")} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm relative">
            <ChevronLeft className="w-5 h-5 text-primary-foreground" />
            {totalItems > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
                {totalItems}
              </Badge>
            )}
          </button>
        </div>

        {/* City indicator */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <MapPin className="w-3.5 h-3.5 text-primary-foreground/80" />
          <span className="text-xs text-primary-foreground/80 font-medium">{userCity}</span>
          {googleLoading && <Loader2 className="w-3 h-3 text-primary-foreground/60 animate-spin" />}
        </div>

        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن مطعم..."
            className="bg-background/95 border-0 h-11 rounded-xl pr-10 text-right shadow-lg"
          />
        </div>
      </div>

      {/* Restaurant List */}
      <div className="px-5 py-4 space-y-3 pb-24">
        {/* DB Stores Section */}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={`skel-${i}`} className="h-28 rounded-2xl" />
          ))
        ) : dbStores.length > 0 && (
          <>
            <div className="flex items-center gap-2 mb-1">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold text-foreground">مطاعمنا الشريكة</h2>
              <Badge variant="secondary" className="text-[10px]">{dbStores.length}</Badge>
            </div>
            {dbStores
              .filter(
                (s) =>
                  s.name?.toLowerCase().includes(search.toLowerCase()) ||
                  s.description?.toLowerCase().includes(search.toLowerCase()) ||
                  s.address?.toLowerCase().includes(search.toLowerCase())
              )
              .map((store, i) => (
                <RestaurantCard
                  key={store.id}
                  store={store}
                  index={i}
                  onClick={() => navigate(`/delivery/restaurant/${store.id}`)}
                />
              ))}
          </>
        )}

        {/* Google Places Section */}
        {googleLoading ? (
          <div className="flex items-center justify-center gap-2 py-6">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm text-muted-foreground">جاري البحث عن مطاعم قريبة...</span>
          </div>
        ) : googleStores.length > 0 && (
          <>
            <div className="flex items-center gap-2 mt-4 mb-1">
              <Globe className="w-4 h-4 text-info" />
              <h2 className="text-sm font-bold text-foreground">مطاعم قريبة منك</h2>
              <Badge variant="outline" className="text-[10px] border-info/30 text-info">{googleStores.length}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">
              مطاعم مفتوحة حالياً في {userCity} عبر Google
            </p>
            {googleStores
              .filter(
                (s) =>
                  s.name?.toLowerCase().includes(search.toLowerCase()) ||
                  s.description?.toLowerCase().includes(search.toLowerCase()) ||
                  s.address?.toLowerCase().includes(search.toLowerCase())
              )
              .map((store, i) => (
                <RestaurantCard
                  key={store.id}
                  store={store}
                  index={i}
                  onClick={() => {
                    toast({
                      title: store.name,
                      description: `📍 ${store.address || store.area || userCity}`,
                    });
                  }}
                  isGoogle
                />
              ))}
          </>
        )}

        {/* Empty state */}
        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-16">
            <UtensilsCrossed className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-lg">لا توجد مطاعم متاحة حالياً</p>
            <p className="text-xs text-muted-foreground/60 mt-1">سيتم إضافة مطاعم جديدة قريباً</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable restaurant card
const RestaurantCard = ({
  store,
  index,
  onClick,
  isGoogle = false,
}: {
  store: RestaurantItem;
  index: number;
  onClick: () => void;
  isGoogle?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05 }}
    onClick={onClick}
    className={`bg-card rounded-2xl border overflow-hidden hover:border-primary/40 transition-all cursor-pointer active:scale-[0.98] ${
      isGoogle ? "border-info/20" : "border-border"
    }`}
  >
    <div className="flex items-start gap-3 p-4">
      <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
        {store.image_url ? (
          <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
        ) : (
          <UtensilsCrossed className="w-6 h-6 text-muted-foreground/40" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-foreground text-base truncate">{store.name || "مطعم"}</h3>
          {isGoogle && (
            <Badge variant="outline" className="text-[9px] border-info/30 text-info px-1.5 py-0 h-4 flex-shrink-0">
              Google
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{store.description || store.address || ""}</p>
        <div className="flex items-center gap-3 mt-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs font-semibold text-warning">
            <Star className="w-3.5 h-3.5 fill-current" />
            {store.rating || "—"}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {`${store.delivery_time_min || 20}-${store.delivery_time_max || 40} دقيقة`}
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            {store.area || store.city || "—"}
          </span>
        </div>
        <div className="mt-2">
          <span className="text-xs font-bold text-primary">{store.delivery_fee || 10} DH</span>
          <span className="text-[10px] text-muted-foreground mr-1">رسوم التوصيل</span>
        </div>
      </div>
    </div>
  </motion.div>
);

export default RestaurantsList;
