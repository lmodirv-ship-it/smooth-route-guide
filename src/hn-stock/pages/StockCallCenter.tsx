import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Headphones } from "lucide-react";

const StockCallCenter = () => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["hn-stock-call-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("hn_stock_call_logs").select("*").order("called_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const statusLabels: Record<string, string> = {
    confirmed: "مؤكد", no_answer: "لا إجابة", cancelled: "ملغي",
    rescheduled: "مؤجل", pending: "معلق",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">مركز الاتصال</h1>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !logs?.length ? (
            <div className="text-center py-12">
              <Headphones className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">لا توجد مكالمات مسجلة</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-right py-3 px-4">المشغّل</th>
                  <th className="text-right py-3 px-4">الطلب</th>
                  <th className="text-right py-3 px-4">النتيجة</th>
                  <th className="text-right py-3 px-4">ملاحظات</th>
                  <th className="text-right py-3 px-4">التاريخ</th>
                </tr></thead>
                <tbody>
                  {logs.map((l: any) => (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">{l.operator_name || "—"}</td>
                      <td className="py-3 px-4 font-mono text-xs">{l.order_id?.slice(0, 8) || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${l.call_status === "confirmed" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {statusLabels[l.call_status] || l.call_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground max-w-[200px] truncate">{l.notes || "—"}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(l.called_at).toLocaleDateString("ar-MA")}
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

export default StockCallCenter;
