import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Package, Truck, Clock, CheckCircle, XCircle, MapPin, Search, RefreshCw, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/firestoreClient";
import { toast } from "@/hooks/use-toast";

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "معلّق", color: "text-warning", bg: "bg-warning/10" },
  accepted: { label: "مقبول", color: "text-info", bg: "bg-info/10" },
  picked_up: { label: "تم الاستلام", color: "text-primary", bg: "bg-primary/10" },
  in_transit: { label: "قيد التوصيل", color: "text-accent", bg: "bg-accent/10" },
  delivered: { label: "تم التسليم", color: "text-success", bg: "bg-success/10" },
  cancelled: { label: "ملغي", color: "text-destructive", bg: "bg-destructive/10" },
};

const AdminDeliveryOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    let q = supabase.from("delivery_orders").select("*").order("created_at", { ascending: false }).limit(100);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    if (data) {
      const uids = [...new Set(data.map(o => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name, phone").in("id", uids);
      const pMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setOrders(data.map(o => ({ ...o, userName: pMap.get(o.user_id)?.name || "—", userPhone: pMap.get(o.user_id)?.phone || "—" })));
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel("admin-delivery-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "accepted") updates.accepted_at = new Date().toISOString();
    const { error } = await supabase.from("delivery_orders").update(updates).eq("id", id);
    if (error) { toast({ title: "خطأ في التحديث", variant: "destructive" }); return; }
    toast({ title: `تم تحديث الحالة: ${statusMap[status]?.label || status}` });
    fetchOrders();
  };

  const filtered = orders.filter(o =>
    o.userName?.includes(search) || o.store_name?.includes(search) || o.pickup_address?.includes(search) || o.delivery_address?.includes(search)
  );

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    inTransit: orders.filter(o => ["accepted", "picked_up", "in_transit"].includes(o.status)).length,
    delivered: orders.filter(o => o.status === "delivered").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={fetchOrders}><RefreshCw className="w-4 h-4 ml-1" />تحديث</Button>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">طلبات التوصيل</h1>
          <Package className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Package, label: "إجمالي الطلبات", value: stats.total, color: "text-primary", bg: "bg-primary/10" },
          { icon: Clock, label: "معلّقة", value: stats.pending, color: "text-warning", bg: "bg-warning/10" },
          { icon: Truck, label: "قيد التوصيل", value: stats.inTransit, color: "text-info", bg: "bg-info/10" },
          { icon: CheckCircle, label: "تم التسليم", value: stats.delivered, color: "text-success", bg: "bg-success/10" },
        ].map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="gradient-card rounded-xl p-4 border border-border">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center mb-2`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم، المتجر، العنوان..." className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
        </div>
        {["all", "pending", "accepted", "picked_up", "in_transit", "delivered", "cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${filter === f ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {f === "all" ? "الكل" : statusMap[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-xs">
                <td className="p-3">إجراءات</td>
                <td className="p-3">السعر</td>
                <td className="p-3">الحالة</td>
                <td className="p-3">التوصيل إلى</td>
                <td className="p-3">الاستلام من</td>
                <td className="p-3">النوع</td>
                <td className="p-3 text-right">العميل</td>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">جاري التحميل...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">لا توجد طلبات</td></tr>}
              {filtered.map(o => {
                const st = statusMap[o.status] || { label: o.status, color: "text-muted-foreground", bg: "bg-secondary" };
                return (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                    <td className="p-3">
                      <div className="flex gap-1">
                        <button onClick={() => setSelected(o)} className="p-1 hover:bg-secondary rounded"><Eye className="w-4 h-4 text-info" /></button>
                        {o.status === "pending" && (
                          <>
                            <button onClick={() => updateStatus(o.id, "accepted")} className="p-1 hover:bg-success/10 rounded"><CheckCircle className="w-4 h-4 text-success" /></button>
                            <button onClick={() => updateStatus(o.id, "cancelled")} className="p-1 hover:bg-destructive/10 rounded"><XCircle className="w-4 h-4 text-destructive" /></button>
                          </>
                        )}
                        {o.status === "accepted" && (
                          <button onClick={() => updateStatus(o.id, "picked_up")} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">استلام</button>
                        )}
                        {o.status === "picked_up" && (
                          <button onClick={() => updateStatus(o.id, "delivered")} className="text-xs bg-success/10 text-success px-2 py-0.5 rounded">تسليم</button>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-foreground font-semibold">{o.estimated_price || 0} د.م</td>
                    <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span></td>
                    <td className="p-3 text-foreground text-xs truncate max-w-[150px]">{o.delivery_address || "—"}</td>
                    <td className="p-3 text-foreground text-xs truncate max-w-[150px]">{o.pickup_address || o.store_name || "—"}</td>
                    <td className="p-3 text-xs text-muted-foreground">{o.category}</td>
                    <td className="p-3 text-right">
                      <p className="text-foreground text-xs font-medium">{o.userName}</p>
                      <p className="text-muted-foreground text-[10px]">{o.userPhone}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelected(null)}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            onClick={e => e.stopPropagation()} className="gradient-card rounded-2xl border border-border p-6 w-full max-w-lg mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground">✕</button>
              <h3 className="text-lg font-bold text-foreground">تفاصيل الطلب</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-secondary/50 rounded-lg p-3 text-right">
                <p className="text-xs text-muted-foreground">العميل</p>
                <p className="text-foreground font-medium">{selected.userName}</p>
                <p className="text-muted-foreground text-xs">{selected.userPhone}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-right">
                <p className="text-xs text-muted-foreground">النوع / الفئة</p>
                <p className="text-foreground font-medium">{selected.category}</p>
                <p className="text-muted-foreground text-xs">{selected.delivery_type}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-right col-span-2">
                <p className="text-xs text-muted-foreground mb-1"><MapPin className="w-3 h-3 inline ml-1" />الاستلام</p>
                <p className="text-foreground text-xs">{selected.pickup_address || "—"}</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-right col-span-2">
                <p className="text-xs text-muted-foreground mb-1"><MapPin className="w-3 h-3 inline ml-1" />التوصيل</p>
                <p className="text-foreground text-xs">{selected.delivery_address || "—"}</p>
              </div>
              {selected.notes && (
                <div className="bg-secondary/50 rounded-lg p-3 text-right col-span-2">
                  <p className="text-xs text-muted-foreground">ملاحظات</p>
                  <p className="text-foreground text-xs">{selected.notes}</p>
                </div>
              )}
              <div className="bg-secondary/50 rounded-lg p-3 text-right">
                <p className="text-xs text-muted-foreground">السعر المقدّر</p>
                <p className="text-foreground font-bold">{selected.estimated_price || 0} د.م</p>
              </div>
              <div className="bg-secondary/50 rounded-lg p-3 text-right">
                <p className="text-xs text-muted-foreground">التاريخ</p>
                <p className="text-foreground text-xs">{new Date(selected.created_at).toLocaleString("ar-MA")}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveryOrders;
