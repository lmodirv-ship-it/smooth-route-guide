import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { DollarSign } from "lucide-react";

const StockTransactions = () => {
  const { data: txns, isLoading } = useQuery({
    queryKey: ["hn-stock-transactions"],
    queryFn: async () => {
      const { data } = await supabase.from("hn_stock_transactions").select("*").order("created_at", { ascending: false }).limit(100);
      return data || [];
    },
  });

  const typeLabels: Record<string, string> = {
    payment: "دفع", refund: "استرداد", payout: "تحويل", cod_collection: "تحصيل COD",
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المعاملات المالية</h1>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !txns?.length ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">لا توجد معاملات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-right py-3 px-4">النوع</th>
                  <th className="text-right py-3 px-4">المبلغ</th>
                  <th className="text-right py-3 px-4">الحالة</th>
                  <th className="text-right py-3 px-4">المرجع</th>
                  <th className="text-right py-3 px-4">التاريخ</th>
                </tr></thead>
                <tbody>
                  {txns.map((t: any) => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4">{typeLabels[t.type] || t.type}</td>
                      <td className="py-3 px-4 font-medium">{Number(t.amount || 0).toFixed(2)} MAD</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${t.status === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                          {t.status === "completed" ? "مكتمل" : t.status === "pending" ? "معلق" : t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">{t.reference || "—"}</td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString("ar-MA")}
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

export default StockTransactions;
