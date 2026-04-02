import { useCallback, useEffect, useMemo, useState } from "react";
import { Car, Loader2, Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGeo } from "@/admin/contexts/AdminGeoContext";

type DriverRequestType = "ride" | "delivery";

interface DriverRequestRow {
  id: string;
  type: DriverRequestType;
  reference: string;
  customerName: string;
  customerPhone: string;
  pickup: string;
  destination: string;
  amount: number;
  distance: number | null;
  estimatedTime: number | null;
  status: string;
  createdAt: string;
}

const TYPE_META: Record<DriverRequestType, { label: string; className: string; icon: typeof Car }> = {
  ride: { label: "رحلة", className: "text-primary border-primary/30", icon: Car },
  delivery: { label: "توصيل", className: "text-info border-info/30", icon: Package },
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  pending: { label: "بانتظار سائق", className: "bg-warning/10 text-warning" },
  accepted: { label: "مقبول", className: "bg-info/10 text-info" },
  confirmed: { label: "مؤكد", className: "bg-info/10 text-info" },
  ready_for_driver: { label: "جاهز للسائق", className: "bg-primary/10 text-primary" },
  driver_assigned: { label: "تم التعيين", className: "bg-primary/10 text-primary" },
  on_the_way_to_vendor: { label: "في الطريق للمطعم", className: "bg-info/10 text-info" },
  picked_up: { label: "تم الاستلام", className: "bg-accent/10 text-accent-foreground" },
  on_the_way_to_customer: { label: "في الطريق للزبون", className: "bg-primary/10 text-primary" },
  delivered: { label: "تم التسليم", className: "bg-success/10 text-success" },
  completed: { label: "مكتمل", className: "bg-success/10 text-success" },
};

const DriverRequestsTable = () => {
  const geoCtx = useAdminGeo();
  const [requests, setRequests] = useState<DriverRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | DriverRequestType>("all");

  const fetchRequests = useCallback(async () => {
    setLoading(true);

    let rideQuery = supabase
      .from("ride_requests")
      .select("id, pickup, destination, price, status, created_at, user_id, distance, estimated_time")
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (geoCtx?.selectedCountry && geoCtx.selectedCountry !== "all") {
      rideQuery = rideQuery.eq("country", geoCtx.selectedCountry);
    }
    if (geoCtx?.selectedCity && geoCtx.selectedCity !== "all") {
      rideQuery = rideQuery.eq("city", geoCtx.selectedCity);
    }

    let deliveryQuery = supabase
      .from("delivery_orders")
      .select("id, order_code, pickup_address, delivery_address, estimated_price, total_price, delivery_fee, status, created_at, user_id, distance, estimated_time")
      .in("status", ["pending", "confirmed", "ready_for_driver", "driver_assigned", "on_the_way_to_vendor", "picked_up", "on_the_way_to_customer"])
      .order("created_at", { ascending: false })
      .limit(50);

    if (geoCtx?.selectedCountry && geoCtx.selectedCountry !== "all") {
      deliveryQuery = deliveryQuery.eq("country", geoCtx.selectedCountry);
    }
    if (geoCtx?.selectedCity && geoCtx.selectedCity !== "all") {
      deliveryQuery = deliveryQuery.eq("city", geoCtx.selectedCity);
    }

    const [{ data: rides = [] }, { data: deliveryOrders = [] }] = await Promise.all([rideQuery, deliveryQuery]);

    const userIds = [...new Set([...rides.map((ride: any) => ride.user_id), ...deliveryOrders.map((order: any) => order.user_id)])];

    const { data: profiles = [] } = userIds.length
      ? await supabase.from("profiles").select("id, name, phone").in("id", userIds)
      : { data: [] };

    const profileMap = new Map(profiles.map((profile: any) => [profile.id, profile]));

    const rideRows: DriverRequestRow[] = rides.map((ride: any) => {
      const profile = profileMap.get(ride.user_id);
      return {
        id: ride.id,
        type: "ride",
        reference: `R-${ride.id.slice(0, 8).toUpperCase()}`,
        customerName: profile?.name || "—",
        customerPhone: profile?.phone || "",
        pickup: ride.pickup || "—",
        destination: ride.destination || "—",
        amount: Number(ride.price || 0),
        distance: ride.distance ? Number(ride.distance) : null,
        estimatedTime: ride.estimated_time ?? null,
        status: ride.status,
        createdAt: ride.created_at,
      };
    });

    const deliveryRows: DriverRequestRow[] = deliveryOrders.map((order: any) => {
      const profile = profileMap.get(order.user_id);
      return {
        id: order.id,
        type: "delivery",
        reference: order.order_code || `D-${order.id.slice(0, 8).toUpperCase()}`,
        customerName: profile?.name || "—",
        customerPhone: profile?.phone || "",
        pickup: order.pickup_address || "—",
        destination: order.delivery_address || "—",
        amount: Number(order.total_price ?? order.estimated_price ?? order.delivery_fee ?? 0),
        distance: order.distance ? Number(order.distance) : null,
        estimatedTime: order.estimated_time ?? null,
        status: order.status,
        createdAt: order.created_at,
      };
    });

    setRequests(
      [...rideRows, ...deliveryRows]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 100),
    );
    setLoading(false);
  }, [geoCtx?.selectedCity, geoCtx?.selectedCountry]);

  useEffect(() => {
    void fetchRequests();

    const channel = supabase
      .channel(`admin-driver-requests-${Date.now()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => {
        void fetchRequests();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, () => {
        void fetchRequests();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRequests]);

  const filteredRequests = useMemo(() => {
    if (typeFilter === "all") return requests;
    return requests.filter((request) => request.type === typeFilter);
  }, [requests, typeFilter]);

  const formatDate = (value: string) => {
    try {
      return new Date(value).toLocaleString("ar-MA", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  return (
    <section className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => void fetchRequests()}>
          <RefreshCw className="w-4 h-4 ml-1" />
          تحديث الطلبات
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="secondary">{filteredRequests.length} طلب</Badge>
          <h2 className="text-lg font-bold text-foreground">جدول الطلبات تحت الخريطة</h2>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "all", label: "الكل" },
          { key: "ride", label: "الرحلات" },
          { key: "delivery", label: "التوصيل" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setTypeFilter(item.key as "all" | DriverRequestType)}
            className={`rounded-lg px-4 py-2 text-xs transition-colors ${typeFilter === item.key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden bg-background/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-right">
                <th className="p-4 font-medium text-muted-foreground">النوع</th>
                <th className="p-4 font-medium text-muted-foreground">المرجع</th>
                <th className="p-4 font-medium text-muted-foreground">العميل</th>
                <th className="p-4 font-medium text-muted-foreground">الانطلاق</th>
                <th className="p-4 font-medium text-muted-foreground">الوجهة</th>
                <th className="p-4 font-medium text-muted-foreground">المسافة</th>
                <th className="p-4 font-medium text-muted-foreground">الوقت المتوقع</th>
                <th className="p-4 font-medium text-muted-foreground">المبلغ</th>
                <th className="p-4 font-medium text-muted-foreground">الحالة</th>
                <th className="p-4 font-medium text-muted-foreground">الوقت</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                   <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري تحميل الطلبات...
                    </span>
                  </td>
                </tr>
              )}

              {!loading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-muted-foreground">
                    لا توجد طلبات ظاهرة حالياً
                  </td>
                </tr>
              )}

              {!loading && filteredRequests.map((request) => {
                const typeMeta = TYPE_META[request.type];
                const statusMeta = STATUS_META[request.status] || { label: request.status, className: "bg-secondary text-muted-foreground" };
                const TypeIcon = typeMeta.icon;

                return (
                  <tr key={`${request.type}-${request.id}`} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="p-4 align-middle">
                      <Badge variant="outline" className={typeMeta.className}>
                        <TypeIcon className="w-3 h-3 ml-1" />
                        {typeMeta.label}
                      </Badge>
                    </td>
                    <td className="p-4 align-middle font-mono text-xs text-primary font-bold">{request.reference}</td>
                    <td className="p-4 align-middle">
                      <div>
                        <p className="font-medium text-foreground">{request.customerName}</p>
                        <p className="text-xs text-muted-foreground">{request.customerPhone || "بدون رقم"}</p>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-foreground max-w-[220px] truncate">{request.pickup}</td>
                     <td className="p-4 align-middle text-foreground max-w-[220px] truncate">{request.destination}</td>
                     <td className="p-4 align-middle text-sm text-foreground">{request.distance ? `${request.distance.toFixed(1)} كم` : "—"}</td>
                     <td className="p-4 align-middle text-sm text-foreground">{request.estimatedTime ? `${request.estimatedTime} د` : "—"}</td>
                     <td className="p-4 align-middle text-primary font-semibold">{request.amount.toFixed(0)} DH</td>
                    <td className="p-4 align-middle">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="p-4 align-middle text-xs text-muted-foreground">{formatDate(request.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};

export default DriverRequestsTable;