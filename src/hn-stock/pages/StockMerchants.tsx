import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

const StockMerchants = () => {
  const { data: merchants, isLoading } = useQuery({
    queryKey: ["hn-stock-merchants"],
    queryFn: async () => {
      const { data } = await supabase.from("hn_stock_merchants").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">التجار</h1>
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
          ) : !merchants?.length ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">لا يوجد تجار مسجلين</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-muted-foreground">
                  <th className="text-right py-3 px-4">الاسم</th>
                  <th className="text-right py-3 px-4">الشركة</th>
                  <th className="text-right py-3 px-4">الهاتف</th>
                  <th className="text-right py-3 px-4">المدينة</th>
                  <th className="text-right py-3 px-4">الحالة</th>
                </tr></thead>
                <tbody>
                  {merchants.map((m: any) => (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{m.name}</td>
                      <td className="py-3 px-4">{m.company_name || "—"}</td>
                      <td className="py-3 px-4 font-mono text-xs">{m.phone || "—"}</td>
                      <td className="py-3 px-4">{m.city || "—"}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${m.status === "active" ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {m.status === "active" ? "نشط" : m.status}
                        </span>
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

export default StockMerchants;
