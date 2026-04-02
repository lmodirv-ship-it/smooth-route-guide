import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, Eye, MapPin, Package, Phone, RefreshCw, Send, Store, Truck, User, XCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGeo } from "@/admin/contexts/AdminGeoContext";
import { toast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type OrderStatus = string;

interface DeliveryOrder {
  id: string;
  status: OrderStatus;
  store_name: string | null;
  store_id: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  estimated_price: number | null;
  subtotal: number | null;
  delivery_fee: number | null;
  total_price: number | null;
  delivery_type: string;
  user_id: string;
  driver_id: string | null;
  created_at: string;
  city: string | null;
  notes: string | null;
  items: any;
  cancel_reason: string | null;
}

const STATUS_META: Record<string, { label: string; badge: string }> = {
  pending_call_center: { label: "بانتظار مركز الاتصال", badge: "bg-warning/10 text-warning" },
  pending: { label: "بانتظار سائق", badge: "bg-warning/10 text-warning" },
  confirmed: { label: "تم التأكيد", badge: "bg-info/10 text-info" },
  ready_for_driver: { label: "جاهز للسائق", badge: "bg-primary/10 text-primary" },
  driver_assigned: { label: "تم تعيين سائق", badge: "bg-info/10 text-info" },
  on_the_way_to_vendor: { label: "في الطريق للمطعم", badge: "bg-info/10 text-info" },
  picked_up: { label: "تم الاستلام", badge: "bg-accent/10 text-accent-foreground" },
  on_the_way_to_customer: { label: "في الطريق للزبون", badge: "bg-primary/10 text-primary" },
  delivered: { label: "تم التسليم", badge: "bg-success/10 text-success" },
  completed: { label: "مكتمل", badge: "bg-success/10 text-success" },
  cancelled: { label: "ملغي", badge: "bg-destructive/10 text-destructive" },
  canceled: { label: "ملغي", badge: "bg-destructive/10 text-destructive" },
};

const STATUS_FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "pending", label: "بانتظار سائق" },
  { key: "confirmed", label: "مؤكد" },
  { key: "ready_for_driver", label: "جاهز للسائق" },
  { key: "driver_assigned", label: "تم التعيين" },
  { key: "on_the_way_to_vendor", label: "للمطعم" },
  { key: "picked_up", label: "تم الاستلام" },
  { key: "on_the_way_to_customer", label: "للزبون" },
  { key: "delivered", label: "تم التسليم" },
  { key: "cancelled", label: "ملغي" },
];

const statusClass = (status: string) => STATUS_META[status]?.badge || "bg-secondary text-muted-foreground";

const DeliveryOrdersBoard = ({ title }: { title: string }) => {
  const geoCtx = useAdminGeo();
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [profiles, setProfiles] = useState<Record<string, any>>({});
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selected, setSelected] = useState<DeliveryOrder | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const fetchOrders = async () => {
    let q = supabase
      .from("delivery_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (geoCtx?.selectedCountry && geoCtx.selectedCountry !== "all") q = q.eq("country", geoCtx.selectedCountry);
    if (geoCtx?.selectedCity && geoCtx.selectedCity !== "all") q = q.eq("city", geoCtx.selectedCity);
    const { data } = await q;
    const ordersList = (data || []) as DeliveryOrder[];
    setOrders(ordersList);

    // Fetch customer profiles
    const userIds = [...new Set(ordersList.map((o) => o.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, name, phone, email").in("id", userIds);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p; });
      setProfiles(map);
    }
  };

  useEffect(() => {
    fetchOrders();
    const channel = supabase
      .channel("delivery-board")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [geoCtx?.selectedCountry, geoCtx?.selectedCity]);

  // Keep selected order synced
  useEffect(() => {
    if (selected) {
      const updated = orders.find((o) => o.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [orders]);

  const updateOrderStatus = async (orderId: string, status: string, extra?: Record<string, any>) => {
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString(), ...extra };
    const { error } = await supabase.from("delivery_orders").update(updates).eq("id", orderId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم تحديث الطلب ✅" });
      fetchOrders();
    }
  };

  const handleConfirm = (orderId: string) => updateOrderStatus(orderId, "confirmed");
  const handleSendToDriver = (orderId: string) => updateOrderStatus(orderId, "ready_for_driver");
  const handleCancel = () => {
    if (!selected) return;
    updateOrderStatus(selected.id, "cancelled", { cancel_reason: cancelReason || "ملغي من مركز الاتصال" });
    setCancelDialogOpen(false);
    setCancelReason("");
  };

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      const text = `${order.store_name || ""} ${order.pickup_address || ""} ${order.delivery_address || ""} ${order.city || ""} ${profiles[order.user_id]?.name || ""}`.toLowerCase();
      const matchesSearch = !search.trim() || text.includes(search.toLowerCase());
      const matchesFilter = filter === "all" || order.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [filter, orders, search, profiles]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending" || o.status === "pending_call_center").length,
    live: orders.filter((o) => ["confirmed", "ready_for_driver", "driver_assigned", "on_the_way_to_vendor", "picked_up", "on_the_way_to_customer"].includes(o.status)).length,
    done: orders.filter((o) => ["delivered", "completed"].includes(o.status)).length,
  }), [orders]);

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" }); }
    catch { return "—"; }
  };

  const renderItems = (items: any) => {
    if (!items || !Array.isArray(items)) return null;
    return (
      <div className="space-y-1">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-primary font-bold">{(item.price * (item.qty || item.quantity || 1)).toFixed(0)} DH</span>
            <span className="text-foreground">{item.name} × {item.qty || item.quantity || 1}</span>
          </div>
        ))}
      </div>
    );
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
          { label: "بانتظار التأكيد", value: stats.pending, icon: Clock, tone: "text-warning bg-warning/10" },
          { label: "نشطة الآن", value: stats.live, icon: Truck, tone: "text-info bg-info/10" },
          { label: "منتهية", value: stats.done, icon: Eye, tone: "text-success bg-success/10" },
        ].map((card) => (
          <div key={card.label} className="glass-card rounded-xl p-4">
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
            placeholder="ابحث باسم المطعم أو العنوان أو الزبون..."
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
            <div className="glass-card rounded-xl p-10 text-center text-muted-foreground">
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
                  <span className="text-foreground truncate">{profiles[order.user_id]?.name || "—"}</span>
                  <span className="text-muted-foreground flex items-center gap-1"><User className="w-3 h-3" />الزبون</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-foreground truncate">{order.delivery_address || "—"}</span>
                  <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />التسليم</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>{formatTime(order.created_at)}</span>
                  <span>{order.city || "—"}</span>
                </div>
                <span className="text-primary font-bold">{order.total_price || order.estimated_price ? `${order.total_price || order.estimated_price} DH` : "—"}</span>
              </div>
            </motion.button>
          ))}
        </div>

        <div className="glass-card rounded-xl p-4 sticky top-20 h-fit">
          {!selected ? (
            <div className="text-center py-10 text-muted-foreground">اختر طلبًا لعرض التفاصيل</div>
          ) : (
            <div className="space-y-4 text-right">
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2.5 py-1 rounded-full ${statusClass(selected.status)}`}>{STATUS_META[selected.status]?.label || selected.status}</span>
                <p className="font-bold text-foreground">#{selected.id.slice(0, 8)}</p>
              </div>

              {/* Customer info */}
              <div className="rounded-xl bg-secondary/40 p-3 space-y-2">
                <DetailRow icon={User} label="الزبون" value={profiles[selected.user_id]?.name || "—"} />
                <DetailRow icon={Phone} label="الهاتف" value={profiles[selected.user_id]?.phone || "—"} />
              </div>

              <DetailRow icon={Store} label="المطعم" value={selected.store_name || "—"} />
              <DetailRow icon={MapPin} label="المدينة" value={selected.city || "—"} />
              <DetailRow icon={MapPin} label="عنوان التسليم" value={selected.delivery_address || "—"} />
              <DetailRow icon={Clock} label="وقت الطلب" value={new Date(selected.created_at).toLocaleString("ar-MA")} />

              {/* Items */}
              {selected.items && Array.isArray(selected.items) && selected.items.length > 0 && (
                <div className="rounded-xl bg-secondary/40 p-3">
                  <p className="text-xs text-muted-foreground mb-2 font-bold">المنتجات المطلوبة:</p>
                  {renderItems(selected.items)}
                </div>
              )}

              {selected.notes && (
                <div className="rounded-xl bg-warning/5 border border-warning/20 p-3">
                  <p className="text-xs text-muted-foreground mb-1">ملاحظات:</p>
                  <p className="text-xs text-foreground">{selected.notes}</p>
                </div>
              )}

              {/* Price breakdown */}
              <div className="rounded-xl bg-secondary/40 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{selected.subtotal || "—"} DH</span>
                  <span className="text-muted-foreground">المنتجات</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{selected.delivery_fee || "—"} DH</span>
                  <span className="text-muted-foreground">التوصيل</span>
                </div>
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-primary">{selected.total_price || selected.estimated_price || "—"} DH</span>
                  <span className="text-foreground">المجموع</span>
                </div>
              </div>

              {selected.cancel_reason && (
                <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-3">
                  <p className="text-xs text-destructive font-bold">سبب الإلغاء: {selected.cancel_reason}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                {selected.status === "pending_call_center" && (
                  <>
                    <Button onClick={() => handleConfirm(selected.id)} className="w-full gradient-primary text-primary-foreground rounded-xl gap-2">
                      <CheckCircle className="w-4 h-4" />تأكيد الطلب
                    </Button>
                    <Button onClick={() => setCancelDialogOpen(true)} variant="outline" className="w-full border-destructive text-destructive rounded-xl gap-2">
                      <XCircle className="w-4 h-4" />إلغاء الطلب
                    </Button>
                  </>
                )}
                {selected.status === "confirmed" && (
                  <>
                    <Button onClick={() => handleSendToDriver(selected.id)} className="w-full bg-info text-info-foreground rounded-xl gap-2">
                      <Send className="w-4 h-4" />إرسال للسائق
                    </Button>
                    <Button onClick={() => setCancelDialogOpen(true)} variant="outline" className="w-full border-destructive text-destructive rounded-xl gap-2">
                      <XCircle className="w-4 h-4" />إلغاء الطلب
                    </Button>
                  </>
                )}
                {["ready_for_driver", "driver_assigned", "on_the_way_to_vendor", "picked_up", "on_the_way_to_customer"].includes(selected.status) && (
                  <Button onClick={() => setCancelDialogOpen(true)} variant="outline" className="w-full border-destructive text-destructive rounded-xl gap-2">
                    <XCircle className="w-4 h-4" />إلغاء الطلب
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>إلغاء الطلب</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من إلغاء هذا الطلب؟ يرجى ذكر سبب الإلغاء.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="سبب الإلغاء..."
            className="text-right"
          />
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel>تراجع</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground">
              تأكيد الإلغاء
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
