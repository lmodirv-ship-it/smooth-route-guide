import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, ShoppingCart } from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "معلق", confirmed: "مؤكد", processing: "قيد المعالجة",
  shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي",
  returned: "مرتجع", refunded: "مسترد",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800", confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800", shipped: "bg-cyan-100 text-cyan-800",
  delivered: "bg-green-100 text-green-800", cancelled: "bg-red-100 text-red-800",
  returned: "bg-orange-100 text-orange-800", refunded: "bg-gray-100 text-gray-800",
};

const StockOrders = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["hn-stock-orders", statusFilter, search],
    queryFn: async () => {
      let q = supabase.from("hn_stock_orders").select("*").order("created_at", { ascending: false });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (search) q = q.or(`customer_name.ilike.%${search}%,order_number.ilike.%${search}%`);
      const { data } = await q.limit(100);
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("hn_stock_orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hn-stock-orders"] });
      toast({ title: "تم تحديث الحالة ✅" });
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الطلبات</h1>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative max-w-xs">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !orders?.length ? (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">لا توجد طلبات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-right py-3 px-4">رقم الطلب</th>
                  <th className="text-right py-3 px-4">العميل</th>
                  <th className="text-right py-3 px-4">الهاتف</th>
                  <th className="text-right py-3 px-4">المبلغ</th>
                  <th className="text-right py-3 px-4">الدفع</th>
                  <th className="text-right py-3 px-4">الحالة</th>
                  <th className="text-right py-3 px-4">التاريخ</th>
                  <th className="text-right py-3 px-4">إجراء</th>
                </tr></thead>
                <tbody>
                  {orders.map((o: any) => (
                    <tr key={o.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-mono text-xs">{o.order_number || o.id.slice(0, 8)}</td>
                      <td className="py-3 px-4">{o.customer_name || "—"}</td>
                      <td className="py-3 px-4 font-mono text-xs">{o.customer_phone || "—"}</td>
                      <td className="py-3 px-4">{Number(o.total_amount || 0).toFixed(2)} MAD</td>
                      <td className="py-3 px-4">
                        <Badge variant={o.payment_method === "cod" ? "secondary" : "default"}>
                          {o.payment_method === "cod" ? "COD" : o.payment_method}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[o.status] || ""}`}>
                          {statusLabels[o.status] || o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("ar-MA")}
                      </td>
                      <td className="py-3 px-4">
                        {o.status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: o.id, status: "confirmed" })}>
                            تأكيد
                          </Button>
                        )}
                        {o.status === "confirmed" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: o.id, status: "processing" })}>
                            معالجة
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockOrders;
