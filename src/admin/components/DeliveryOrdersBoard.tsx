import { useEffect, useMemo, useState } from "react";
import { Clock, Eye, MapPin, Package, Phone, RefreshCw, Truck, User } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type OrderStatus = "pending" | "accepted" | "on_the_way" | "arrived" | "delivering" | "delivered" | "completed" | "canceled";

interface DeliveryOrder {
  id: string;
  status: OrderStatus;
  store_name: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  estimated_price: number | null;
  delivery_type: string;
  user_id: string;
  driver_id: string | null;
  created_at: string;
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending: { label: "بانتظار سائق", badge: "bg-warning/10 text-warning" },
  accepted: { label: "تم قبول الطلب", badge: "bg-info/10 text-info" },
  on_the_way: { label: "في الطريق", badge: "bg-info/10 text-info" },
  arrived: { label: "وصل السائق", badge: "bg-primary/10 text-primary" },
  delivering: { label: "بدأ التوصيل", badge: "bg-accent/10 text-accent" },
  delivered: { label: "تم التسليم", badge: "bg-success/10 text-success" },
  completed: { label: "مكتمل", badge: "bg-success/10 text-success" },
  canceled: { label: "ملغي", badge: "bg-destructive/10 text-destructive" },
};

const STATUS_FILTERS: Array<{ key: "all" | OrderStatus; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "بانتظار سائق" },
  { key: "accepted", label: "مقبول" },
  { key: "arrived", label: "وصل" },
  { key: "delivering", label: "قيد التوصيل" },
  { key: "delivered", label: "تم التسليم" },
  { key: "completed", label: "مكتمل" },
  { key: "canceled", label: "ملغي" },
];

const statusClass = (status: string) => STATUS_META[status]?.badge || "bg-secondary text-muted-foreground";

const DeliveryOrdersBoard = ({ title }: { title: string }) => {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | OrderStatus>("all");
  const [selected, setSelected] = useState<DeliveryOrder | null>(null);

  const fetchOrders = async () => {
    const { data } = await supabase
      .from("delivery_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setOrders((data || []) as DeliveryOrder[]);
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("delivery-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const text = `${order.store_name || ""} ${order.pickup_address || ""} ${order.delivery_address || ""} ${order.delivery_type}`.toLowerCase();
      const matchesSearch = !search.trim() || text.includes(search.toLowerCase());
      const matchesFilter = filter === "all" || order.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, orders, search]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    live: orders.filter((o) => ["accepted", "on_the_way", "arrived", "delivering"].includes(o.status)).length,
    done: orders.filter((o) => ["delivered", "completed"].includes(o.status)).length,
  }), [orders]);

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" }); }
    catch { return "—"; }
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="w-4 h-4 ml-1" />تحديث
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <Package className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "إجمالي الطلبات", value: stats.total, icon: Package, tone: "text-primary bg-primary/10" },
          { label: "بانتظار سائق", value: stats.pending, icon: Clock, tone: "text-warning bg-warning/10" },
          { label: "نشطة الآن", value: stats.live, icon: Truck, tone: "text-info bg-info/10" },
          { label: "منتهية", value: stats.done, icon: Eye, tone: "text-success bg-success/10" },
        ].map((card) => (
          <div key={card.label} className="gradient-card rounded-xl p-4 border border-border">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${card.tone}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم المطعم أو العنوان..."
            className="bg-secondary/60 border-border h-10 rounded-lg"
          />
        </div>
        {STATUS_FILTERS.map((item) => (
          <button
            key={item.key}
            onClick={() => setFilter(item.key)}
            className={`text-xs px-3 py-2 rounded-lg transition-colors ${filter === item.key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4">
        <div className="space-y-3">
          {filtered.length === 0 && (
            <div className="gradient-card rounded-xl p-10 border border-border text-center text-muted-foreground">
              لا توجد طلبات مطابقة
            </div>
          )}

          {filtered.map((order, index) => (
            <motion.button
              key={order.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => setSelected(order)}
              className={`w-full text-right gradient-card rounded-xl p-4 border transition-colors ${selected?.id === order.id ? "border-primary" : "border-border hover:border-primary/30"}`}
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className={`text-xs px-2.5 py-1 rounded-full ${statusClass(order.status)}`}>{STATUS_META[order.status]?.label || order.status}</span>
                <p className="font-bold text-foreground">{order.store_name || "طلب توصيل"}</p>
              </div>

              <div className="grid gap-2 text-xs mb-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground truncate">{order.pickup_address || "—"}</span>
                  <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />الاستلام</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground truncate">{order.delivery_address || "—"}</span>
                  <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />التسليم</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{formatTime(order.created_at)}</span>
                  <span>{order.delivery_type}</span>
                </div>
                <span className="text-primary font-bold">{order.estimated_price ? `${order.estimated_price} DH` : "—"}</span>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="gradient-card rounded-xl border border-border p-4 sticky top-20 h-fit">
          {!selected ? (
            <div className="text-center py-10 text-muted-foreground">اختر طلبًا لعرض التفاصيل</div>
          ) : (
            <div className="space-y-4 text-right">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full ${statusClass(selected.status)}`}>{STATUS_META[selected.status]?.label || selected.status}</span>
                <p className="font-bold text-foreground">#{selected.id.slice(0, 8)}</p>
              </div>

              <DetailRow icon={MapPin} label="عنوان الاستلام" value={selected.pickup_address || "—"} />
              <DetailRow icon={MapPin} label="عنوان التسليم" value={selected.delivery_address || "—"} />
              <DetailRow icon={Package} label="نوع الطلب" value={selected.delivery_type} />
              <DetailRow icon={Clock} label="وقت الطلب" value={new Date(selected.created_at).toLocaleString("ar-MA")} />

              <div className="rounded-xl bg-secondary/40 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-primary font-bold">{selected.estimated_price ? `${selected.estimated_price} DH` : "—"}</span>
                  <span className="text-muted-foreground">السعر</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) => (
  <div className="flex items-start justify-between gap-3 text-sm">
    <span className="text-foreground break-words">{value}</span>
    <span className="text-muted-foreground flex items-center gap-1 shrink-0"><Icon className="w-4 h-4" />{label}</span>
  </div>
);

export default DeliveryOrdersBoard;
