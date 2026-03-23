import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, Loader2, CheckCircle, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import LeafletMap from "@/components/LeafletMap";

const DEFAULT_LOCATION = { lat: 35.7595, lng: -5.834 };
const PRICE_PER_KM = 3;
const BASE_FARE = 5;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

interface RideRow {
  id: string;
  pickup: string;
  destination: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  destination_lat: number | null;
  destination_lng: number | null;
  distance: number | null;
  price: number | null;
  status: string;
  created_at: string;
}

const DriverPage = () => {
  const navigate = useNavigate();
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [orders, setOrders] = useState<RideRow[]>([]);
  const [accepting, setAccepting] = useState<string | null>(null);

  // GPS
  useEffect(() => {
    if (!navigator.geolocation) {
      setDriverLocation(DEFAULT_LOCATION);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setDriverLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setDriverLocation(DEFAULT_LOCATION),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Fetch pending orders
  const fetchOrders = useCallback(async () => {
    const { data, error } = await supabase
      .from("ride_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data as RideRow[]);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    // Realtime subscription
    const channel = supabase
      .channel("driver-ride-requests")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  // Compute distance from driver to pickup for each order
  const ordersWithMeta = orders.map((order) => {
    let distToPickup: number | null = null;
    let eta: number | null = null;
    let totalDistance = order.distance;
    let totalPrice = order.price;

    if (driverLocation && order.pickup_lat && order.pickup_lng) {
      distToPickup = parseFloat(haversineKm(driverLocation, { lat: order.pickup_lat, lng: order.pickup_lng }).toFixed(1));
      eta = Math.max(2, Math.round(distToPickup * 2.5));
    }

    // Recalculate distance/price if missing
    if (!totalDistance && order.pickup_lat && order.pickup_lng && order.destination_lat && order.destination_lng) {
      totalDistance = parseFloat(
        haversineKm(
          { lat: order.pickup_lat, lng: order.pickup_lng },
          { lat: order.destination_lat, lng: order.destination_lng }
        ).toFixed(2)
      );
      totalPrice = Math.round(BASE_FARE + totalDistance * PRICE_PER_KM);
    }

    return { ...order, distToPickup, eta, totalDistance, totalPrice };
  });

  const handleAccept = async (orderId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "يجب تسجيل الدخول", variant: "destructive" });
      return;
    }

    setAccepting(orderId);
    try {
      const { error } = await supabase
        .from("ride_requests")
        .update({
          status: "accepted",
          driver_id: user.id,
          accepted_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .eq("status", "pending");

      if (error) throw error;
      toast({ title: "تم قبول الطلب ✅" });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setAccepting(null);
    }
  };

  return (
    <div className="min-h-screen driver-bg pb-8" dir="rtl">
      {/* Header */}
      <div className="driver-header sticky top-0 z-50 px-4 py-4 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Car className="w-6 h-6 text-emerald-400" />
          <span className="font-bold text-xl text-white">سائق</span>
        </div>
      </div>

      {/* Map */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-emerald-500/20 h-48 relative">
        <LeafletMap
          center={driverLocation || DEFAULT_LOCATION}
          zoom={14}
          showMarker
          driverLocation={driverLocation}
        />
        <div className="absolute top-3 right-3 z-[1000] bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border border-emerald-500/30 backdrop-blur-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          متصل — في انتظار الطلبات
        </div>
      </div>

      {/* Orders Table */}
      <div className="px-4 mt-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between mb-4">
            <span className="bg-emerald-500/20 text-emerald-300 text-xs px-3 py-1 rounded-full border border-emerald-500/20">
              {ordersWithMeta.length} طلب
            </span>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <Navigation className="w-5 h-5 text-emerald-400" />
              الطلبات المتاحة
            </h2>
          </div>

          {ordersWithMeta.length === 0 ? (
            <div className="driver-card rounded-2xl p-8 border border-emerald-500/10 text-center">
              <Car className="w-14 h-14 mx-auto mb-3 text-emerald-500/20" />
              <p className="text-emerald-200/70 font-medium">لا توجد طلبات حالياً</p>
              <p className="text-emerald-300/40 text-sm mt-1">ستظهر الطلبات الجديدة هنا تلقائياً</p>
            </div>
          ) : (
            <div className="driver-card rounded-2xl border border-emerald-500/15 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-emerald-500/10 hover:bg-transparent">
                    <TableHead className="text-right text-xs font-bold text-emerald-300/70">#</TableHead>
                    <TableHead className="text-right text-xs font-bold text-emerald-300/70">الانطلاق</TableHead>
                    <TableHead className="text-right text-xs font-bold text-emerald-300/70">الوجهة</TableHead>
                    <TableHead className="text-center text-xs font-bold text-emerald-300/70">المسافة</TableHead>
                    <TableHead className="text-center text-xs font-bold text-emerald-300/70">السعر</TableHead>
                    <TableHead className="text-center text-xs font-bold text-emerald-300/70">إجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence>
                    {ordersWithMeta.map((order, idx) => (
                      <motion.tr
                        key={order.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: idx * 0.05 }}
                        className="border-emerald-500/10 hover:bg-emerald-500/5 transition-colors"
                      >
                        <TableCell className="py-3 text-right">
                          <span className="text-xs text-emerald-400 font-mono">
                            {order.id.slice(0, 6)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <p className="text-sm text-white truncate max-w-[100px]">
                            {order.pickup || "—"}
                          </p>
                          {order.distToPickup != null && (
                            <p className="text-xs text-emerald-400/60">{order.distToPickup} كم منك</p>
                          )}
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <p className="text-sm text-white truncate max-w-[100px]">
                            {order.destination || "—"}
                          </p>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <span className="text-sm font-bold text-emerald-300">
                            {order.totalDistance ? `${order.totalDistance} كم` : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <span className="text-sm font-bold text-emerald-400">
                            {order.totalPrice ? `${order.totalPrice} DH` : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          <Button
                            size="sm"
                            onClick={() => handleAccept(order.id)}
                            disabled={accepting === order.id}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 rounded-lg shadow-[0_0_10px_hsl(155,60%,40%,0.3)]"
                          >
                            {accepting === order.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="w-3 h-3 ml-1" />
                                قبول
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DriverPage;
