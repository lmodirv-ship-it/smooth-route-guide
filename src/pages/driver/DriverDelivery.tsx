import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Phone, Clock, CheckCircle, Navigation, Store, Package,
  ArrowRight, XCircle, User, Bike, MessageCircle, ChefHat
} from "lucide-react";
import { Button } from "@/components/ui/button";
import GoogleMapWrapper from "@/components/GoogleMap";
import { useDriverGeolocation } from "@/hooks/useDriverGeolocation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import logo from "@/assets/hn-driver-logo.png";

// ── Types ──
interface DeliveryOrder {
  id: string;
  store_name: string;
  pickup_address: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  delivery_address: string;
  delivery_lat: number | null;
  delivery_lng: number | null;
  estimated_price: number;
  items: any[];
  status: string;
  category: string;
  created_at: string;
  user_id: string;
}

type Stage = "idle" | "new_request" | "to_restaurant" | "at_restaurant" | "delivering";

const DriverDelivery = () => {
  const navigate = useNavigate();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [customerInfo, setCustomerInfo] = useState<{ name: string; phone: string } | null>(null);
  const { location: driverLocation } = useDriverGeolocation(true);

  // Fetch driver ID
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: driver } = await supabase.from("drivers").select("id").eq("user_id", user.id).maybeSingle();
      if (driver) setDriverId(driver.id);
    };
    init();
  }, []);

  // Listen for assigned orders
  useEffect(() => {
    if (!driverId) return;

    const fetchAssigned = async () => {
      // Check for active orders (driver_assigned, picked_up, in_transit)
      const { data } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("driver_id", driverId)
        .in("status", ["driver_assigned", "picked_up", "in_transit"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        setOrder(data as DeliveryOrder);
        if (data.status === "in_transit") {
          setStage("delivering");
          fetchCustomer(data.user_id);
        } else if (data.status === "picked_up") {
          setStage("delivering");
          fetchCustomer(data.user_id);
        } else if (data.status === "driver_assigned") {
          setStage("new_request");
        }
      } else {
        setOrder(null);
        setStage("idle");
      }
    };

    fetchAssigned();

    const channel = supabase
      .channel("driver-delivery-rt")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "delivery_orders",
        filter: `driver_id=eq.${driverId}`,
      }, (payload) => {
        const newOrder = payload.new as DeliveryOrder;
        if (newOrder.status === "cancelled" || newOrder.status === "delivered") {
          setOrder(null);
          setStage("idle");
          setCustomerInfo(null);
        } else {
          setOrder(newOrder);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [driverId]);

  const fetchCustomer = useCallback(async (userId: string) => {
    const { data } = await supabase.from("profiles").select("name, phone").eq("id", userId).single();
    if (data) setCustomerInfo(data);
  }, []);

  // ── Actions ──
  const acceptOrder = async () => {
    if (!order) return;
    // Mark as accepted by updating status
    await supabase.from("delivery_orders").update({
      status: "picked_up",
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    setStage("to_restaurant");
    toast({ title: "تم قبول الطلب ✅" });
  };

  const rejectOrder = async () => {
    if (!order) return;
    await supabase.from("delivery_orders").update({ driver_id: null, status: "confirmed", updated_at: new Date().toISOString() }).eq("id", order.id);
    setOrder(null);
    setStage("idle");
    toast({ title: "تم رفض الطلب" });
  };

  const arrivedAtRestaurant = async () => {
    if (!order) return;
    setStage("at_restaurant");
    toast({ title: "تم تسجيل وصولك للمطعم 📍" });
  };

  const pickedUp = async () => {
    if (!order) return;
    await supabase.from("delivery_orders").update({
      status: "in_transit",
      picked_up_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    setStage("delivering");
    await fetchCustomer(order.user_id);
    toast({ title: "تم الاستلام! متجه للزبون 🚀" });
  };

  const delivered = async () => {
    if (!order) return;
    await supabase.from("delivery_orders").update({
      status: "delivered",
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", order.id);
    toast({ title: "تم التسليم بنجاح! 🎉" });
    setOrder(null);
    setStage("idle");
    setCustomerInfo(null);
  };

  // ── Map destinations ──
  const mapCenter = useMemo(() => {
    if (stage === "delivering" && order?.delivery_lat && order?.delivery_lng) {
      return { lat: Number(order.delivery_lat), lng: Number(order.delivery_lng) };
    }
    if ((stage === "to_restaurant" || stage === "at_restaurant") && order?.pickup_lat && order?.pickup_lng) {
      return { lat: Number(order.pickup_lat), lng: Number(order.pickup_lng) };
    }
    return driverLocation || undefined;
  }, [stage, order, driverLocation]);

  // ── Render ──
  return (
    <div className="min-h-screen gradient-dark pb-6" dir="rtl">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate("/driver")} className="p-2">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <img src={logo} alt="HN" className="w-7 h-7" />
          <span className="font-bold text-gradient-primary text-lg">التوصيل</span>
        </div>
        <div className="w-9" />
      </div>

      {/* Map */}
      <div className="mx-4 mt-4 rounded-2xl overflow-hidden border border-border h-56 relative">
        <GoogleMapWrapper
          zoom={15}
          center={mapCenter}
          driverLocation={driverLocation}
          panToDriver={stage === "idle"}
          showMarker={false}
        >
          {/* Stage indicator on map */}
          <div className="absolute top-3 right-3 z-10">
            {stage === "to_restaurant" && (
              <div className="flex items-center gap-1.5 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm">
                <Store className="w-3.5 h-3.5" />متجه للمطعم
              </div>
            )}
            {stage === "at_restaurant" && (
              <div className="flex items-center gap-1.5 bg-amber-500/90 text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm">
                <ChefHat className="w-3.5 h-3.5" />في المطعم
              </div>
            )}
            {stage === "delivering" && (
              <div className="flex items-center gap-1.5 bg-emerald-500/90 text-white px-3 py-1.5 rounded-full text-xs font-bold backdrop-blur-sm">
                <Bike className="w-3.5 h-3.5" />متجه للزبون
              </div>
            )}
          </div>
        </GoogleMapWrapper>
      </div>

      {/* Content Area */}
      <div className="px-4 mt-4">
        <AnimatePresence mode="wait">
          {/* ── IDLE ── */}
          {stage === "idle" && (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="text-center py-12">
              <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-lg font-bold text-muted-foreground">بانتظار طلبات التوصيل</p>
              <p className="text-sm text-muted-foreground/60 mt-1">سيتم إعلامك عند تعيين طلب جديد</p>
            </motion.div>
          )}

          {/* ── NEW REQUEST ── */}
          {stage === "new_request" && order && (
            <motion.div key="new_request" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
              <div className="bg-card rounded-2xl border-2 border-primary/50 p-5 shadow-lg shadow-primary/10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-sm font-bold text-primary">طلب توصيل جديد</span>
                </div>

                {/* Restaurant Info */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">🍽️</div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{order.store_name}</h2>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />{order.pickup_address || "عنوان المطعم"}
                    </p>
                  </div>
                </div>

                {/* Items */}
                {order.items && Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="bg-secondary/30 rounded-xl p-3 mb-4">
                    <p className="text-xs font-bold text-muted-foreground mb-2">المنتجات:</p>
                    {(order.items as any[]).map((item: any, i: number) => (
                      <p key={i} className="text-xs text-foreground">{item.name} × {item.qty}</p>
                    ))}
                  </div>
                )}

                {/* Price & Time */}
                <div className="flex items-center justify-between mb-5 bg-secondary/30 rounded-xl p-3">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    ~15 دقيقة
                  </div>
                  <span className="text-lg font-bold text-primary">{order.estimated_price} DH</span>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button onClick={rejectOrder} variant="outline" className="flex-1 h-12 rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 gap-1">
                    <XCircle className="w-5 h-5" />رفض
                  </Button>
                  <Button onClick={acceptOrder} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold gap-1">
                    <CheckCircle className="w-5 h-5" />قبول
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── TO RESTAURANT ── */}
          {stage === "to_restaurant" && order && (
            <motion.div key="to_restaurant" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Navigation className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">متجه إلى المطعم</p>
                    <p className="text-xs text-muted-foreground">اذهب لاستلام الطلب</p>
                  </div>
                </div>

                {/* Restaurant Details */}
                <div className="bg-secondary/30 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg flex-shrink-0">🍽️</div>
                    <div>
                      <h3 className="font-bold text-foreground">{order.store_name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />{order.pickup_address || "—"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Items */}
                {order.items && Array.isArray(order.items) && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-muted-foreground mb-2">محتوى الطلب:</p>
                    <div className="bg-secondary/20 rounded-lg p-3 space-y-1">
                      {(order.items as any[]).map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{item.price * item.qty} DH</span>
                          <span className="text-foreground">{item.name} × {item.qty}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Hidden customer info notice */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-500">معلومات الزبون ستظهر بعد استلام الطلب من المطعم</p>
                </div>

                {/* Navigate button */}
                {order.pickup_lat && order.pickup_lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${order.pickup_lat},${order.pickup_lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-bold mb-3"
                  >
                    <Navigation className="w-4 h-4" />فتح الملاحة
                  </a>
                )}

                <Button onClick={arrivedAtRestaurant} className="w-full h-12 rounded-xl font-bold gap-1">
                  <Store className="w-5 h-5" />وصلت إلى المطعم
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── AT RESTAURANT ── */}
          {stage === "at_restaurant" && order && (
            <motion.div key="at_restaurant" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <ChefHat className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">في المطعم</p>
                    <p className="text-xs text-muted-foreground">استلم الطلب من {order.store_name}</p>
                  </div>
                </div>

                {/* Items checklist */}
                <div className="bg-secondary/30 rounded-xl p-4 mb-4">
                  <p className="text-xs font-bold text-muted-foreground mb-3">تأكد من استلام:</p>
                  {order.items && Array.isArray(order.items) && (
                    <div className="space-y-2">
                      {(order.items as any[]).map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <div className="w-5 h-5 rounded border border-primary/30 flex items-center justify-center">
                            <CheckCircle className="w-3.5 h-3.5 text-primary/50" />
                          </div>
                          <span className="text-foreground">{item.name} × {item.qty}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hidden customer info */}
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-500">بعد الضغط على "تم الاستلام" سيظهر موقع ورقم الزبون</p>
                </div>

                <Button onClick={pickedUp} className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold gap-2 text-base">
                  <Package className="w-5 h-5" />تم الاستلام
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── DELIVERING ── */}
          {stage === "delivering" && order && (
            <motion.div key="delivering" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
              <div className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Bike className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">متجه إلى الزبون</p>
                    <p className="text-xs text-muted-foreground">أوصل الطلب للعنوان أدناه</p>
                  </div>
                </div>

                {/* Customer Info - NOW VISIBLE */}
                {customerInfo && (
                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-2">
                        <a href={`tel:${customerInfo.phone}`}
                          className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Phone className="w-4 h-4 text-emerald-500" />
                        </a>
                        <a href={`https://wa.me/${customerInfo.phone?.replace(/[^0-9]/g, "")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-emerald-500" />
                        </a>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-foreground">{customerInfo.name}</p>
                        <p className="text-xs text-muted-foreground">{customerInfo.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <p className="text-xs text-foreground flex-1 text-right">{order.delivery_address || "—"}</p>
                      <MapPin className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    </div>
                  </div>
                )}

                {/* Navigate to customer */}
                {order.delivery_lat && order.delivery_lng && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-blue-600 text-white text-sm font-bold mb-3"
                  >
                    <Navigation className="w-4 h-4" />فتح الملاحة للزبون
                  </a>
                )}

                {/* Price */}
                <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3 mb-4">
                  <span className="text-xs text-muted-foreground">المجموع</span>
                  <span className="text-lg font-bold text-primary">{order.estimated_price} DH</span>
                </div>

                <Button onClick={delivered}
                  className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 text-base">
                  <CheckCircle className="w-5 h-5" />تم التسليم
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DriverDelivery;
