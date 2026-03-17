import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Search, MapPin, Plus, Minus, ShoppingBag, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const categoryMeta: Record<string, { title: string; titleFr: string; emoji: string }> = {
  restaurants: { title: "مطاعم", titleFr: "Restaurants", emoji: "🍽️" },
  supermarkets: { title: "سوبرماركت", titleFr: "Supermarchés", emoji: "🛒" },
  shops: { title: "متاجر وهدايا", titleFr: "Boutiques & Cadeaux", emoji: "🎁" },
  pharmacy: { title: "صيدلية وتجميل", titleFr: "Parapharmacie & Beauté", emoji: "💊" },
  courier: { title: "خدمة كورسيي", titleFr: "Service Coursier", emoji: "📦" },
  market: { title: "ماركت سريع", titleFr: "Market", emoji: "🏪" },
};

const mockStores: Record<string, { id: string; name: string; desc: string; rating: number; time: string }[]> = {
  restaurants: [
    { id: "1", name: "بيتزا هت", desc: "بيتزا، وجبات سريعة", rating: 4.5, time: "25-35 دقيقة" },
    { id: "2", name: "مطعم الشرق", desc: "مأكولات شرقية تقليدية", rating: 4.8, time: "30-40 دقيقة" },
    { id: "3", name: "برغر كينغ", desc: "برغر، مشروبات", rating: 4.2, time: "20-30 دقيقة" },
  ],
  supermarkets: [
    { id: "1", name: "كارفور", desc: "سوبرماركت شامل", rating: 4.3, time: "40-60 دقيقة" },
    { id: "2", name: "أسواق السلام", desc: "منتجات طازجة يومياً", rating: 4.6, time: "35-50 دقيقة" },
  ],
  shops: [
    { id: "1", name: "متجر الهدايا", desc: "هدايا وتغليف فاخر", rating: 4.7, time: "30-45 دقيقة" },
    { id: "2", name: "بوتيك الأناقة", desc: "ملابس وإكسسوارات", rating: 4.4, time: "35-50 دقيقة" },
  ],
  pharmacy: [
    { id: "1", name: "صيدلية الحياة", desc: "أدوية ومستحضرات تجميل", rating: 4.9, time: "20-30 دقيقة" },
    { id: "2", name: "بيوتي شوب", desc: "مستحضرات تجميل وعناية", rating: 4.5, time: "25-35 دقيقة" },
  ],
  courier: [
    { id: "1", name: "إرسال طرد", desc: "توصيل سريع من نقطة لنقطة", rating: 5, time: "15-25 دقيقة" },
  ],
  market: [
    { id: "1", name: "ماركت السريع", desc: "احتياجاتك اليومية في دقائق", rating: 4.6, time: "15-25 دقيقة" },
  ],
};

const DeliveryCategory = () => {
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const meta = categoryMeta[category || ""] || { title: "توصيل", titleFr: "Delivery", emoji: "📦" };
  const stores = mockStores[category || ""] || [];
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);

  const filteredStores = stores.filter((s) =>
    s.name.includes(search) || s.desc.includes(search)
  );

  const handleOrder = async (store: typeof stores[0]) => {
    setLoading(true);
    setSelectedStore(store.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
        navigate("/login?role=delivery");
        return;
      }

      // Get GPS location
      let lat: number | undefined, lng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {}

      const { error } = await supabase.from("delivery_orders").insert({
        user_id: user.id,
        category: category || "general",
        store_name: store.name,
        delivery_lat: lat,
        delivery_lng: lng,
        status: "pending",
        estimated_price: Math.floor(Math.random() * 50) + 20,
      });

      if (error) throw error;

      toast({ title: "تم إنشاء الطلب بنجاح ✅", description: `طلبك من ${store.name} قيد المعالجة` });
      navigate("/delivery/tracking");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
      setSelectedStore(null);
    }
  };

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
            <p className="text-xs text-primary-foreground/60">{meta.titleFr}</p>
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

      {/* Stores */}
      <div className="px-5 mt-5 space-y-3 pb-8">
        {filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">لا توجد نتائج</p>
          </div>
        ) : (
          filteredStores.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 text-right">
                  <h3 className="font-bold text-foreground">{store.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{store.desc}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-warning">⭐ {store.rating}</span>
                    <span className="text-xs text-muted-foreground">🕐 {store.time}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleOrder(store)}
                  disabled={loading && selectedStore === store.id}
                  className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5"
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
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default DeliveryCategory;
