import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bike, CheckCircle, Clock, MapPin, Navigation, Package,
  Store, XCircle, Radar, Wallet, TrendingUp, Crown, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LeafletMap from "@/components/LeafletMap";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import { useDriverSubscription } from "@/hooks/useDriverSubscription";
import { useDriverMapControls } from "@/contexts/DriverMapControlsContext";
import { notifyNewOrder, unlockAudio } from "@/lib/notificationSound";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useUserReference } from "@/hooks/useUserReference";
import { useI18n } from "@/i18n/context";

const DEFAULT_LOCATION = { lat: 35.7595, lng: -5.834 };
const MAX_RADIUS_KM = 10;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

type OrderStatus = string;

interface DeliveryOrder {
  id: string;
  status: OrderStatus;
  store_name: string | null;
  pickup_address: string | null;
  delivery_address: string | null;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  estimated_price: number | null;
  total_price: number | null;
  delivery_fee: number | null;
  user_id: string;
  driver_id: string | null;
  created_at: string;
  city: string | null;
  items: any;
  notes: string | null;
  order_code: string | null;
  distance: number | null;
}

const STATUS_FLOW: { key: string; label: string; icon: typeof Clock }[] = [
  { key: "driver_assigned", label: "تم القبول", icon: CheckCircle },
  { key: "on_the_way_to_vendor", label: "في الطريق للمطعم", icon: Navigation },
  { key: "picked_up", label: "تم الاستلام", icon: Store },
  { key: "on_the_way_to_customer", label: "في الطريق للزبون", icon: Bike },
  { key: "delivered", label: "تم التسليم", icon: CheckCircle },
];

const DriverDelivery = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverCity, setDriverCity] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<DeliveryOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState({ deliveries: 0, earnings: 0 });
  const { location: driverLocation } = useDriverGeolocation(true);
  const { isExpired: subscriptionExpired } = useDriverSubscription();
  const { mapTheme, mapExpanded } = useDriverMapControls();
  const { driverCode, userCode } = useUserReference();
  const prevCountRef = useRef(0);
  const initialRef = useRef(true);

  // Init driver
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (driver) setDriverId(driver.id);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: completed } = await supabase
        .from("delivery_orders").select("id, total_price, delivery_fee")
        .eq("driver_id", driver?.id).eq("status", "delivered")
        .gte("created_at", todayStart.toISOString());
      setTodayStats({
        deliveries: completed?.length || 0,
        earnings: completed?.reduce((s, o) => s + (Number(o.delivery_fee) || Number(o.total_price) || 0), 0) || 0,
      });

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (pos) => {
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=fr`);
            const geo = await res.json();
            setDriverCity(geo?.address?.city || geo?.address?.town || "Tanger");
          } catch { setDriverCity("Tanger"); }
        }, () => setDriverCity("Tanger"), { timeout: 8000 });
      }
    });
  }, []);

  const fetchOrders = useCallback(async () => {
    if (!driverId) return;
    const { data: active } = await supabase
      .from("delivery_orders").select("*")
      .eq("driver_id", driverId)
      .in("status", ["driver_assigned", "on_the_way_to_vendor", "picked_up", "on_the_way_to_customer"])
      .order("created_at", { ascending: false }).limit(1).maybeSingle();

    setActiveOrder(active as DeliveryOrder | null);
    if (!active) {
      let query = supabase.from("delivery_orders").select("*")
        .eq("status", "ready_for_driver").order("created_at", { ascending: false }).limit(20);
      if (driverCity) query = query.ilike("city", `%${driverCity}%`);
      const { data: pending } = await query;
      const newCount = pending?.length || 0;
      if (!initialRef.current && newCount > prevCountRef.current) notifyNewOrder();
      initialRef.current = false;
      prevCountRef.current = newCount;
      setPendingOrders((pending || []) as DeliveryOrder[]);
    } else {
      setPendingOrders([]);
    }
  }, [driverId, driverCity]);

  useEffect(() => {
    if (!driverId) return;
    fetchOrders();
    const ch = supabase.channel("driver-delivery-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "delivery_orders" }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [driverId, driverCity, fetchOrders]);

  const acceptOrder = async (orderId: string) => {
    if (!driverId) return;
    setAccepting(orderId);
    if (subscriptionExpired) {
      toast({ title: "اشتراك مطلوب", description: "يجب الاشتراك في باقة لقبول الطلبات", variant: "destructive" });
      navigate("/driver/subscription");
      setAccepting(null);
      return;
    }
    const { error } = await supabase.from("delivery_orders")
      .update({ status: "driver_assigned", driver_id: driverId, accepted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("id", orderId).eq("status", "ready_for_driver");
    if (error) {
      toast({ title: "خطأ", description: "تم قبول الطلب من سائق آخر", variant: "destructive" });
    } else {
      toast({ title: "تم قبول الطلب ✅" });
      // Navigate to tracking page
      navigate(`/delivery/tracking?id=${orderId}`);
    }
    setAccepting(null);
    fetchOrders();
  };

  const route = useMemo(() => {
    if (!activeOrder || !driverLocation) return null;
    if (["driver_assigned", "on_the_way_to_vendor"].includes(activeOrder.status) && activeOrder.pickup_lat != null) {
      return { pickup: driverLocation, destination: { lat: Number(activeOrder.pickup_lat), lng: Number(activeOrder.pickup_lng) } };
    }
    if (["picked_up", "on_the_way_to_customer"].includes(activeOrder.status) && activeOrder.delivery_lat != null) {
      return { pickup: driverLocation, destination: { lat: Number(activeOrder.delivery_lat), lng: Number(activeOrder.delivery_lng) } };
    }
    return null;
  }, [activeOrder, driverLocation]);

  const setStatus = async (status: string) => {
    if (!activeOrder) return;
    const updates: Record<string, any> = { status, updated_at: new Date().toISOString() };
    if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    await supabase.from("delivery_orders").update(updates).eq("id", activeOrder.id);
    if (status === "delivered") toast({ title: "تم التسليم بنجاح ✅" });
    fetchOrders();
  };

  const currentStepIdx = activeOrder ? STATUS_FLOW.findIndex(s => s.key === activeOrder.status) : -1;

  // Enrich pending orders with distance/ETA
  const enrichedOrders = useMemo(() => {
    return pendingOrders.map(order => {
      let distKm: number | null = null;
      let etaMin: number | null = null;
      if (driverLocation && order.pickup_lat != null) {
        distKm = Math.round(haversineKm(driverLocation, { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) }) * 10) / 10;
        etaMin = Math.max(1, Math.round(distKm * 2.5));
      }
      return { ...order, distKm, etaMin };
    });
  }, [pendingOrders, driverLocation]);

  return (
    <div className="h-[calc(100dvh-2.75rem)] flex flex-col bg-background overflow-hidden" dir={dir} onClick={() => unlockAudio()}>
      {/* Map */}
      <div className="relative flex-1 min-h-0 border-x-4 border-black/90 shadow-[inset_4px_0_8px_rgba(0,0,0,0.3),-4px_0_8px_rgba(0,0,0,0.3),inset_-4px_0_8px_rgba(0,0,0,0.3),4px_0_8px_rgba(0,0,0,0.3)]">
        <LeafletMap
          center={driverLocation || DEFAULT_LOCATION}
          zoom={14}
          showMarker
          driverLocation={driverLocation}
          route={route}
          className="w-full h-full"
          hideControls
          externalTheme={mapTheme}
          externalExpanded={mapExpanded}
          driverIconType="motorcycle"
        />

        {/* Radius indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur-md text-foreground px-4 py-1.5 rounded-full text-xs flex items-center gap-2 border border-border">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          نطاق البحث: {MAX_RADIUS_KM} كم
        </div>
      </div>

      {/* Subscription expired banner */}
      {subscriptionExpired && (
        <div className="shrink-0 bg-destructive/10 border-t border-destructive/30 px-4 py-2">
          <button onClick={() => navigate("/driver/subscription")} className="w-full flex items-center justify-between">
            <Crown className="w-5 h-5 text-destructive" />
            <div className="text-right">
              <p className="text-destructive font-bold text-sm">⚠️ اشتراكك منتهي</p>
              <p className="text-muted-foreground text-xs">اضغط لتجديد الاشتراك</p>
            </div>
          </button>
        </div>
      )}

      {/* Active order banner → go to tracking */}
      {activeOrder && (
        <div className="shrink-0 bg-emerald-500/10 border-t border-emerald-500/30 p-3">
          <button
            onClick={() => navigate(`/delivery/tracking?id=${activeOrder.id}`)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
          >
            <div className="flex items-center gap-2">
              <Bike className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div className="text-right">
                <p className="text-foreground font-bold text-sm">{activeOrder.store_name || "طلب توصيل نشط"}</p>
                <p className="text-muted-foreground text-xs">{STATUS_FLOW.find(s => s.key === activeOrder.status)?.label || activeOrder.status}</p>
              </div>
            </div>
            <div className="text-left">
              <span className="text-emerald-400 font-bold">{activeOrder.total_price || activeOrder.estimated_price || "—"} DH</span>
              <p className="text-xs text-emerald-400">اضغط للمتابعة →</p>
            </div>
          </button>
        </div>
      )}

      {/* Pending orders table */}
      {!activeOrder && (
        <div className="shrink-0 max-h-[35vh] overflow-y-auto bg-background border-t border-border">
          {enrichedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Radar className="w-10 h-10 text-muted-foreground/30 mb-2 animate-pulse" />
              <p className="text-muted-foreground text-sm font-medium">جارٍ البحث عن طلبات توصيل...</p>
              <p className="text-muted-foreground/60 text-xs mt-1">نطاق البحث: {MAX_RADIUS_KM} كم</p>
            </div>
          ) : (
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full font-bold">
                  {enrichedOrders.length} طلب
                </span>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  طلبات توصيل جديدة
                </h3>
              </div>
              <div className="rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right text-xs font-bold">Ref</TableHead>
                      <TableHead className="text-right text-xs font-bold">المتجر</TableHead>
                      <TableHead className="text-right text-xs font-bold">المسافة</TableHead>
                      <TableHead className="text-right text-xs font-bold">الوقت</TableHead>
                      <TableHead className="text-right text-xs font-bold">الثمن</TableHead>
                      <TableHead className="text-center text-xs font-bold">قبول</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs font-semibold text-primary">
                          {order.order_code || order.id.slice(0, 6).toUpperCase()}
                        </TableCell>
                        <TableCell className="text-right text-xs text-foreground truncate max-w-[100px]">
                          {order.store_name || "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {order.distKm != null ? `${order.distKm} كم` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs text-muted-foreground">
                          {order.etaMin != null ? `${order.etaMin} د` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-foreground">
                          {order.total_price || order.estimated_price || "—"} DH
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            size="sm"
                            className="h-8 min-w-16 bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                            onClick={() => acceptOrder(order.id)}
                            disabled={accepting === order.id}
                          >
                            {accepting === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "قبول"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DriverDelivery;
