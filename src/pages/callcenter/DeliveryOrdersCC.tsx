import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Clock, CheckCircle, XCircle, Phone, MapPin, Search, User,
  ChefHat, UtensilsCrossed, Bike, UserPlus, Eye, MessageCircle,
  ArrowRight, PhoneCall, Star, Navigation, X, Loader2, Edit, Truck, Car
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/firestoreClient";
import { toast } from "@/hooks/use-toast";

const statusFlow = [
  { key: "pending", label: "جديد 🔔", labelShort: "جديد", icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30" },
  { key: "confirmed", label: "مؤكد من المطعم ✅", labelShort: "مؤكد", icon: CheckCircle, color: "text-info", bg: "bg-info/10", border: "border-info/30" },
  { key: "driver_assigned", label: "سائق معيّن 🚗", labelShort: "سائق معيّن", icon: Car, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/30" },
  { key: "picked_up", label: "تم الاستلام 📦", labelShort: "تم الاستلام", icon: Package, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
  { key: "in_transit", label: "في الطريق 🏍️", labelShort: "في الطريق", icon: Bike, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  { key: "delivered", label: "تم التسليم ✅", labelShort: "مكتمل", icon: MapPin, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30" },
  { key: "cancelled", label: "ملغي ❌", labelShort: "ملغي", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30" },
];


// Car is already imported above

const DeliveryOrdersCC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [loading, setLoading] = useState(true);
  const [editNotes, setEditNotes] = useState("");

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase
      .from("delivery_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (data) {
      const uids = [...new Set(data.map(o => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name, phone, email").in("id", uids);
      const pMap = new Map(profiles?.map(p => [p.id, p]) || []);

      // Get driver profiles for assigned orders
      const driverIds = [...new Set(data.filter(o => o.driver_id).map(o => o.driver_id))];
      let driverMap = new Map();
      if (driverIds.length > 0) {
        const { data: driverRows } = await supabase.from("drivers").select("id, user_id, current_lat, current_lng").in("id", driverIds);
        if (driverRows) {
          const dUserIds = driverRows.map(d => d.user_id);
          const { data: dProfiles } = await supabase.from("profiles").select("id, name, phone").in("id", dUserIds);
          const dpMap = new Map(dProfiles?.map(p => [p.id, p]) || []);
          driverRows.forEach(d => {
            driverMap.set(d.id, { ...d, name: dpMap.get(d.user_id)?.name || "سائق", phone: dpMap.get(d.user_id)?.phone || "" });
          });
        }
      }

      setOrders(data.map(o => ({
        ...o,
        userName: pMap.get(o.user_id)?.name || "—",
        userPhone: pMap.get(o.user_id)?.phone || "—",
        userEmail: pMap.get(o.user_id)?.email || "",
        driverName: o.driver_id ? driverMap.get(o.driver_id)?.name : null,
        driverPhone: o.driver_id ? driverMap.get(o.driver_id)?.phone : null,
      })));
    }
    setLoading(false);
  }, []);

  const fetchDrivers = useCallback(async () => {
    const { data: driversList } = await supabase.from("drivers").select("id, user_id, status, current_lat, current_lng").eq("status", "active");
    if (driversList) {
      const dUserIds = driversList.map(d => d.user_id);
      const { data: dProfiles } = await supabase.from("profiles").select("id, name, phone").in("id", dUserIds);
      const pMap = new Map(dProfiles?.map(p => [p.id, p]) || []);
      setDrivers(driversList.map(d => ({
        ...d,
        name: pMap.get(d.user_id)?.name || "سائق",
        phone: pMap.get(d.user_id)?.phone || "",
      })));
    }
  }, []);

  const fetchStores = useCallback(async () => {
    const { data } = await supabase.from("stores").select("id, name, phone, address").eq("is_open", true);
    setStores(data || []);
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    fetchStores();
    const ch = supabase.channel("cc-delivery-orders-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchOrders)
      .on("postgres_changes", { event: "*", schema: "public", table: "drivers" }, fetchDrivers)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchOrders, fetchDrivers, fetchStores]);

  const updateOrderStatus = async (id: string, status: string) => {
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (status === "confirmed") updates.accepted_at = new Date().toISOString();
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();

    const { error } = await supabase.from("delivery_orders").update(updates).eq("id", id);
    if (error) {
      toast({ title: "خطأ في تحديث الحالة", description: error.message, variant: "destructive" });
      return;
    }

    // Log status change
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("call_logs").insert({
        caller_name: "نظام",
        caller_phone: "",
        reason: `تحديث طلب #${id.slice(0, 6)} → ${status}`,
        call_type: "system",
        status: "completed",
        user_id: user.id,
      });
    }

    const st = statusFlow.find(s => s.key === status);
    toast({ title: `${st?.label || status}` });

    if (selectedOrder?.id === id) {
      setSelectedOrder((prev: any) => prev ? { ...prev, status } : null);
    }
  };

  const assignDriver = async () => {
    if (!assignDialog || !selectedDriver) return;
    const { error } = await supabase.from("delivery_orders")
      .update({ driver_id: selectedDriver, status: "driver_assigned", updated_at: new Date().toISOString() })
      .eq("id", assignDialog);
    if (error) {
      toast({ title: "خطأ", variant: "destructive" });
      return;
    }
    toast({ title: "تم تعيين السائق وإرسال الطلب ✅" });
    setAssignDialog(null);
    setSelectedDriver("");
  };

  const cancelOrder = async (id: string) => {
    await updateOrderStatus(id, "cancelled");
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search ||
      o.userName?.includes(search) ||
      o.store_name?.includes(search) ||
      o.delivery_address?.includes(search) ||
      o.id?.includes(search) ||
      o.userPhone?.includes(search);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts: Record<string, number> = {};
  statusFlow.forEach(s => { counts[s.key] = orders.filter(o => o.status === s.key).length; });

  const getStorePhone = (storeName: string) => {
    const store = stores.find(s => s.name === storeName);
    return store?.phone || "";
  };

  if (loading) return (
    <div className="flex justify-center items-center py-32">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {statusFlow.slice(0, 5).map(s => counts[s.key] > 0 && (
            <Badge key={s.key} variant="outline" className={`${s.color} ${s.border} text-[10px] cursor-pointer`}
              onClick={() => setFilterStatus(s.key)}>
              {counts[s.key]} {s.labelShort}
            </Badge>
          ))}
        </div>
        <div className="text-right">
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2 justify-end">
            <Package className="w-5 h-5 text-primary" />
            إدارة طلبات التوصيل
          </h1>
          <p className="text-[10px] text-muted-foreground">الزبون ← التطبيق ← مركز الاتصال ← المطعم ← السائق ← الزبون</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم، الهاتف، المطعم..."
            className="bg-card border-border h-9 rounded-lg pr-9 text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 h-9 text-xs bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل ({orders.length})</SelectItem>
            {statusFlow.map(s => (
              <SelectItem key={s.key} value={s.key}>{s.labelShort} ({counts[s.key] || 0})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Orders List */}
        <div className="xl:col-span-2 space-y-3">
          {filtered.length === 0 && (
            <div className="glass rounded-xl p-12 text-center border border-border">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">لا توجد طلبات</p>
            </div>
          )}
          {filtered.map((o, i) => {
            const st = statusFlow.find(s => s.key === o.status) || statusFlow[0];
            const isSelected = selectedOrder?.id === o.id;

            return (
              <motion.div
                key={o.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => setSelectedOrder(o)}
                className={`glass rounded-xl p-4 border cursor-pointer transition-all hover:scale-[1.005] ${
                  isSelected ? "border-primary glow-ring-orange" : "border-border hover:border-primary/30"
                }`}
              >
                {/* Row 1: Status + Customer */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${st.bg} ${st.color}`}>
                      {st.labelShort}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">#{o.id?.slice(0, 8)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(o.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-foreground">{o.userName}</p>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                      <Phone className="w-3 h-3" />{o.userPhone}
                    </p>
                  </div>
                </div>

                {/* Row 2: Store → Address */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <span className="flex items-center gap-1 text-foreground">
                    <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
                    {o.store_name || "—"}
                  </span>
                  <ArrowRight className="w-3 h-3 text-primary" />
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {o.delivery_address || "—"}
                  </span>
                </div>

                {/* Row 3: Items */}
                {o.items && Array.isArray(o.items) && o.items.length > 0 && (
                  <div className="text-[11px] text-muted-foreground mb-2 bg-secondary/20 rounded-lg p-2">
                    {(o.items as any[]).slice(0, 4).map((item: any, idx: number) => (
                      <span key={idx}>{item.name || item.menuItemId} ×{item.qty || item.quantity}{idx < Math.min(o.items.length, 4) - 1 ? "، " : ""}</span>
                    ))}
                    {o.items.length > 4 && <span className="text-primary">... +{o.items.length - 4}</span>}
                  </div>
                )}

                {/* Row 4: Driver + Price */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-primary">{o.estimated_price || 0} DH</span>
                  <div className="flex items-center gap-2">
                    {o.driverName ? (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Bike className="w-3 h-3 text-info" />{o.driverName}
                      </span>
                    ) : o.status !== "pending" && o.status !== "cancelled" && o.status !== "delivered" ? (
                      <span className="text-[10px] text-amber-400">⚠️ بدون سائق</span>
                    ) : null}
                  </div>
                </div>

                {/* Row 5: Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Confirm Restaurant */}
                  {o.status === "pending" && (
                    <>
                      {getStorePhone(o.store_name) && (
                        <a href={`tel:${getStorePhone(o.store_name)}`}>
                          <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg gap-1 border-info/30 text-info">
                            <PhoneCall className="w-3 h-3" />اتصال بالمطعم
                          </Button>
                        </a>
                      )}
                      <Button size="sm" className="h-7 text-[10px] rounded-lg gap-1" onClick={(e) => { e.stopPropagation(); updateOrderStatus(o.id, "confirmed"); }}>
                        <CheckCircle className="w-3 h-3" />تأكيد المطعم
                      </Button>
                    </>
                  )}

                  {/* Assign Driver */}
                  {(o.status === "confirmed" || (o.status !== "pending" && o.status !== "cancelled" && o.status !== "delivered" && !o.driver_id)) && (
                    <Button size="sm" variant="outline" className="h-7 text-[10px] rounded-lg gap-1 border-cyan-400/30 text-cyan-400"
                      onClick={(e) => { e.stopPropagation(); setAssignDialog(o.id); }}>
                      <UserPlus className="w-3 h-3" />تعيين سائق
                    </Button>
                  )}

                  {/* Mark Ready */}
                  {o.status === "confirmed" && o.driver_id && (
                    <Button size="sm" className="h-7 text-[10px] rounded-lg gap-1"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(o.id, "driver_assigned"); }}>
                      <Truck className="w-3 h-3" />إرسال للسائق
                    </Button>
                  )}

                  {/* Driver picked up */}
                  {o.status === "driver_assigned" && (
                    <Button size="sm" className="h-7 text-[10px] rounded-lg gap-1"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(o.id, "picked_up"); }}>
                      <Package className="w-3 h-3" />تم الاستلام
                    </Button>
                  )}

                  {/* In transit */}
                  {o.status === "picked_up" && (
                    <Button size="sm" className="h-7 text-[10px] rounded-lg gap-1"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(o.id, "in_transit"); }}>
                      <Bike className="w-3 h-3" />في الطريق
                    </Button>
                  )}

                  {/* Delivered */}
                  {o.status === "in_transit" && (
                    <Button size="sm" className="h-7 text-[10px] rounded-lg gap-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={(e) => { e.stopPropagation(); updateOrderStatus(o.id, "delivered"); }}>
                      <CheckCircle className="w-3 h-3" />تم التسليم
                    </Button>
                  )}

                  {/* Contact Driver */}
                  {o.driverPhone && (
                    <a href={`tel:${o.driverPhone}`} onClick={e => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" className="h-7 text-[10px] text-info rounded-lg gap-1">
                        <Phone className="w-3 h-3" />السائق
                      </Button>
                    </a>
                  )}

                  {/* Cancel */}
                  {o.status !== "cancelled" && o.status !== "delivered" && (
                    <Button size="sm" variant="ghost" className="h-7 text-[10px] text-destructive hover:bg-destructive/10 rounded-lg"
                      onClick={(e) => { e.stopPropagation(); cancelOrder(o.id); }}>
                      <XCircle className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Order Detail Panel */}
        <div className="space-y-4">
          {selectedOrder ? (
            <OrderDetailPanel
              order={selectedOrder}
              onClose={() => setSelectedOrder(null)}
              onUpdateStatus={updateOrderStatus}
              onAssignDriver={(id: string) => setAssignDialog(id)}
              stores={stores}
            />
          ) : (
            <div className="glass rounded-xl p-12 border border-border text-center sticky top-20">
              <Eye className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">اختر طلباً لعرض التفاصيل</p>
            </div>
          )}
        </div>
      </div>

      {/* Assign Driver Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 justify-end">
              <span>تعيين سائق للطلب</span>
              <UserPlus className="w-5 h-5 text-primary" />
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {drivers.length === 0 ? (
              <div className="text-center py-8">
                <Car className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">لا يوجد سائقين متاحين حالياً</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">{drivers.length} سائق متاح</p>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {drivers.map(d => (
                    <button key={d.id} onClick={() => setSelectedDriver(d.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${
                        selectedDriver === d.id ? "border-primary bg-primary/5 glow-ring-orange" : "border-border hover:bg-secondary/50"
                      }`}>
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bike className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-foreground">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.phone}</p>
                        {d.current_lat && (
                          <p className="text-[10px] text-info flex items-center gap-1 mt-0.5">
                            <Navigation className="w-2.5 h-2.5" />
                            موقع GPS متاح
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-[10px] text-success">متاح</span>
                      </div>
                    </button>
                  ))}
                </div>
                <Button onClick={assignDriver} disabled={!selectedDriver} className="w-full h-10 rounded-xl gap-2">
                  <UserPlus className="w-4 h-4" />
                  تعيين وإرسال الطلب
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Order Detail Side Panel
const OrderDetailPanel = ({
  order, onClose, onUpdateStatus, onAssignDriver, stores
}: {
  order: any; onClose: () => void; onUpdateStatus: (id: string, status: string) => void;
  onAssignDriver: (id: string) => void; stores: any[];
}) => {
  const st = statusFlow.find(s => s.key === order.status) || statusFlow[0];
  const storePhone = stores.find(s => s.name === order.store_name)?.phone || "";

  // Status timeline
  const timelineSteps = statusFlow.filter(s => s.key !== "cancelled");
  const currentIdx = timelineSteps.findIndex(s => s.key === order.status);

  return (
    <div className="glass rounded-xl border border-border p-4 space-y-4 sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onClose} className="p-1 hover:bg-secondary rounded-lg">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="text-right">
          <h3 className="font-bold text-foreground text-sm">طلب #{order.id?.slice(0, 8)}</h3>
          <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${st.bg} ${st.color}`}>
            {st.label}
          </span>
        </div>
      </div>

      {/* Timeline */}
      {order.status !== "cancelled" && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-foreground">مراحل الطلب</h4>
          <div className="flex items-center gap-1">
            {timelineSteps.map((step, i) => {
              const isActive = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div key={step.key} className="flex items-center gap-1 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCurrent ? `${step.bg} ${step.color} ring-2 ring-offset-1 ring-offset-background` :
                    isActive ? "bg-emerald-400/20 text-emerald-400" : "bg-secondary text-muted-foreground"
                  }`}>
                    <step.icon className="w-3 h-3" />
                  </div>
                  {i < timelineSteps.length - 1 && (
                    <div className={`flex-1 h-0.5 ${isActive ? "bg-emerald-400/40" : "bg-secondary"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[8px] text-muted-foreground">
            {timelineSteps.map(s => (
              <span key={s.key} className="text-center flex-1">{s.labelShort}</span>
            ))}
          </div>
        </div>
      )}

      {/* Customer Info */}
      <div className="bg-secondary/20 rounded-xl p-3 space-y-2">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-primary" />
          بيانات الزبون
        </h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-foreground">{order.userName}</span>
            <span className="text-muted-foreground">الاسم</span>
          </div>
          <div className="flex justify-between">
            <a href={`tel:${order.userPhone}`} className="text-info hover:underline">{order.userPhone}</a>
            <span className="text-muted-foreground">الهاتف</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground text-[11px]">{order.delivery_address || "—"}</span>
            <span className="text-muted-foreground">العنوان</span>
          </div>
        </div>
      </div>

      {/* Store Info */}
      <div className="bg-secondary/20 rounded-xl p-3 space-y-2">
        <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
          <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
          المطعم
        </h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between">
            <span className="text-foreground">{order.store_name || "—"}</span>
            <span className="text-muted-foreground">الاسم</span>
          </div>
          {storePhone && (
            <div className="flex justify-between items-center">
              <a href={`tel:${storePhone}`} className="text-info hover:underline flex items-center gap-1">
                <PhoneCall className="w-3 h-3" />{storePhone}
              </a>
              <span className="text-muted-foreground">الهاتف</span>
            </div>
          )}
        </div>
      </div>

      {/* Items */}
      {order.items && Array.isArray(order.items) && order.items.length > 0 && (
        <div className="bg-secondary/20 rounded-xl p-3 space-y-2">
          <h4 className="text-xs font-bold text-foreground">تفاصيل الطلب</h4>
          <div className="space-y-1">
            {(order.items as any[]).map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-primary font-bold">{((item.price || 0) * (item.qty || item.quantity || 1)).toFixed(0)} DH</span>
                <span className="text-foreground">{item.name || "منتج"} × {item.qty || item.quantity || 1}</span>
              </div>
            ))}
            <div className="border-t border-border pt-1 flex justify-between text-xs font-bold">
              <span className="text-primary">{order.estimated_price || 0} DH</span>
              <span className="text-foreground">المجموع</span>
            </div>
          </div>
        </div>
      )}

      {/* Driver Info */}
      {order.driverName && (
        <div className="bg-secondary/20 rounded-xl p-3 space-y-2">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5 text-info" />
            السائق
          </h4>
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-foreground">{order.driverName}</span>
              <span className="text-muted-foreground">الاسم</span>
            </div>
            {order.driverPhone && (
              <div className="flex items-center gap-2">
                <a href={`tel:${order.driverPhone}`}>
                  <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-lg gap-1 text-info border-info/30">
                    <Phone className="w-2.5 h-2.5" />اتصال
                  </Button>
                </a>
                <a href={`https://wa.me/${order.driverPhone?.replace(/[^0-9]/g, "")}`} target="_blank">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] rounded-lg gap-1 text-emerald-400 border-emerald-400/30">
                    <MessageCircle className="w-2.5 h-2.5" />واتساب
                  </Button>
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl p-3">
          <h4 className="text-xs font-bold text-amber-400 mb-1">ملاحظات الزبون</h4>
          <p className="text-xs text-foreground">{order.notes}</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="bg-secondary/20 rounded-xl p-3 space-y-1 text-[10px] text-muted-foreground">
        <div className="flex justify-between"><span>{new Date(order.created_at).toLocaleString("ar-SA")}</span><span>وقت الطلب</span></div>
        {order.accepted_at && <div className="flex justify-between"><span>{new Date(order.accepted_at).toLocaleString("ar-SA")}</span><span>وقت التأكيد</span></div>}
        {order.picked_up_at && <div className="flex justify-between"><span>{new Date(order.picked_up_at).toLocaleString("ar-SA")}</span><span>وقت الاستلام</span></div>}
        {order.delivered_at && <div className="flex justify-between"><span>{new Date(order.delivered_at).toLocaleString("ar-SA")}</span><span>وقت التسليم</span></div>}
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        {order.status === "pending" && (
          <Button className="w-full h-9 rounded-xl text-xs gap-2" onClick={() => onUpdateStatus(order.id, "confirmed")}>
            <CheckCircle className="w-4 h-4" />تأكيد الطلب مع المطعم
          </Button>
        )}
        {order.status === "confirmed" && !order.driver_id && (
          <Button className="w-full h-9 rounded-xl text-xs gap-2" onClick={() => onAssignDriver(order.id)}>
            <UserPlus className="w-4 h-4" />تعيين سائق
          </Button>
        )}
        {order.status !== "cancelled" && order.status !== "delivered" && (
          <Button variant="outline" className="w-full h-9 rounded-xl text-xs gap-2 text-destructive border-destructive/30"
            onClick={() => onUpdateStatus(order.id, "cancelled")}>
            <XCircle className="w-4 h-4" />إلغاء الطلب
          </Button>
        )}
      </div>
    </div>
  );
};

export default DeliveryOrdersCC;
