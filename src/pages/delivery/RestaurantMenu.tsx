import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Star, Clock, MapPin, Plus, Minus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

const RestaurantMenu = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addItem, items, totalItems, totalPrice, updateQuantity } = useCart();
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      const [storeRes, catRes, itemsRes] = await Promise.all([
        supabase.from("stores").select("*").eq("id", id).single(),
        supabase.from("menu_categories").select("*").eq("store_id", id).order("sort_order"),
        supabase.from("menu_items").select("*").eq("store_id", id).order("sort_order"),
      ]);
      setStore(storeRes.data);
      setCategories(catRes.data || []);
      setMenuItems(itemsRes.data || []);
      if (catRes.data?.length) setActiveCategory(catRes.data[0].id);
      setLoading(false);
    };
    fetchData();
  }, [id]);

  const getItemQuantity = (menuItemId: string) => {
    return items.find((i) => i.menuItemId === menuItemId)?.quantity || 0;
  };

  const handleAdd = (item: any) => {
    addItem({
      menuItemId: item.id,
      name: item.name_ar,
      price: item.price,
      storeId: store.id,
      storeName: store.name,
    });
    toast({ title: `تمت إضافة ${item.name_ar}`, description: `${item.price} DH` });
  };

  const filteredItems = menuItems.filter((i) => i.category_id === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen delivery-bg p-5 space-y-4" dir="rtl">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen delivery-bg flex items-center justify-center" dir="rtl">
        <p className="text-muted-foreground">المطعم غير موجود</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen delivery-bg pb-28" dir="rtl">
      {/* Store Header */}
      <div className="bg-gradient-to-br from-primary/70 via-accent/50 to-secondary pt-6 pb-6 px-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
            <ArrowRight className="w-5 h-5 text-primary-foreground" />
          </button>
          <button onClick={() => navigate("/delivery/cart")} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm relative">
            <ShoppingCart className="w-5 h-5 text-primary-foreground" />
            {totalItems > 0 && (
              <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 min-w-[18px] h-[18px]">
                {totalItems}
              </Badge>
            )}
          </button>
        </div>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-3xl mx-auto mb-2">🍽️</div>
          <h1 className="text-xl font-bold text-primary-foreground">{store.name}</h1>
          <p className="text-xs text-primary-foreground/70 mt-1">{store.description}</p>
          <div className="flex items-center justify-center gap-4 mt-3 text-xs text-primary-foreground/80">
            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />{store.rating}</span>
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{store.delivery_time_min}-{store.delivery_time_max} دقيقة</span>
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{store.address?.split("،")[0]}</span>
          </div>
          <p className="text-xs font-bold text-primary-foreground mt-2">توصيل: {store.delivery_fee} DH</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="px-5 mt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {cat.name_ar}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-5 mt-4 space-y-3">
        {filteredItems.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد منتجات في هذه الفئة</p>
        ) : (
          filteredItems.map((item, i) => {
            const qty = getItemQuantity(item.id);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm">{item.name_ar}</h3>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">{item.name_fr}</p>
                  {item.description_ar && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description_ar}</p>
                  )}
                  <p className="text-sm font-bold text-primary mt-2">{item.price} DH</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {qty > 0 ? (
                    <div className="flex items-center gap-2 bg-secondary rounded-xl px-2 py-1">
                      <button onClick={() => updateQuantity(item.id, qty - 1)} className="w-7 h-7 rounded-lg bg-card flex items-center justify-center">
                        <Minus className="w-3.5 h-3.5 text-foreground" />
                      </button>
                      <span className="text-sm font-bold text-foreground min-w-[20px] text-center">{qty}</span>
                      <button onClick={() => handleAdd(item)} className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                      </button>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => handleAdd(item)} className="rounded-xl gap-1">
                      <Plus className="w-4 h-4" />
                      أضف
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Cart Footer */}
      {totalItems > 0 && (
        <motion.div
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-4 z-50"
        >
          <Button
            onClick={() => navigate("/delivery/cart")}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base gap-2"
          >
            <ShoppingCart className="w-5 h-5" />
            عرض السلة ({totalItems})
            <span className="mr-auto font-bold">{totalPrice.toFixed(0)} DH</span>
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default RestaurantMenu;
