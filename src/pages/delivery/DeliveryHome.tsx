import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search, MapPin, ArrowRight, ChefHat, ShoppingCart,
  Gift, Heart, Bike, Store, Sparkles
} from "lucide-react";
import { Input } from "@/components/ui/input";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";

const categories = [
  { id: "restaurants", icon: ChefHat, label: "مطاعم", labelFr: "Restaurants", color: "from-orange-500 to-amber-400", path: "/delivery/restaurants" },
  { id: "supermarkets", icon: ShoppingCart, label: "سوبرماركت", labelFr: "Supermarchés", color: "from-emerald-500 to-green-400", path: "/delivery/supermarkets" },
  { id: "shops", icon: Gift, label: "متاجر وهدايا", labelFr: "Boutiques & Cadeaux", color: "from-violet-500 to-purple-400", path: "/delivery/shops" },
  { id: "pharmacy", icon: Heart, label: "صيدلية وتجميل", labelFr: "Parapharmacie", color: "from-pink-500 to-rose-400", path: "/delivery/pharmacy" },
  { id: "courier", icon: Bike, label: "خدمة كورسيي", labelFr: "Service Coursier", color: "from-sky-500 to-blue-400", path: "/delivery/courier" },
  { id: "market", icon: Store, label: "ماركت سريع", labelFr: "Market", color: "from-amber-500 to-yellow-400", path: "/delivery/market" },
];

const DeliveryHome = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("جاري تحديد الموقع...");

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setLocation("موقعك الحالي"),
        () => setLocation("تعذر تحديد الموقع")
      );
    }
  }, []);

  const filtered = categories.filter(
    (c) => c.label.includes(search) || c.labelFr.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden" dir="rtl">
      {/* Gradient Header */}
      <div className="relative bg-gradient-to-br from-primary/90 via-accent/80 to-primary/70 pt-6 pb-16 px-5 rounded-b-[2.5rem]">
        {/* Decorative particles */}
        <div className="absolute inset-0 overflow-hidden rounded-b-[2.5rem]">
          <div className="absolute top-4 left-10 w-2 h-2 rounded-full bg-white/20 animate-pulse" />
          <div className="absolute top-16 right-8 w-1.5 h-1.5 rounded-full bg-white/15 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="absolute bottom-10 left-20 w-1 h-1 rounded-full bg-white/25 animate-pulse" style={{ animationDelay: "1s" }} />
        </div>

        {/* Top bar */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <button onClick={() => navigate("/welcome")} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
            <ArrowRight className="w-5 h-5 text-primary-foreground" />
          </button>
          <img src={deliveryLogo} alt="HN Delivery" className="w-11 h-11 rounded-full border-2 border-white/30 shadow-lg" />
          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary-foreground" />
            <span className="text-xs text-primary-foreground font-medium truncate max-w-[120px]">{location}</span>
          </div>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-5 relative z-10"
        >
          <h1 className="text-2xl font-bold text-primary-foreground font-display">ماذا تريد اليوم؟</h1>
          <p className="text-sm text-primary-foreground/70 mt-1">توصيل سريع لكل ما تحتاجه</p>
        </motion.div>

        {/* Search */}
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

      {/* Categories Grid */}
      <div className="px-5 -mt-8 relative z-10">
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
              <div className={`relative w-[72px] h-[72px] rounded-full bg-gradient-to-br ${cat.color} flex items-center justify-center shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-300`}>
                <div className="absolute inset-[3px] rounded-full bg-card flex items-center justify-center">
                  <cat.icon className="w-7 h-7 text-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-foreground leading-tight">{cat.label}</p>
                <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{cat.labelFr}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Promo Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="mx-5 mt-8 mb-6"
      >
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-accent to-primary p-[1px]">
          <div className="bg-card rounded-2xl px-5 py-4 flex items-center gap-4">
            <Sparkles className="w-8 h-8 text-primary flex-shrink-0" />
            <div className="text-right flex-1">
              <p className="text-sm font-bold text-foreground">التوصيل مجاني للطلب الأول!</p>
              <p className="text-xs text-muted-foreground mt-0.5">Livraison gratuite pour la première commande</p>
            </div>
            <div className="bg-primary/10 rounded-xl px-3 py-1.5">
              <span className="text-xs font-bold text-primary">FREE</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <div className="px-5 mb-8">
        <h2 className="text-sm font-bold text-foreground mb-3">طلبات سابقة</h2>
        <div className="bg-card rounded-2xl border border-border p-5 flex flex-col items-center gap-2">
          <Store className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">لا توجد طلبات سابقة</p>
          <p className="text-xs text-muted-foreground/60">ستظهر طلباتك هنا بعد أول توصيل</p>
        </div>
      </div>
    </div>
  );
};

export default DeliveryHome;
