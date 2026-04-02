import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bike, CheckCircle, Clock, MapPin, Navigation, Package, Phone,
  Store, XCircle, Radar, Wallet, TrendingUp, Crown, Loader2,
  Star, Settings, Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import LeafletMap from "@/components/LeafletMap";
import { useDemandHeatmap } from "@/hooks/useDemandHeatmap";
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

function detectCity(loc: { lat: number; lng: number }): string {
  if (loc.lat > 35.6 && loc.lat < 35.85 && loc.lng > -5.95 && loc.lng < -5.7) return "طنجة";
  if (loc.lat > 35.5 && loc.lat < 35.65 && loc.lng > -5.45 && loc.lng < -5.2) return "تطوان";
  if (loc.lat > 33.95 && loc.lat < 34.1 && loc.lng > -6.9 && loc.lng < -6.7) return "الرباط";
  if (loc.lat > 33.5 && loc.lat < 33.7 && loc.lng > -7.7 && loc.lng < -7.4) return "الدار البيضاء";
  if (loc.lat > 31.55 && loc.lat < 31.7 && loc.lng > -8.1 && loc.lng < -7.9) return "مراكش";
  return "منطقتك";
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
  customer_reference?: string;
  customer_rating?: number;
}

const DriverDelivery = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [driverCity, setDriverCity] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<DeliveryOrder[]>([]);
  const [activeOrder, setActiveOrder] = useState<DeliveryOrder | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [todayStats, setTodayStats] = useState({ deliveries: 0, earnings: 0, rating: 0 });
  const [driverRating, setDriverRating] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const { location: driverLocation } = useDriverGeolocation(true);
  const { isExpired: subscriptionExpired, daysLeft: subDaysLeft } = useDriverSubscription();
  const { mapTheme, mapExpanded } = useDriverMapControls();
  const heatPoints = useDemandHeatmap();
  const { driverCode, userCode } = useUserReference();
  const refCode = driverCode || userCode;
  const prevCountRef = useRef(0);
  const initialRef = useRef(true);

  // Init driver + stats
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      
      // Profile
      const { data: profile } = await supabase.from("profiles").select("avg_rating").eq("id", user.id).single();
      setDriverRating(Number(profile?.avg_rating) || 0);

      // Driver record
      const { data: driver } = await supabase.from("drivers").select("id, rating").eq("user_id", user.id).maybeSingle();
      if (driver) setDriverId(driver.id);

      // Today stats
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: completed } = await supabase
        .from("delivery_orders").select("id, total_price, delivery_fee")
        .eq("driver_id", driver?.id).eq("status", "delivered")
        .gte("created_at", todayStart.toISOString());
      setTodayStats({
        deliveries: completed?.length || 0,
        earnings: completed?.reduce((s, o) => s + (Number(o.delivery_fee) || Number(o.total_price) || 0), 0) || 0,
        rating: Number(driver?.rating) || 0,
      });
    });

    // Detect city
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (pos) => {
        setDriverCity(detectCity({ lat: pos.coords.latitude, lng: pos.coords.longitude }));
      }, () => setDriverCity("طنجة"), { timeout: 8000 });
    }
  }, []);

  // Sync location to DB
  useEffect(() => {
    if (!driverLocation) return;
    const updateLoc = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("drivers").update({
        current_lat: driverLocation.lat, current_lng: driverLocation.lng,
        location_updated_at: new Date().toISOString(),
      }).eq("user_id", user.id);
    };
    const timer = setTimeout(updateLoc, 1000);
    return () => clearTimeout(timer);
  }, [driverLocation]);

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
        .in("status", ["pending", "ready_for_driver"]).order("created_at", { ascending: false }).limit(20);
      if (driverCity) query = query.ilike("city", `%${driverCity}%`);
      const { data: pending } = await query;

      // Enrich with customer references
      const userIds = Array.from(new Set((pending || []).map((o: any) => o.user_id).filter(Boolean)));
      let customerMap = new Map<string, { user_code: string | null; avg_rating: number }>();
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, user_code, avg_rating").in("id", userIds);
        customerMap = new Map((profiles || []).map((p: any) => [p.id, { user_code: p.user_code, avg_rating: Number(p.avg_rating) || 0 }]));
      }

      // Fetch store phone numbers
      const storeIds = Array.from(new Set((pending || []).map((o: any) => o.store_id).filter(Boolean)));
      let storePhoneMap = new Map<string, string>();
      if (storeIds.length > 0) {
        const { data: stores } = await supabase.from("stores").select("id, phone").in("id", storeIds);
        storePhoneMap = new Map((stores || []).map((s: any) => [s.id, s.phone || ""]));
      }

      const enriched = (pending || []).map((order: any) => {
        const customer = customerMap.get(order.user_id);
        return {
          ...order,
          customer_reference: customer?.user_code || `#${order.id.slice(0, 6).toUpperCase()}`,
          customer_rating: customer?.avg_rating || 0,
          store_phone: storePhoneMap.get(order.store_id) || "",
        };
      });

      const newCount = enriched.length;
      if (!initialRef.current && newCount > prevCountRef.current && soundEnabled) notifyNewOrder();
      initialRef.current = false;
      prevCountRef.current = newCount;
      setPendingOrders(enriched as DeliveryOrder[]);
    } else {
      setPendingOrders([]);
    }
  }, [driverId, driverCity, soundEnabled]);

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
    const order = enrichedOrders.find(o => o.id === orderId);
    const { error } = await supabase.from("delivery_orders")
      .update({
        status: "driver_assigned",
        driver_id: driverId,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        distance: order?.distKm || null,
        estimated_time: order?.etaMin || null,
      })
      .eq("id", orderId).in("status", ["pending", "ready_for_driver"]);
    if (error) {
      toast({ title: "خطأ", description: "تم قبول الطلب من سائق آخر", variant: "destructive" });
    } else {
      toast({ title: "تم قبول الطلب ✅" });
      navigate(`/driver/delivery/tracking?id=${orderId}`);
    }
    setAccepting(null);
    fetchOrders();
  };

  const route = useMemo(() => {
    if (!selectedOrderId) return null;
    const order = enrichedOrders.find(o => o.id === selectedOrderId);
    if (!order?.pickup_lat || !order?.delivery_lat) return null;
    return {
      pickup: { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) },
      destination: { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) },
    };
  }, [selectedOrderId]);

  // Enrich with distance/ETA
  const enrichedOrders = useMemo(() => {
    return pendingOrders.map(order => {
      let distKm: number | null = null;
      let etaMin: number | null = null;
      if (driverLocation && order.pickup_lat != null) {
        distKm = Math.round(haversineKm(driverLocation, { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) }) * 10) / 10;
        etaMin = Math.max(1, Math.round(distKm * 2.5));
      }
      return { ...order, distKm, etaMin };
    }).filter(o => o.distKm === null || o.distKm <= MAX_RADIUS_KM)
      .sort((a, b) => (a.distKm ?? 999) - (b.distKm ?? 999));
  }, [pendingOrders, driverLocation]);

  const cityName = driverLocation ? detectCity(driverLocation) : "جارٍ التحديد...";

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
          heatPoints={heatPoints}
        />

        {/* Radius indicator */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-card/90 backdrop-blur-md text-foreground px-4 py-1.5 rounded-full text-xs flex items-center gap-2 border border-border">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          نطاق البحث: {MAX_RADIUS_KM} كم — {cityName}
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
            onClick={() => navigate(`/driver/delivery/tracking?id=${activeOrder.id}`)}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
          >
            <div className="flex items-center gap-2">
              <Bike className="w-5 h-5 text-emerald-400 animate-pulse" />
              <div className="text-right">
                <p className="text-foreground font-bold text-sm">{activeOrder.store_name || "طلب توصيل نشط"}</p>
                <p className="text-muted-foreground text-xs">
                  {activeOrder.status === "driver_assigned" ? "في الطريق للمطعم" :
                   activeOrder.status === "picked_up" ? "في الطريق للزبون" : activeOrder.status}
                </p>
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
        <div className="shrink-0 max-h-[40vh] overflow-y-auto bg-background border-t border-border">
          {/* Today Stats Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-card/50 border-b border-border">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-muted-foreground">اليوم:</span>
                <span className="font-bold text-foreground">{todayStats.deliveries}</span>
              </div>
              <div className="flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-primary" />
                <span className="font-bold text-foreground">{todayStats.earnings} DH</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-foreground">{driverRating > 0 ? driverRating.toFixed(1) : "—"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs">
              {refCode && (
                <span className="font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-full font-bold">{refCode}</span>
              )}
            </div>
          </div>

          {enrichedOrders.length === 0 ? (
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full font-bold">0 طلب</span>
                <h3 className="font-bold text-foreground text-sm flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-pulse" />
                  طلبات توصيل جديدة
                </h3>
              </div>
              <div className="rounded-xl border border-border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right text-xs font-bold">Reference</TableHead>
                      <TableHead className="text-right text-xs font-bold">⭐</TableHead>
                      <TableHead className="text-right text-xs font-bold">المتجر</TableHead>
                      <TableHead className="text-right text-xs font-bold">المسافة</TableHead>
                      <TableHead className="text-right text-xs font-bold">الوقت</TableHead>
                      <TableHead className="text-right text-xs font-bold">الثمن</TableHead>
                      <TableHead className="text-center text-xs font-bold">قبول</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-6">
                        <div className="flex flex-col items-center gap-1">
                          <Radar className="w-6 h-6 text-muted-foreground/30 animate-pulse" />
                          <p className="text-muted-foreground text-xs">في انتظار طلبات جديدة...</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
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
                      <TableHead className="text-right text-xs font-bold">Reference</TableHead>
                      <TableHead className="text-right text-xs font-bold">⭐</TableHead>
                      <TableHead className="text-right text-xs font-bold">المتجر</TableHead>
                      <TableHead className="text-center text-xs font-bold">📞</TableHead>
                      <TableHead className="text-right text-xs font-bold">المسافة</TableHead>
                      <TableHead className="text-right text-xs font-bold">الوقت</TableHead>
                      <TableHead className="text-right text-xs font-bold">الثمن</TableHead>
                      <TableHead className="text-center text-xs font-bold">قبول</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrichedOrders.map((order) => {
                      const isSelected = selectedOrderId === order.id;
                      return (
                        <TableRow
                          key={order.id}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-muted/50" : ""}`}
                          onClick={() => setSelectedOrderId(order.id === selectedOrderId ? null : order.id)}
                        >
                          <TableCell className="font-mono text-xs font-semibold text-primary">
                            {order.customer_reference || order.order_code || order.id.slice(0, 6).toUpperCase()}
                          </TableCell>
                          <TableCell className="text-right text-xs text-amber-400">
                            {order.customer_rating ? `${"★".repeat(Math.min(Math.round(order.customer_rating), 5))}` : "—"}
                          </TableCell>
                          <TableCell className="text-right text-xs text-foreground truncate max-w-[100px]">
                            {order.store_name || "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {(order as any).store_phone ? (
                              <button
                                onClick={(e) => { e.stopPropagation(); window.open(`tel:${(order as any).store_phone}`); }}
                                className="w-7 h-7 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 flex items-center justify-center mx-auto transition-colors"
                                title={`اتصل بالمطعم: ${(order as any).store_phone}`}
                              >
                                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                              </button>
                            ) : <span className="text-muted-foreground/40 text-xs">—</span>}
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
                              onClick={(e) => {
                                e.stopPropagation();
                                acceptOrder(order.id);
                              }}
                              disabled={accepting === order.id}
                            >
                              {accepting === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "قبول"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
