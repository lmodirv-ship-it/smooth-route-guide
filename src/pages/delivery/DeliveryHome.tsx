import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  ArrowRight,
  ChefHat,
  ShoppingCart,
  Gift,
  Heart,
  Bike,
  Store,
  Sparkles,
  Zap,
  Phone,
  LogOut,
} from "lucide-react";
import { useLogout } from "@/hooks/useLogout";
import RoleSwitcher from "@/components/RoleSwitcher";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";
import SubscriptionIndicator from "@/components/SubscriptionIndicator";

const CATEGORY_META = [
  {
    id: "restaurant",
    icon: ChefHat,
    label: "مطاعم",
    labelFr: "Restaurants",
    color: "from-orange-500 to-amber-400",
    path: "/delivery/restaurants",
    matches: ["restaurant", "restaurants", "food", "مطاعم", "restaurant_food"],
  },
  {
    id: "supermarket",
    icon: ShoppingCart,
    label: "سوبرماركت",
    labelFr: "Supermarchés",
    color: "from-emerald-500 to-green-400",
    path: "/delivery/supermarkets",
    matches: ["supermarket", "grocery", "groceries", "market", "سوبرماركت"],
  },
  {
    id: "shops",
    icon: Gift,
    label: "متاجر وهدايا",
    labelFr: "Boutiques & Cadeaux",
    color: "from-violet-500 to-purple-400",
    path: "/delivery/shops",
    matches: ["shop", "shops", "gift", "gifts", "store", "متاجر", "هدايا"],
  },
  {
    id: "pharmacy",
    icon: Heart,
    label: "صيدلية وتجميل",
    labelFr: "Parapharmacie",
    color: "from-pink-500 to-rose-400",
    path: "/delivery/pharmacy",
    matches: ["pharmacy", "beauty", "cosmetics", "صيدلية", "تجميل"],
  },
  {
    id: "courier",
    icon: Bike,
    label: "خدمة كورسيي",
    labelFr: "Service Coursier",
    color: "from-sky-500 to-blue-400",
    path: "/delivery/courier",
    matches: ["courier", "parcel", "delivery", "express", "كورسيي", "طرود"],
  },
  {
    id: "market",
    icon: Store,
    label: "ماركت سريع",
    labelFr: "Market",
    color: "from-amber-500 to-yellow-400",
    path: "/delivery/market",
    matches: ["market", "mini_market", "convenience", "ماركت"],
  },
];

const DeliveryHome = () => {
  const navigate = useNavigate();
  const logout = useLogout();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("طنجة");
  const [currentZone, setCurrentZone] = useState<string | null>(null);
  const [zones, setZones] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [settingsMap, setSettingsMap] = useState<Record<string, any>>({});

  const fetchHomeData = async () => {
    const [zonesRes, storesRes, settingsRes, userRes] = await Promise.all([
      supabase.from("zones").select("*").eq("is_active", true),
      supabase.from("stores").select("*").eq("is_open", true),
      supabase.from("app_settings").select("key, value"),
      supabase.auth.getUser(),
    ]);

    setZones(zonesRes.data || []);
    setStores(storesRes.data || []);
    setSettingsMap(
      Object.fromEntries((settingsRes.data || []).map((item: any) => [item.key, item.value]))
    );

    const userId = userRes.data.user?.id;
    if (!userId) {
      setRecentOrders([]);
      return;
    }

    const ordersRes = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(3);

    setRecentOrders(ordersRes.data || []);
  };

  useEffect(() => {
    void fetchHomeData();

    const channel = supabase
      .channel("delivery-home-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "zones" }, fetchHomeData)
      .on("postgres_changes", { event: "*", schema: "public", table: "stores" }, fetchHomeData)
      .on("postgres_changes", { event: "*", schema: "public", table: "app_settings" }, fetchHomeData)
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchHomeData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (zones.length === 0) {
          setLocation((settingsMap.default_city as string) || "طنجة");
          return;
        }

        let closest = zones[0];
        let minDist = Infinity;
        zones.forEach((zone) => {
          const distance = Math.sqrt((lat - zone.center_lat) ** 2 + (lng - zone.center_lng) ** 2);
          if (distance < minDist) {
            minDist = distance;
            closest = zone;
          }
        });

        setCurrentZone(closest.id);
        setLocation(`${closest.name_ar} - ${settingsMap.default_city || "طنجة"}`);
      },
      () => setLocation(`${settingsMap.default_city || "طنجة"} - تفعيل GPS`),
      { timeout: 8000 }
    );
  }, [settingsMap.default_city, zones]);

  const storesInZone = useMemo(() => {
    if (!currentZone) return stores;
    return stores.filter((store) => !store.zone_id || store.zone_id === currentZone);
  }, [currentZone, stores]);

  const categories = useMemo(() => {
    return CATEGORY_META.map((category) => {
      const count = storesInZone.filter((store) => {
        const storeCategory = String(store.category || "").toLowerCase();
        return category.matches.some((value) => storeCategory.includes(value.toLowerCase()));
      }).length;

      return {
        ...category,
        count,
      };
    });
  }, [storesInZone]);

  const filtered = useMemo(() => {
    return categories.filter(
      (category) =>
        category.label.includes(search) ||
        category.labelFr.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  const supportPhone =
    settingsMap.support_phone || settingsMap.call_center_phone || settingsMap.delivery_support_phone || "0539-XXX-XXX";
  const expressTitle = settingsMap.delivery_express_title || "Livraison Rapide ⚡";
  const expressSubtitle = settingsMap.delivery_express_subtitle || "15-30 min في جميع أحياء طنجة";
  const expressBadge = settingsMap.delivery_express_badge || "EXPRESS";
  const promoTitle = settingsMap.delivery_promo_title || "التوصيل مجاني للطلب الأول!";
  const promoSubtitle = settingsMap.delivery_promo_subtitle || "Livraison gratuite pour la 1ère commande";
  const promoBadge = settingsMap.delivery_promo_badge || "FREE";

  return (
    <>
      <div className="min-h-screen delivery-bg relative overflow-hidden" dir="rtl">
        <div className="relative bg-gradient-to-br from-primary/90 via-accent/80 to-primary/70 pt-6 pb-16 px-5 rounded-b-[2.5rem]">
          <div className="absolute inset-0 overflow-hidden rounded-b-[2.5rem]">
            <div className="absolute top-4 left-10 w-2 h-2 rounded-full bg-white/20 animate-pulse" />
            <div className="absolute top-16 right-8 w-1.5 h-1.5 rounded-full bg-white/15 animate-pulse" style={{ animationDelay: "0.5s" }} />
            <div className="absolute bottom-10 left-20 w-1 h-1 rounded-full bg-white/25 animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          <div className="flex items-center justify-between mb-3 relative z-10">
            <div className="flex items-center gap-1">
              <button onClick={logout} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm" title="تسجيل الخروج">
                <LogOut className="w-4 h-4 text-primary-foreground" />
              </button>
              <button onClick={() => navigate("/welcome")} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
                <ArrowRight className="w-5 h-5 text-primary-foreground" />
              </button>
            </div>
            <img src={deliveryLogo} alt="HN Delivery" className="w-11 h-11 rounded-full border-2 border-white/30 shadow-lg" />
            <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
              <MapPin className="w-3.5 h-3.5 text-primary-foreground" />
              <span className="text-xs text-primary-foreground font-medium truncate max-w-[120px]">{location}</span>
            </div>
          </div>
          <div className="flex justify-end mb-3 relative z-10">
            <SubscriptionIndicator />
          </div>

          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-5 relative z-10"
          >
            <h1 className="text-2xl font-bold text-primary-foreground font-display">ماذا تريد اليوم؟</h1>
            <p className="text-sm text-primary-foreground/70 mt-1">توصيل سريع في {(settingsMap.default_city as string) || "طنجة"} 🇲🇦</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="relative z-10"
          >
            <div className="relative">
              <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن مطعم، متجر، منتج..."
                className="bg-background/95 backdrop-blur-sm border-0 h-12 rounded-2xl pr-11 text-right shadow-xl shadow-black/20 placeholder:text-muted-foreground/60"
              />
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mx-5 -mt-6 relative z-20 mb-5"
        >
          <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-lg shadow-emerald-500/20">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{expressTitle}</p>
              <p className="text-xs text-white/70">{expressSubtitle}</p>
            </div>
            <div className="bg-white/20 rounded-xl px-2.5 py-1">
              <span className="text-xs font-bold text-white">{expressBadge}</span>
            </div>
          </div>
        </motion.div>

        <div className="px-5 relative z-10">
          <div className="grid grid-cols-3 gap-4">
            {filtered.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.08, type: "spring", stiffness: 200 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => navigate(cat.path)}
                className="flex flex-col items-center gap-2.5 group"
              >
                <div className="relative w-[72px] h-[72px] rounded-full glass-card flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300" style={{ boxShadow: "inset 0 0 20px hsl(205 80% 55% / 0.1), 0 0 15px hsl(205 80% 55% / 0.08)" }}>
                  <div className="absolute inset-[3px] rounded-full bg-card/80 flex items-center justify-center">
                    <cat.icon className="w-7 h-7 text-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-foreground leading-tight">{cat.label}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{cat.count} متاجر · {cat.labelFr}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {zones.length > 0 && (
          <div className="px-5 mt-6">
            <h2 className="text-sm font-bold text-foreground mb-3">الأحياء المتاحة</h2>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => {
                    setCurrentZone(zone.id);
                    setLocation(`${zone.name_ar} - ${settingsMap.default_city || "طنجة"}`);
                  }}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-all ${
                    currentZone === zone.id
                      ? "gradient-primary text-primary-foreground shadow-md shadow-primary/20 glow-primary"
                      : "glass-card text-foreground"
                  }`}
                >
                  {zone.name_ar}
                </button>
              ))}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mx-5 mt-5 mb-4"
        >
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-accent to-primary p-[1px]">
            <div className="glass-card rounded-2xl px-5 py-4 flex items-center gap-4">
              <Sparkles className="w-8 h-8 text-primary flex-shrink-0" />
              <div className="text-right flex-1">
                <p className="text-sm font-bold text-foreground">{promoTitle}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{promoSubtitle}</p>
              </div>
              <div className="bg-primary/10 rounded-xl px-3 py-1.5">
                <span className="text-xs font-bold text-primary">{promoBadge}</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="mx-5 mb-4">
          <button
            onClick={() => navigate("/delivery/support")}
            className="w-full glass-card rounded-2xl p-4 flex items-center gap-3 transition-all"
          >
            <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
              <Phone className="w-5 h-5 text-info" />
            </div>
            <div className="flex-1 text-right">
              <p className="text-sm font-bold text-foreground">مركز المساعدة</p>
              <p className="text-xs text-muted-foreground">اتصل بنا مباشرة عبر الفريق الحي</p>
            </div>
            <span className="text-xs text-info font-bold bg-info/10 px-2.5 py-1 rounded-full">{supportPhone}</span>
          </button>
        </div>

        {/* Our Services Section */}
        <div className="px-5 mt-2 mb-5">
          <h2 className="text-sm font-bold text-foreground mb-3">🌐 خدماتنا الأخرى</h2>
          <div className="grid grid-cols-2 gap-3">
            <motion.a
              href="https://souk-hn.com"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="relative overflow-hidden rounded-2xl border border-border glass-card group hover:border-primary/40 transition-all"
            >
              <div className="h-24 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-yellow-500/20 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1607082349566-187342175e2f?w=400&h=200&fit=crop"
                  alt="Souk HN"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              </div>
              <div className="p-3 text-right relative">
                <p className="text-sm font-bold text-foreground">🛍️ Souk.HN</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">سوق إلكتروني - تسوق الآن</p>
                <div className="absolute top-2 left-2 bg-green-500/10 text-green-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">متاح</div>
              </div>
            </motion.a>
            <motion.a
              href="https://matba3a.hn"
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="relative overflow-hidden rounded-2xl border border-border glass-card group hover:border-primary/40 transition-all"
            >
              <div className="h-24 bg-gradient-to-br from-blue-500/20 via-indigo-500/10 to-purple-500/20 flex items-center justify-center">
                <img
                  src="https://images.unsplash.com/photo-1562654501-a0ccc0fc3fb1?w=400&h=200&fit=crop"
                  alt="HN Print"
                  className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent" />
              </div>
              <div className="p-3 text-right relative">
                <p className="text-sm font-bold text-foreground">🖨️ HN Print</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">مطبعة احترافية - اطلب الآن</p>
                <div className="absolute top-2 left-2 bg-green-500/10 text-green-500 text-[9px] font-bold px-1.5 py-0.5 rounded-full">متاح</div>
              </div>
            </motion.a>
          </div>
        </div>

        <div className="px-5 mb-8">
          <h2 className="text-sm font-bold text-foreground mb-3">طلبات سابقة</h2>
          {recentOrders.length === 0 ? (
            <div className="glass-card rounded-2xl p-5 flex flex-col items-center gap-2">
              <Store className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">لا توجد طلبات سابقة</p>
              <p className="text-xs text-muted-foreground/60">ستظهر طلباتك هنا بعد أول توصيل</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div key={order.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    order.status === "delivered" || order.status === "completed"
                      ? "bg-success/10 text-success"
                      : "bg-primary/10 text-primary"
                  }`}>
                    {order.status === "delivered" || order.status === "completed" ? "تم التسليم" : "قيد التوصيل"}
                  </span>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">{order.store_name || order.category}</p>
                    <p className="text-[10px] text-muted-foreground">{order.created_at ? new Date(order.created_at).toLocaleDateString("ar-MA") : "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <RoleSwitcher />
    </>
  );
};

export default DeliveryHome;
