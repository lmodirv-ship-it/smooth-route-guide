import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, Truck, Users, DollarSign, AlertCircle } from "lucide-react";

const StockDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ["hn-stock-stats"],
    queryFn: async () => {
      const [products, orders, merchants, shipments] = await Promise.all([
        supabase.from("hn_stock_products").select("id", { count: "exact", head: true }),
        supabase.from("hn_stock_orders").select("id, status, total_amount", { count: "exact" }),
        supabase.from("hn_stock_merchants").select("id", { count: "exact", head: true }),
        (supabase as any).from("hn_stock_shipments").select("id, status", { count: "exact" }),
      ]);

      const orderData = orders.data || [];
      const pendingOrders = orderData.filter((o: any) => o.status === "pending").length;
      const totalRevenue = orderData.reduce((sum: number, o: any) => sum + (Number(o.total_amount) || 0), 0);
      const shipmentData = shipments.data || [];
      const activeShipments = shipmentData.filter((s: any) => !["delivered", "cancelled"].includes(s.status)).length;

      return {
        products: products.count || 0,
        orders: orders.count || 0,
        pendingOrders,
        merchants: merchants.count || 0,
        shipments: shipments.count || 0,
        activeShipments,
        totalRevenue,
      };
    },
  });

  const cards = [
    { title: "المنتجات", value: stats?.products ?? 0, icon: Package, color: "text-blue-500" },
    { title: "الطلبات", value: stats?.orders ?? 0, icon: ShoppingCart, color: "text-green-500" },
    { title: "طلبات معلقة", value: stats?.pendingOrders ?? 0, icon: AlertCircle, color: "text-orange-500" },
    { title: "التجار", value: stats?.merchants ?? 0, icon: Users, color: "text-purple-500" },
    { title: "الشحنات النشطة", value: stats?.activeShipments ?? 0, icon: Truck, color: "text-cyan-500" },
    { title: "الإيرادات (MAD)", value: stats?.totalRevenue?.toLocaleString() ?? "0", icon: DollarSign, color: "text-emerald-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">لوحة التحكم</h1>
        <p className="text-muted-foreground text-sm">نظرة عامة على نظام التخزين والتوزيع</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <RecentOrders />
    </div>
  );
};

const RecentOrders = () => {
  const { data: orders } = useQuery({
    queryKey: ["hn-stock-recent-orders"],
    queryFn: async () => {
      const { data } = await supabase
        .from("hn_stock_orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-indigo-100 text-indigo-800",
    shipped: "bg-cyan-100 text-cyan-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusLabels: Record<string, string> = {
    pending: "معلق", confirmed: "مؤكد", processing: "قيد المعالجة",
    shipped: "تم الشحن", delivered: "تم التسليم", cancelled: "ملغي",
    returned: "مرتجع", refunded: "مسترد",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">آخر الطلبات</CardTitle>
      </CardHeader>
      <CardContent>
        {!orders?.length ? (
          <p className="text-sm text-muted-foreground text-center py-8">لا توجد طلبات بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-right py-2 px-2">رقم الطلب</th>
                  <th className="text-right py-2 px-2">العميل</th>
                  <th className="text-right py-2 px-2">المبلغ</th>
                  <th className="text-right py-2 px-2">الحالة</th>
                  <th className="text-right py-2 px-2">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order: any) => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-2 px-2 font-mono text-xs">{order.order_number || order.id.slice(0, 8)}</td>
                    <td className="py-2 px-2">{order.customer_name || "—"}</td>
                    <td className="py-2 px-2">{Number(order.total_amount || 0).toFixed(2)} MAD</td>
                    <td className="py-2 px-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[order.status] || "bg-gray-100 text-gray-800"}`}>
                        {statusLabels[order.status] || order.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground text-xs">
                      {new Date(order.created_at).toLocaleDateString("ar-MA")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StockDashboard;
