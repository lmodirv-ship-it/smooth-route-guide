import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Minus, Plus, Trash2, ShoppingBag, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useDeliveryPricingSettings } from "@/hooks/useDeliveryPricingSettings";
import { trackEvent } from "@/components/TrackingScripts";

const Cart = () => {
  const navigate = useNavigate();
  const { items, storeName, storeId, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [city, setCity] = useState("Tanger");
  const [store, setStore] = useState<any>(null);
  const deliveryPricing = useDeliveryPricingSettings();

  // Fetch store info for pickup coordinates
  useEffect(() => {
    if (!storeId) return;
    supabase.from("stores").select("*").eq("id", storeId).single().then(({ data }) => {
      if (data) setStore(data);
    });
  }, [storeId]);

  // Get customer location
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setCustomerLat(pos.coords.latitude);
        setCustomerLng(pos.coords.longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=ar`
          );
          const geo = await res.json();
          const detectedCity = geo?.address?.city || geo?.address?.town || geo?.address?.state || "Tanger";
          setCity(detectedCity);
          if (!deliveryAddress && geo?.display_name) {
            setDeliveryAddress(geo.display_name.split(",").slice(0, 3).join(","));
          }
        } catch { /* keep defaults */ }
      },
      () => {},
      { timeout: 8000 }
    );
  }, []);

  // Calculate distance between store and customer (Haversine)
  const distanceKm = (() => {
    if (!store?.lat || !store?.lng || !customerLat || !customerLng) return 0;
    const R = 6371;
    const dLat = (customerLat - Number(store.lat)) * Math.PI / 180;
    const dLng = (customerLng - Number(store.lng)) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(Number(store.lat) * Math.PI / 180) * Math.cos(customerLat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  })();

  const subtotal = totalPrice;
  const deliveryFee = deliveryPricing.loading ? (store?.delivery_fee || 10) : deliveryPricing.calculateFee(distanceKm);
  const grandTotal = subtotal + deliveryFee;

  const handleOrder = async () => {
    // Address is auto-detected by GPS; manual input is optional
    const finalAddress = deliveryAddress.trim() || "موقع GPS";

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
        navigate("/login?role=delivery");
        return;
      }

      // Create delivery order with full data
      const { data: order, error: orderErr } = await supabase
        .from("delivery_orders")
        .insert({
          user_id: user.id,
          category: "restaurant",
          store_name: storeName || "",
          store_id: storeId || null,
          status: "pending",
          estimated_price: grandTotal,
          subtotal: subtotal,
          delivery_fee: deliveryFee,
          total_price: grandTotal,
          delivery_type: "standard",
          delivery_address: finalAddress,
          delivery_lat: customerLat,
          delivery_lng: customerLng,
          pickup_address: store?.address || "",
          pickup_lat: store?.lat || null,
          pickup_lng: store?.lng || null,
          city: city,
          notes: notes || "",
          items: items.map((i) => ({
            name: i.name,
            qty: i.quantity,
            price: i.price,
            menuItemId: i.menuItemId,
          })),
        } as any)
        .select("id")
        .single();

      if (orderErr) throw orderErr;

      // Create order items
      const orderItems = items.map((i) => ({
        order_id: order.id,
        menu_item_id: i.menuItemId,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: i.price * i.quantity,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      clearCart();
      trackEvent("purchase", { value: grandTotal, currency: "MAD", transaction_id: order.id, items: items.length });
      toast({
        title: "تم إرسال طلبك بنجاح ✅",
        description: `المجموع: ${grandTotal} DH — سيتم تأكيد الطلب من مركز الاتصال`,
      });
      navigate(`/delivery/order/${order.id}`);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen delivery-bg flex flex-col items-center justify-center gap-4" dir="rtl">
        <ShoppingBag className="w-16 h-16 text-muted-foreground/30" />
        <p className="text-lg font-bold text-muted-foreground">السلة فارغة</p>
        <Button onClick={() => navigate("/delivery/restaurants")} variant="outline" className="rounded-xl">
          تصفح المطاعم
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen delivery-bg pb-72" dir="rtl">
      {/* Header */}
      <div className="glass-card border-b border-border px-5 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-secondary">
          <ArrowRight className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="font-bold text-foreground text-lg">سلة الطلبات</h1>
          <p className="text-xs text-muted-foreground">{storeName}</p>
        </div>
      </div>

      {/* Items */}
      <div className="px-5 mt-4 space-y-3">
        {items.map((item, i) => (
          <motion.div
            key={item.menuItemId}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                <p className="text-xs text-primary font-bold mt-1">{item.price} DH</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-2 py-1">
                  <button onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)} className="w-7 h-7 rounded-lg glass-card flex items-center justify-center">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold min-w-[20px] text-center">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)} className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-primary-foreground" />
                  </button>
                </div>
                <button onClick={() => removeItem(item.menuItemId)} className="p-2 rounded-lg text-destructive hover:bg-destructive/10">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="text-left mt-1">
              <span className="text-xs font-bold text-foreground">{(item.price * item.quantity).toFixed(0)} DH</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Delivery Address */}
      <div className="px-5 mt-4 space-y-3">
        <div className="glass-card rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="font-bold text-foreground text-sm">عنوان التوصيل</h3>
            </div>
            {customerLat && customerLng && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                تم تحديد موقعك بـ GPS
              </span>
            )}
          </div>
          <Input
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="يتم تحديد العنوان تلقائياً بـ GPS — يمكنك تعديله (اختياري)"
            className="bg-secondary/60 border-border rounded-xl text-right"
          />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="ملاحظات إضافية (اختياري)..."
            className="bg-secondary/60 border-border rounded-xl text-right min-h-[60px]"
          />
          <p className="text-[11px] text-muted-foreground">📍 المدينة: {city}</p>
        </div>
      </div>

      {/* Summary */}
      <div className="fixed bottom-0 left-0 right-0 glass-card border-t border-border p-5 space-y-3 z-50">
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-bold">{subtotal.toFixed(0)} DH</span>
          <span className="text-muted-foreground">المنتجات</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-bold">{deliveryFee} DH</span>
          <span className="text-muted-foreground">التوصيل</span>
        </div>
        <div className="h-px bg-border" />
        <div className="flex justify-between text-base font-bold">
          <span className="text-primary">{grandTotal.toFixed(0)} DH</span>
          <span className="text-foreground">المجموع</span>
        </div>
        <Button
          onClick={handleOrder}
          disabled={submitting}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "تأكيد الطلب"}
        </Button>
      </div>
    </div>
  );
};

export default Cart;
