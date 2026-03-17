import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  UtensilsCrossed, Phone, MapPin, Clock, Star, Search,
  CheckCircle, XCircle, Eye, PhoneCall, Store
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

interface StoreRow {
  id: string;
  name: string;
  category: string;
  phone: string | null;
  address: string | null;
  is_open: boolean;
  rating: number | null;
  delivery_fee: number | null;
  delivery_time_min: number | null;
  delivery_time_max: number | null;
  min_order: number | null;
  image_url: string | null;
  description: string | null;
}

const RestaurantsCC = () => {
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "open" | "closed">("all");
  const [selectedStore, setSelectedStore] = useState<StoreRow | null>(null);
  const [orderCounts, setOrderCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchStores();
    fetchOrderCounts();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    const { data } = await supabase.from("stores").select("*").order("name");
    if (data) setStores(data as StoreRow[]);
    setLoading(false);
  };

  const fetchOrderCounts = async () => {
    const { data } = await supabase
      .from("delivery_orders")
      .select("store_name, id")
      .in("status", ["pending", "confirmed", "driver_assigned", "picked_up", "in_transit"]);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((o) => {
        const key = o.store_name || "";
        counts[key] = (counts[key] || 0) + 1;
      });
      setOrderCounts(counts);
    }
  };

  const filtered = stores.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.address || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.phone || "").includes(search);
    const matchStatus =
      filterStatus === "all" || (filterStatus === "open" ? s.is_open : !s.is_open);
    return matchSearch && matchStatus;
  });

  const stats = {
    total: stores.length,
    open: stores.filter((s) => s.is_open).length,
    closed: stores.filter((s) => !s.is_open).length,
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-7 h-7 text-primary" />
            المطاعم
          </h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة المطاعم وبيانات الاتصال</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "إجمالي المطاعم", value: stats.total, icon: Store, color: "text-info" },
          { label: "مفتوح الآن", value: stats.open, icon: CheckCircle, color: "text-emerald-400" },
          { label: "مغلق", value: stats.closed, icon: XCircle, color: "text-destructive" },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-strong rounded-xl p-4 border border-border"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-secondary/60 ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو العنوان أو الهاتف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-secondary/60 border-border pr-9 text-sm"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "open", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === f
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "الكل" : f === "open" ? "مفتوح" : "مغلق"}
            </button>
          ))}
        </div>
      </div>

      {/* Stores Grid */}
      {loading ? (
        <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">لا توجد مطاعم</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((store, i) => (
            <motion.div
              key={store.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="glass-strong rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-colors group"
            >
              {/* Image or placeholder */}
              <div className="h-28 bg-secondary/40 relative overflow-hidden">
                {store.image_url ? (
                  <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UtensilsCrossed className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                )}
                {/* Status badge */}
                <div className="absolute top-2 left-2">
                  <Badge
                    className={`text-[10px] ${
                      store.is_open
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : "bg-destructive/20 text-destructive border-destructive/30"
                    }`}
                  >
                    {store.is_open ? "مفتوح" : "مغلق"}
                  </Badge>
                </div>
                {/* Active orders badge */}
                {(orderCounts[store.name] || 0) > 0 && (
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                      {orderCounts[store.name]} طلب نشط
                    </Badge>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                {/* Name & rating */}
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{store.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{store.category}</p>
                  </div>
                  {store.rating && (
                    <div className="flex items-center gap-1 text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span className="text-xs font-bold">{store.rating}</span>
                    </div>
                  )}
                </div>

                {/* Info row */}
                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                  {store.delivery_time_min && store.delivery_time_max && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {store.delivery_time_min}-{store.delivery_time_max} د
                    </span>
                  )}
                  {store.delivery_fee != null && (
                    <span className="flex items-center gap-1">
                      توصيل: {store.delivery_fee} د.م
                    </span>
                  )}
                  {store.min_order != null && store.min_order > 0 && (
                    <span>حد أدنى: {store.min_order} د.م</span>
                  )}
                </div>

                {/* Address */}
                {store.address && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {store.address}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  {store.phone && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                      onClick={() => window.open(`tel:${store.phone}`)}
                    >
                      <PhoneCall className="w-3 h-3" />
                      اتصال
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-[11px] gap-1 border-info/30 text-info hover:bg-info/10"
                    onClick={() => setSelectedStore(store)}
                  >
                    <Eye className="w-3 h-3" />
                    تفاصيل
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedStore} onOpenChange={() => setSelectedStore(null)}>
        <DialogContent className="glass-strong border-border max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <UtensilsCrossed className="w-5 h-5 text-primary" />
              {selectedStore?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedStore && (
            <div className="space-y-4">
              {selectedStore.image_url && (
                <img
                  src={selectedStore.image_url}
                  alt={selectedStore.name}
                  className="w-full h-40 object-cover rounded-lg"
                />
              )}

              <div className="flex items-center gap-2">
                <Badge
                  className={
                    selectedStore.is_open
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      : "bg-destructive/20 text-destructive border-destructive/30"
                  }
                >
                  {selectedStore.is_open ? "مفتوح" : "مغلق"}
                </Badge>
                <Badge className="bg-secondary text-muted-foreground">{selectedStore.category}</Badge>
                {selectedStore.rating && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 gap-1">
                    <Star className="w-3 h-3 fill-amber-400" />
                    {selectedStore.rating}
                  </Badge>
                )}
              </div>

              {selectedStore.description && (
                <p className="text-sm text-muted-foreground">{selectedStore.description}</p>
              )}

              <div className="space-y-2 text-sm">
                {selectedStore.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4 text-info" />
                    <span>{selectedStore.phone}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] text-emerald-400"
                      onClick={() => window.open(`tel:${selectedStore.phone}`)}
                    >
                      اتصال
                    </Button>
                  </div>
                )}
                {selectedStore.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>{selectedStore.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>
                    وقت التحضير: {selectedStore.delivery_time_min || "?"}-{selectedStore.delivery_time_max || "?"} دقيقة
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="glass-strong rounded-lg p-3 border border-border text-center">
                  <p className="text-lg font-bold text-foreground">{selectedStore.delivery_fee || 0} د.م</p>
                  <p className="text-[10px] text-muted-foreground">رسوم التوصيل</p>
                </div>
                <div className="glass-strong rounded-lg p-3 border border-border text-center">
                  <p className="text-lg font-bold text-foreground">{selectedStore.min_order || 0} د.م</p>
                  <p className="text-[10px] text-muted-foreground">الحد الأدنى</p>
                </div>
              </div>

              <div className="glass-strong rounded-lg p-3 border border-border text-center">
                <p className="text-lg font-bold text-primary">{orderCounts[selectedStore.name] || 0}</p>
                <p className="text-[10px] text-muted-foreground">طلبات نشطة حالياً</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantsCC;
