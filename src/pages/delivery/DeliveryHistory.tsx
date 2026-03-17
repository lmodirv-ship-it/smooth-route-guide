import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Package, Clock } from "lucide-react";
import { supabase } from "@/lib/firestoreClient";
import { motion } from "framer-motion";

const DeliveryHistory = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("delivery_orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setOrders(data || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return (
    <div className="min-h-screen delivery-bg px-5 pt-6 pb-10" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate("/delivery")} className="p-2 rounded-xl bg-secondary">
          <ArrowRight className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">سجل التوصيلات</h1>
        <div className="w-9" />
      </div>

      {loading ? (
        <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد طلبات سابقة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o, i) => (
            <motion.div
              key={o.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  o.status === "delivered" ? "bg-success/10 text-success" : "bg-primary/10 text-primary"
                }`}>{o.status}</span>
                <h3 className="font-bold text-foreground">{o.store_name || o.category}</h3>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {new Date(o.created_at).toLocaleDateString("ar")}
              </div>
              {o.estimated_price && (
                <p className="text-sm font-bold text-primary mt-1">{o.estimated_price} DH</p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryHistory;
