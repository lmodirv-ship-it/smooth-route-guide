import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse, MapPin } from "lucide-react";

const StockWarehouses = () => {
  const { data: warehouses, isLoading } = useQuery({
    queryKey: ["hn-stock-warehouses"],
    queryFn: async () => {
      const { data } = await supabase.from("hn_stock_warehouses").select("*").order("name");
      return data || [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">المستودعات</h1>
      {isLoading ? (
        <p className="text-center py-8 text-muted-foreground">جاري التحميل...</p>
      ) : !warehouses?.length ? (
        <div className="text-center py-12">
          <Warehouse className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">لا توجد مستودعات</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {warehouses.map((w: any) => (
            <Card key={w.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Warehouse className="w-5 h-5 text-primary" />
                  {w.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{w.address}, {w.city}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">السعة:</span>
                  <span className="font-medium">{w.capacity || "غير محدد"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الحالة:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${w.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {w.is_active ? "نشط" : "غير نشط"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default StockWarehouses;
