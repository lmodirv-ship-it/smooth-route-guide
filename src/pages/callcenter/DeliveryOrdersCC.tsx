import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Package, Truck, Clock, CheckCircle, XCircle, Phone, MapPin, Search, User, ChefHat, UtensilsCrossed, Bike, UserPlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const statusFlow = [
  { key: "pending", label: "معلّق", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  { key: "confirmed", label: "تم التأكيد", icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
  { key: "preparing", label: "قيد التحضير", icon: ChefHat, color: "text-orange-500", bg: "bg-orange-500/10" },
  { key: "ready", label: "جاهز", icon: UtensilsCrossed, color: "text-purple-500", bg: "bg-purple-500/10" },
  { key: "picked_up", label: "تم الاستلام", icon: Bike, color: "text-primary", bg: "bg-primary/10" },
  { key: "delivered", label: "تم التسليم", icon: MapPin, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { key: "cancelled", label: "ملغي", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
];

const getNextStatus = (current: string) => {
  const order = ["pending", "confirmed", "preparing", "ready", "picked_up", "delivered"];
  const idx = order.indexOf(current);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
};

const getNextLabel = (next: string | null) => {
  if (!next) return null;
  const labels: Record<string, string> = {
    confirmed: "تأكيد مع المطعم",
    preparing: "بدأ التحضير",
    ready: "الطلب جاهز",
    picked_up: "السائق استلم",
    delivered: "تم التوصيل",
  };
  return labels[next] || next;
};

const DeliveryOrdersCC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [assignDialog, setAssignDialog] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState("");

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from("delivery_orders").select("*").order("created_at", { ascending: false }).limit(100);
    if (data) {
      const uids = [...new Set(data.map(o => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name, phone").in("id", uids);
      const pMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setOrders(data.map(o => ({ ...o, userName: pMap.get(o.user_id)?.name || "—", userPhone: pMap.get(o.user_id)?.phone || "—" })));
    }
  }, []);

  const fetchDrivers = useCallback(async () => {
    const { data: driversList } = await supabase.from("drivers").select("id, user_id, status").eq("status", "active");
    if (driversList) {
      const driverUserIds = driversList.map(d => d.user_id);
      const { data: driverProfiles } = await supabase.from("profiles").select("id, name, phone").in("id", driverUserIds);
      const pMap = new Map(driverProfiles?.map(p => [p.id, p]) || []);
      setDrivers(driversList.map(d => ({ ...d, name: pMap.get(d.user_id)?.name || "سائق", phone: pMap.get(d.user_id)?.phone || "" })));
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchDrivers();
    const ch = supabase.channel("cc-delivery-flow")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchOrders, fetchDrivers]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    if (status === "confirmed") updates.accepted_at = new Date().toISOString();
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    const { error } = await supabase.from("delivery_orders").update(updates).eq("id", id);
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    const st = statusFlow.find(s => s.key === status);
    toast({ title: `✅ ${st?.label || status}` });
  };

  const assignDriver = async () => {
    if (!assignDialog || !selectedDriver) return;
    const { error } = await supabase.from("delivery_orders").update({ driver_id: selectedDriver }).eq("id", assignDialog);
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    toast({ title: "تم تعيين السائق ✅" });
    setAssignDialog(null);
    setSelectedDriver("");
  };

  const filtered = orders.filter(o => {
    const matchSearch = !search || o.userName?.includes(search) || o.store_name?.includes(search) || o.delivery_address?.includes(search);
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    pending: orders.filter(o => o.status === "pending").length,
    confirmed: orders.filter(o => o.status === "confirmed").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    ready: orders.filter(o => o.status === "ready").length,
    picked_up: orders.filter(o => o.status === "picked_up").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 flex-wrap">
          {counts.pending > 0 && <Badge variant="outline" className="text-amber-500 border-amber-500/30 text-[10px]">{counts.pending} معلّق</Badge>}
          {counts.preparing > 0 && <Badge variant="outline" className="text-orange-500 border-orange-500/30 text-[10px]">{counts.preparing} تحضير</Badge>}
          {counts.ready > 0 && <Badge variant="outline" className="text-purple-500 border-purple-500/30 text-[10px]">{counts.ready} جاهز</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">إدارة الطلبات</h1>
          <Package className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Flow diagram */}
      <div className="bg-card rounded-xl border border-border p-3 mb-4 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max justify-center text-[10px]">
          {["الزبون", "التطبيق", "مركز الاتصال", "المطعم", "السائق", "الزبون"].map((step, i) => (
            <div key={i} className="flex items-center gap-1">
              <span className="bg-primary/10 text-primary px-2 py-1 rounded-md font-bold whitespace-nowrap">{step}</span>
              {i < 5 && <span className="text-muted-foreground">→</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36 h-9 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {statusFlow.map(s => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filtered.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm bg-card rounded-xl border border-border">لا توجد طلبات</div>}
        {filtered.map(o => {
          const st = statusFlow.find(s => s.key === o.status) || statusFlow[0];
          const nextStatus = getNextStatus(o.status);
          const nextLabel = getNextLabel(nextStatus);
          const driverName = drivers.find(d => d.id === o.driver_id)?.name;

          return (
            <motion.div key={o.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-xl border border-border p-4 hover:shadow-sm transition-shadow">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${st.bg} ${st.color}`}>
                    <st.icon className="w-3 h-3 inline ml-1" />{st.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">#{o.id?.slice(0, 6)}</span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">{o.userName}</p>
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
                    <Phone className="w-3 h-3" />{o.userPhone}
                  </p>
                </div>
              </div>

              {/* Store & Address */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <span className="flex items-center gap-1"><UtensilsCrossed className="w-3 h-3 text-primary" />{o.store_name || "—"}</span>
                <span>→</span>
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{o.delivery_address || "—"}</span>
              </div>

              {/* Items preview */}
              {o.items && Array.isArray(o.items) && o.items.length > 0 && (
                <div className="text-[11px] text-muted-foreground mb-2 bg-secondary/30 rounded-lg p-2">
                  {(o.items as any[]).map((item: any, i: number) => (
                    <span key={i}>{item.name} ×{item.qty}{i < o.items.length - 1 ? "، " : ""}</span>
                  ))}
                </div>
              )}

              {/* Driver & Price */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-primary">{o.estimated_price || 0} DH</span>
                <div className="flex items-center gap-2">
                  {driverName && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Bike className="w-3 h-3" />{driverName}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(o.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {nextStatus && o.status !== "cancelled" && (
                  <Button size="sm" className="h-7 text-xs rounded-lg gap-1" onClick={() => updateStatus(o.id, nextStatus)}>
                    <CheckCircle className="w-3 h-3" />{nextLabel}
                  </Button>
                )}
                {!o.driver_id && o.status !== "cancelled" && o.status !== "delivered" && (
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1" onClick={() => setAssignDialog(o.id)}>
                    <UserPlus className="w-3 h-3" />تعيين سائق
                  </Button>
                )}
                {o.status !== "cancelled" && o.status !== "delivered" && (
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:bg-destructive/10 rounded-lg" onClick={() => updateStatus(o.id, "cancelled")}>
                    <XCircle className="w-3 h-3 ml-1" />إلغاء
                  </Button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Assign Driver Dialog */}
      <Dialog open={!!assignDialog} onOpenChange={() => setAssignDialog(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>تعيين سائق</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا يوجد سائقين متاحين</p>
            ) : (
              <>
                <div className="space-y-2 max-h-60 overflow-auto">
                  {drivers.map(d => (
                    <button key={d.id} onClick={() => setSelectedDriver(d.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${
                        selectedDriver === d.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
                      }`}>
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <Button onClick={assignDriver} disabled={!selectedDriver} className="w-full">تعيين</Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryOrdersCC;
