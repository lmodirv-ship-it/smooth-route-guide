import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Search, MapPin, ShoppingBag, Loader2, Star, Clock, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const categoryMeta: Record<string, { title: string; titleFr: string; emoji: string; dbCategory: string }> = {
  restaurants: { title: "مطاعم", titleFr: "Restaurants", emoji: "🍽️", dbCategory: "restaurant" },
  supermarkets: { title: "سوبرماركت", titleFr: "Supermarchés", emoji: "🛒", dbCategory: "supermarket" },
  shops: { title: "متاجر وهدايا", titleFr: "Boutiques & Cadeaux", emoji: "🎁", dbCategory: "shops" },
  pharmacy: { title: "صيدلية وتجميل", titleFr: "Parapharmacie & Beauté", emoji: "💊", dbCategory: "pharmacy" },
  courier: { title: "خدمة كورسيي", titleFr: "Service Coursier", emoji: "📦", dbCategory: "courier" },
  market: { title: "ماركت سريع", titleFr: "Market", emoji: "🏪", dbCategory: "market" },
};

const DeliveryCategory = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const meta = categoryMeta[category || ""] || { title: "توصيل", titleFr: "Delivery", emoji: "📦", dbCategory: "restaurant" };
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [stores, setStores] = useState<any[]>([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [deliveryType, setDeliveryType] = useState<"standard" | "express">("standard");

  // Redirect courier to dedicated send flow, restaurants to dedicated page
  useEffect(() => {
    if (category === "courier") navigate("/delivery/courier/send", { replace: true });
    if (category === "restaurants") navigate("/delivery/restaurants", { replace: true });
  }, [category, navigate]);

  // Fetch real stores from DB
  useEffect(() => {
    const fetchStores = async () => {
      setStoresLoading(true);
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("category", meta.dbCategory)
        .eq("is_open", true)
        .order("rating", { ascending: false });
      setStores(data || []);
      setStoresLoading(false);
    };
    if (category !== "courier" && category !== "restaurants") fetchStores();
  }, [category, meta.dbCategory]);

  const filteredStores = stores.filter((s) =>
    s.name.includes(search) || s.description?.includes(search) || s.address?.includes(search)
  );

  const handleOrder = async (store: any) => {
    setLoading(true);
    setSelectedStore(store.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
        navigate("/login?role=delivery");
        return;
      }

      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const deliveryFee = deliveryType === "express" ? (store.delivery_fee || 10) * 1.5 : (store.delivery_fee || 10);

      const { error } = await supabase.from("delivery_orders").insert({
        user_id: user.id,
        category: meta.dbCategory,
        store_name: store.name,
        delivery_lat: lat,
        delivery_lng: lng,
        pickup_address: store.address || '',
        pickup_lat: store.lat,
        pickup_lng: store.lng,
        zone_id: store.zone_id,
        status: "pending",
        estimated_price: deliveryFee,
        delivery_type: deliveryType,
      });

      if (error) throw error;

      toast({
        title: "تم إنشاء الطلب بنجاح ✅",
        description: `طلبك من ${store.name} قيد المعالجة ${deliveryType === "express" ? "⚡ Express" : ""}`,
      });
      navigate("/delivery/tracking");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setSelectedStore(null);
    }
  };

  if (category === "courier" || category === "restaurants") return null;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary/80 via-accent/60 to-primary/50 pt-6 pb-8 px-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/delivery")} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
            <ArrowRight className="w-5 h-5 text-primary-foreground" />
          </button>
          <div className="text-center">
            <span className="text-2xl">{meta.emoji}</span>
            <h1 className="text-lg font-bold text-primary-foreground">{meta.title}</h1>
            <p className="text-xs text-primary-foreground/60">{meta.titleFr} - طنجة</p>
          </div>
          <div className="w-9" />
        </div>
        <div className="relative">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`ابحث في ${meta.title}...`}
            className="bg-background/95 border-0 h-11 rounded-xl pr-10 text-right shadow-lg"
          />
        </div>
      </div>

      {/* Delivery Type Toggle */}
      <div className="px-5 mt-4 mb-3">
        <div className="flex gap-2 bg-card rounded-xl border border-border p-1">
          <button
            onClick={() => setDeliveryType("standard")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              deliveryType === "standard"
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            عادي (30-60 دقيقة)
          </button>
          <button
            onClick={() => setDeliveryType("express")}
            className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              deliveryType === "express"
                ? "bg-emerald-500 text-white shadow-md"
                : "text-muted-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            سريع (15-30 دقيقة)
          </button>
        </div>
      </div>

      {/* Stores */}
      <div className="px-5 space-y-3 pb-8">
        {storesLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">جاري تحميل المتاجر...</p>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد نتائج في طنجة</p>
            <p className="text-xs text-muted-foreground/60 mt-1">جرب البحث بكلمة أخرى</p>
          </div>
        ) : (
          filteredStores.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <Button
                  size="sm"
                  onClick={() => handleOrder(store)}
                  disabled={loading && selectedStore === store.id}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 flex-shrink-0"
                >
                  {loading && selectedStore === store.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      اطلب
                    </>
                  )}
                </Button>
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-foreground">{store.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{store.description}</p>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-warning">
                      <Star className="w-3 h-3 fill-current" />
                      {store.rating}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {deliveryType === "express"
                        ? `${Math.max(10, (store.delivery_time_min || 20) - 10)}-${(store.delivery_time_max || 40) - 10} دقيقة`
                        : `${store.delivery_time_min || 20}-${store.delivery_time_max || 40} دقيقة`
                      }
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {store.address?.split("،")[0]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-primary">
                      {deliveryType === "express"
                        ? `${Math.round((store.delivery_fee || 10) * 1.5)} DH`
                        : `${store.delivery_fee || 10} DH`
                      }
                    </span>
                    <span className="text-[10px] text-muted-foreground">رسوم التوصيل</span>
                    {deliveryType === "express" && (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-bold px-1.5 py-0.5 rounded-full">⚡ EXPRESS</span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeliveryCategory;
