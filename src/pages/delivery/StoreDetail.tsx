import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Star, Clock, MapPin, Plus, Minus, ShoppingCart,
  Package, Store as StoreIcon, X, ChevronLeft, ChevronRight, ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/context";

interface ProductImage {
  id: string;
  image_url: string;
  sort_order: number;
}

const StoreDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { addItem, items, totalItems, totalPrice, updateQuantity } = useCart();
  const { dir } = useI18n();
  const [store, setStore] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [productImages, setProductImages] = useState<Record<string, ProductImage[]>>({});

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    const [storeRes, catRes, itemsRes] = await Promise.all([
      supabase.from("stores").select("*").eq("id", id).single(),
      supabase.from("menu_categories").select("*").eq("store_id", id).eq("is_active", true).order("sort_order"),
      supabase.from("menu_items").select("*").eq("store_id", id).eq("is_available", true).order("sort_order"),
    ]);
    setStore(storeRes.data);
    setCategories(catRes.data || []);
    setMenuItems(itemsRes.data || []);
    if (catRes.data?.length && !activeCategory) setActiveCategory(catRes.data[0].id);

    // Fetch product images for all items
    if (itemsRes.data?.length) {
      const itemIds = itemsRes.data.map((i: any) => i.id);
      const { data: imgData } = await supabase
        .from("product_images")
        .select("*")
        .in("menu_item_id", itemIds)
        .order("sort_order");
      
      const grouped: Record<string, ProductImage[]> = {};
      (imgData || []).forEach((img: any) => {
        if (!grouped[img.menu_item_id]) grouped[img.menu_item_id] = [];
        grouped[img.menu_item_id].push(img);
      });
      setProductImages(grouped);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const getItemQuantity = (menuItemId: string) => {
    return items.find((i) => i.menuItemId === menuItemId)?.quantity || 0;
  };

  const handleAdd = (item: any) => {
    addItem({
      menuItemId: item.id,
      name: dir === "rtl" ? item.name_ar : item.name_fr,
      price: item.price,
      storeId: store.id,
      storeName: store.name,
    });
    toast({ title: `تمت إضافة ${item.name_ar}`, description: `${item.price} DH` });
  };

  const openGallery = (images: string[], startIndex = 0) => {
    setGalleryImages(images);
    setGalleryIndex(startIndex);
    setGalleryOpen(true);
  };

  const filteredItems = menuItems.filter((i) => i.category_id === activeCategory);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-5 space-y-4" dir="rtl">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <StoreIcon className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">المحل غير موجود</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">رجوع</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28" dir="rtl">
      {/* Store Header */}
      <div className="relative rounded-b-3xl overflow-hidden">
        {store.image_url ? (
          <div className="h-52 relative cursor-pointer" onClick={() => openGallery([store.image_url])}>
            <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary/60 via-accent/40 to-secondary pt-6 pb-6 px-5">
            <div className="h-28" />
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 px-5 pt-6 z-10">
          <div className="flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-background/30 backdrop-blur-sm">
              <ArrowRight className="w-5 h-5 text-foreground" />
            </button>
            <button onClick={() => navigate("/delivery/cart")} className="p-2 rounded-xl bg-background/30 backdrop-blur-sm relative">
              <ShoppingCart className="w-5 h-5 text-foreground" />
              {totalItems > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0 min-w-[18px] h-[18px]">
                  {totalItems}
                </Badge>
              )}
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 -mt-10 relative z-10">
          <div className="flex items-end gap-3">
            <div className="w-18 h-18 rounded-2xl bg-card border-2 border-border flex items-center justify-center overflow-hidden flex-shrink-0 w-[72px] h-[72px]">
              {store.image_url ? (
                <img src={store.image_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <StoreIcon className="w-8 h-8 text-muted-foreground/30" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground truncate">{store.name}</h1>
                <Badge variant={store.is_open ? "default" : "secondary"} className="text-[10px] flex-shrink-0">
                  {store.is_open ? "مفتوح" : "مغلق"}
                </Badge>
              </div>
              {store.description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{store.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground flex-wrap">
            {store.rating && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />{store.rating}
              </span>
            )}
            {(store.delivery_time_min || store.delivery_time_max) && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />{store.delivery_time_min || 20}-{store.delivery_time_max || 40} دقيقة
              </span>
            )}
            {store.address && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />{store.address.split("،")[0]}
              </span>
            )}
          </div>
          {store.delivery_fee != null && (
            <p className="text-xs font-bold text-primary mt-2">توصيل: {store.delivery_fee} DH</p>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      {categories.length > 0 && (
        <div className="px-5 mt-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "glass-card text-muted-foreground"
                }`}
              >
                {dir === "rtl" ? cat.name_ar : cat.name_fr}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="px-5 mt-4 space-y-3">
        {filteredItems.length === 0 && categories.length > 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد منتجات في هذه الفئة</p>
        ) : menuItems.length === 0 && categories.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد منتجات بعد</p>
          </div>
        ) : (
          (categories.length > 0 ? filteredItems : menuItems).map((item, i) => {
            const qty = getItemQuantity(item.id);
            const extraImages = productImages[item.id] || [];
            const allImages = [
              ...(item.image_url ? [item.image_url] : []),
              ...extraImages.map((img) => img.image_url),
            ];

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Product image */}
                  <div
                    className="w-20 h-20 rounded-xl bg-secondary/40 overflow-hidden flex-shrink-0 cursor-pointer relative group"
                    onClick={() => allImages.length > 0 && openGallery(allImages)}
                  >
                    {item.image_url ? (
                      <>
                        <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                        {allImages.length > 1 && (
                          <div className="absolute bottom-1 right-1 bg-background/80 rounded-md px-1.5 py-0.5 text-[9px] font-bold text-foreground flex items-center gap-0.5">
                            <ImageIcon className="w-2.5 h-2.5" />{allImages.length}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-6 h-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground text-sm">{dir === "rtl" ? item.name_ar : item.name_fr}</h3>
                    {item.name_fr && dir === "rtl" && (
                      <p className="text-[11px] text-muted-foreground/60 mt-0.5">{item.name_fr}</p>
                    )}
                    {item.description_ar && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {dir === "rtl" ? item.description_ar : item.description_fr}
                      </p>
                    )}
                    <p className="text-sm font-bold text-primary mt-2">{item.price} DH</p>
                  </div>

                  {/* Add/Quantity controls */}
                  <div className="flex items-center gap-1 flex-shrink-0 pt-2">
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

      {/* Image Gallery Modal */}
      {galleryOpen && (
        <div className="fixed inset-0 z-[100] bg-background/95 flex items-center justify-center" onClick={() => setGalleryOpen(false)}>
          <button className="absolute top-5 right-5 p-2 rounded-full bg-secondary z-10" onClick={() => setGalleryOpen(false)}>
            <X className="w-5 h-5 text-foreground" />
          </button>

          <div className="relative w-full max-w-lg px-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={galleryImages[galleryIndex]}
              alt=""
              className="w-full max-h-[70vh] object-contain rounded-2xl"
            />

            {galleryImages.length > 1 && (
              <>
                <button
                  onClick={() => setGalleryIndex((prev) => (prev > 0 ? prev - 1 : galleryImages.length - 1))}
                  className="absolute left-6 top-1/2 -translate-y-1/2 p-2 rounded-full glass-card"
                >
                  <ChevronLeft className="w-5 h-5 text-foreground" />
                </button>
                <button
                  onClick={() => setGalleryIndex((prev) => (prev < galleryImages.length - 1 ? prev + 1 : 0))}
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-2 rounded-full glass-card"
                >
                  <ChevronRight className="w-5 h-5 text-foreground" />
                </button>
                <div className="flex justify-center gap-1.5 mt-4">
                  {galleryImages.map((_, idx) => (
                    <div
                      key={idx}
                      className={`w-2 h-2 rounded-full transition-all ${idx === galleryIndex ? "bg-primary w-4" : "bg-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreDetail;
