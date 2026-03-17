import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Minus, Plus, Trash2, ShoppingBag, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/lib/firestoreClient";
import { toast } from "@/hooks/use-toast";

const Cart = () => {
  const navigate = useNavigate();
  const { items, storeName, storeId, totalPrice, updateQuantity, removeItem, clearCart } = useCart();
  const [submitting, setSubmitting] = useState(false);

  const deliveryFee = 10;
  const grandTotal = totalPrice + deliveryFee;

  const handleOrder = async () => {
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
        navigate("/login?role=delivery");
        return;
      }

      // Create delivery order
      const { data: order, error: orderErr } = await supabase
        .from("delivery_orders")
        .insert({
          user_id: user.id,
          category: "restaurant",
          store_name: storeName || "",
          status: "pending",
          estimated_price: grandTotal,
          delivery_type: "standard",
          items: items.map((i) => ({ name: i.name, qty: i.quantity, price: i.price })),
        })
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
      toast({ title: "تم إرسال طلبك بنجاح ✅", description: `المجموع: ${grandTotal} DH` });
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
    <div className="min-h-screen delivery-bg pb-40" dir="rtl">
      {/* Header */}
      <div className="bg-card border-b border-border px-5 py-4 flex items-center gap-3">
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
            className="bg-card rounded-2xl border border-border p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-foreground text-sm">{item.name}</h3>
                <p className="text-xs text-primary font-bold mt-1">{item.price} DH</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-secondary rounded-xl px-2 py-1">
                  <button onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)} className="w-7 h-7 rounded-lg bg-card flex items-center justify-center">
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

      {/* Summary */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border p-5 space-y-3 z-50">
        <div className="flex justify-between text-sm">
          <span className="text-foreground font-bold">{totalPrice.toFixed(0)} DH</span>
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
