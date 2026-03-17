import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Package, Truck, Clock, CheckCircle, XCircle, Phone, MapPin, Search, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const statusMap: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "معلّق", color: "text-warning", bg: "bg-warning/10" },
  accepted: { label: "مقبول", color: "text-info", bg: "bg-info/10" },
  picked_up: { label: "تم الاستلام", color: "text-primary", bg: "bg-primary/10" },
  in_transit: { label: "قيد التوصيل", color: "text-accent", bg: "bg-accent/10" },
  delivered: { label: "تم التسليم", color: "text-success", bg: "bg-success/10" },
  cancelled: { label: "ملغي", color: "text-destructive", bg: "bg-destructive/10" },
};

const DeliveryOrdersCC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);

  const fetchOrders = useCallback(async () => {
    const { data } = await supabase.from("delivery_orders").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) {
      const uids = [...new Set(data.map(o => o.user_id))];
      const { data: profiles } = await supabase.from("profiles").select("id, name, phone").in("id", uids);
      const pMap = new Map(profiles?.map(p => [p.id, p]) || []);
      setOrders(data.map(o => ({ ...o, userName: pMap.get(o.user_id)?.name || "—", userPhone: pMap.get(o.user_id)?.phone || "—" })));
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const ch = supabase.channel("cc-delivery-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, fetchOrders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchOrders]);

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    if (status === "accepted") updates.accepted_at = new Date().toISOString();
    const { error } = await supabase.from("delivery_orders").update(updates).eq("id", id);
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    toast({ title: `تم التحديث: ${statusMap[status]?.label}` });
    fetchOrders();
  };

  const filtered = orders.filter(o =>
    o.userName?.includes(search) || o.store_name?.includes(search) || o.delivery_address?.includes(search)
  );

  const pending = orders.filter(o => o.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          {pending > 0 && <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded-full">{pending} معلّق</span>}
        </div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-foreground">طلبات التوصيل</h1>
          <Package className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
      </div>

      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <div className="divide-y divide-border/50 max-h-[600px] overflow-auto">
          {filtered.length === 0 && <div className="p-8 text-center text-muted-foreground text-sm">لا توجد طلبات</div>}
          {filtered.map(o => {
            const st = statusMap[o.status] || { label: o.status, color: "text-muted-foreground", bg: "bg-secondary" };
            return (
              <div key={o.id} className="p-4 hover:bg-secondary/20 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg} ${st.color}`}>{st.label}</span>
                    <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-foreground">{o.userName}</p>
                    <p className="text-xs text-muted-foreground">{o.userPhone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <MapPin className="w-3 h-3" />
                  <span>{o.pickup_address || o.store_name || "—"}</span>
                  <span>→</span>
                  <span>{o.delivery_address || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {o.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-success/30 text-success" onClick={() => updateStatus(o.id, "accepted")}>
                          <CheckCircle className="w-3 h-3 ml-1" />قبول
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs border-destructive/30 text-destructive" onClick={() => updateStatus(o.id, "cancelled")}>
                          <XCircle className="w-3 h-3 ml-1" />إلغاء
                        </Button>
                      </>
                    )}
                    {o.status === "accepted" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-primary/30 text-primary" onClick={() => updateStatus(o.id, "picked_up")}>استلام</Button>
                    )}
                    {o.status === "picked_up" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs border-success/30 text-success" onClick={() => updateStatus(o.id, "delivered")}>تسليم</Button>
                    )}
                  </div>
                  <span className="text-sm font-bold text-foreground">{o.estimated_price || 0} د.م</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DeliveryOrdersCC;
