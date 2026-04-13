import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Truck } from "lucide-react";

const statusFlow = ["preparing", "ready_for_pickup", "picked_up", "in_transit", "out_for_delivery", "delivered", "failed", "returned"];

const statusLabels: Record<string, string> = {
  preparing: "قيد التحضير", ready_for_pickup: "جاهز للاستلام", picked_up: "تم الاستلام",
  in_transit: "في الطريق", out_for_delivery: "خارج للتوصيل", delivered: "تم التسليم",
  failed: "فشل", returned: "مرتجع",
};

const statusColors: Record<string, string> = {
  preparing: "bg-yellow-100 text-yellow-800", ready_for_pickup: "bg-blue-100 text-blue-800",
  picked_up: "bg-indigo-100 text-indigo-800", in_transit: "bg-cyan-100 text-cyan-800",
  out_for_delivery: "bg-purple-100 text-purple-800", delivered: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800", returned: "bg-orange-100 text-orange-800",
};

const db = supabase as any;

const StockShipments = () => {
  const queryClient = useQueryClient();

  const { data: shipments, isLoading } = useQuery({
    queryKey: ["hn-stock-shipments"],
    queryFn: async () => {
      const { data } = await db.from("hn_stock_shipments").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await db.from("hn_stock_shipments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hn-stock-shipments"] });
      toast({ title: "تم تحديث حالة الشحنة ✅" });
    },
  });

  const getNextStatus = (current: string) => {
    const idx = statusFlow.indexOf(current);
    if (idx === -1 || idx >= statusFlow.length - 1) return null;
    return statusFlow[idx + 1];
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">الشحنات</h1>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !shipments?.length ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">لا توجد شحنات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-right py-3 px-4">رقم التتبع</th>
                  <th className="text-right py-3 px-4">العنوان</th>
                  <th className="text-right py-3 px-4">المدينة</th>
                  <th className="text-right py-3 px-4">الحالة</th>
                  <th className="text-right py-3 px-4">COD</th>
                  <th className="text-right py-3 px-4">إجراء</th>
                </tr></thead>
                <tbody>
                  {shipments.map((s: any) => {
                    const next = getNextStatus(s.status);
                    return (
                      <tr key={s.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-4 font-mono text-xs">{s.tracking_number || "—"}</td>
                        <td className="py-3 px-4 text-xs max-w-[200px] truncate">{s.delivery_address || "—"}</td>
                        <td className="py-3 px-4">{s.delivery_city || "—"}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[s.status] || ""}`}>
                            {statusLabels[s.status] || s.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {s.is_cod && <Badge variant="secondary">{Number(s.cod_amount || 0).toFixed(2)}</Badge>}
                        </td>
                        <td className="py-3 px-4">
                          {next && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: s.id, status: next })}>
                              {statusLabels[next]}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StockShipments;
