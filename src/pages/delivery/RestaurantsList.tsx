import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Search, Star, Clock, MapPin, ChevronLeft, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { Badge } from "@/components/ui/badge";

const RestaurantsList = () => {
  const navigate = useNavigate();
  const { totalItems } = useCart();
  const [search, setSearch] = useState("");
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStores = async () => {
    setLoading(true);
    try {
      // Fetch from "restaurants" collection directly, filter isActive
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("rating", { ascending: false });
      
      if (error) {
        console.error("[restaurants] fetch error:", error);
      }
      
      // Filter active restaurants - support both isActive and is_open field names
      const activeStores = (data || []).filter((s: any) => s.isActive === true || s.is_open === true);
      console.info(`[restaurants] fetched ${data?.length || 0} total, ${activeStores.length} active`);
      setStores(activeStores);
    } catch (err) {
      console.error("[restaurants] unexpected error:", err);
      setStores([]);
    }
    setLoading(false);
  };

  useEffect(() => { fetchStores(); }, []);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel("stores-client-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => fetchStores())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = stores.filter(
    (s) =>
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
  );

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
            <h1 className="text-xl font-bold text-primary-foreground">مطاعم طنجة</h1>
            <p className="text-xs text-primary-foreground/70">Restaurants - Tanger</p>
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
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))
          : filtered.length === 0
          ? (
            <div className="text-center py-16">
              <UtensilsCrossed className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-lg">لا توجد مطاعم متاحة حالياً</p>
              <p className="text-xs text-muted-foreground/60 mt-1">سيتم إضافة مطاعم جديدة قريباً</p>
            </div>
          )
          : filtered.map((store, i) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                onClick={() => navigate(`/delivery/restaurant/${store.id}`)}
                className="bg-card rounded-2xl border border-border overflow-hidden hover:border-primary/40 transition-all cursor-pointer active:scale-[0.98]"
              >
                <div className="flex items-start gap-3 p-4">
                  <div className="w-16 h-16 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                    {(store.image_url || store.imageURL) ? (
                      <img src={store.image_url || store.imageURL} alt={store.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-6 h-6 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-base truncate">{store.name || "مطعم"}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{store.description || ""}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs font-semibold text-warning">
                        <Star className="w-3.5 h-3.5 fill-current" />
                        {store.rating || "—"}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {store.estimatedDeliveryTime || store.delivery_time_min ? `${store.delivery_time_min || 20}-${store.delivery_time_max || 40} دقيقة` : "30-45 دقيقة"}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        {store.city || store.address?.split("،")[0] || "—"}
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs font-bold text-primary">{store.deliveryFee || store.delivery_fee || 10} DH</span>
                      <span className="text-[10px] text-muted-foreground mr-1">رسوم التوصيل</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
      </div>
    </div>
  );
};

export default RestaurantsList;
