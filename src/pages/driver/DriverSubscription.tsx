import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Check, Crown, Shield, Sparkles, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDriverSubscription, useDriverPackages } from "@/hooks/useDriverSubscription";
import PaymentMethodPicker, { PaymentMethod } from "@/components/PaymentMethodPicker";

const DriverSubscription = () => {
  const navigate = useNavigate();
  const { activeSubscription, daysLeft, isExpired } = useDriverSubscription();
  const { packages, loading } = useDriverPackages();
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [walletBalance, setWalletBalance] = useState(0);
  const [subscribing, setSubscribing] = useState<string | null>(null);

  useEffect(() => {
    const loadWallet = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: wallet } = await supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle();
      setWalletBalance(wallet?.balance || 0);
    };
    loadWallet();
  }, []);

  const handlePaymentComplete = async (method: PaymentMethod, transactionId?: string) => {
    if (!selectedPkg) return;
    setSubscribing(selectedPkg.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول");

      const { data: driver } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!driver) throw new Error("لم يتم العثور على حساب السائق");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedPkg.duration_days);

      const paymentStatus = method === "wallet" ? "completed" : method === "paypal" ? "pending" : "pending";

      const { error } = await supabase.from("driver_subscriptions").insert({
        driver_id: driver.id,
        package_id: selectedPkg.id,
        user_id: user.id,
        status: paymentStatus === "completed" ? "active" : "pending",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        payment_method: method,
        payment_status: paymentStatus,
        amount_paid: selectedPkg.price,
      });

      if (error) throw error;
      toast({ title: "تم الاشتراك بنجاح! ✅", description: `باقة ${selectedPkg.name_ar} - ${selectedPkg.duration_days} يوم` });
      setSelectedPkg(null);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubscribing(null);
    }
  };
  const discount = (pkg: any) => {
    if (!pkg.original_price || pkg.original_price <= pkg.price) return 0;
    return Math.round(((pkg.original_price - pkg.price) / pkg.original_price) * 100);
  };

  return (
    <div className="min-h-screen gradient-dark pb-8" dir="rtl">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="font-bold text-foreground text-lg">الباقات والاشتراكات</span>
        <div className="w-9" />
      </div>

      {/* Active Subscription */}
      {!isExpired && activeSubscription && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mt-4 p-4 rounded-2xl glass-card-green"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-emerald-400 font-bold">{activeSubscription.package_name}</p>
              <p className="text-muted-foreground text-xs">اشتراك نشط</p>
            </div>
          </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="glass-card rounded-xl p-3 text-center">
                <Timer className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                <p className="text-foreground font-bold text-lg">{daysLeft}</p>
                <p className="text-muted-foreground text-[11px]">يوم متبقي</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
                <p className="text-foreground font-bold text-lg">{activeSubscription.orders_used}</p>
                <p className="text-muted-foreground text-[11px]">طلب منجز</p>
              </div>
          </div>
        </motion.div>
      )}

      {/* Warning if expired */}
      {isExpired && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mx-4 mt-4 p-4 rounded-2xl glass-card-red text-center"
        >
          <Sparkles className="w-8 h-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-bold mb-1">لا يوجد اشتراك نشط</p>
          <p className="text-muted-foreground text-sm">اشترك الآن لتتمكن من قبول الطلبات</p>
        </motion.div>
      )}

      {/* Packages */}
      <div className="px-4 mt-6">
        <h2 className="text-foreground font-bold text-lg mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-warning" />
          اختر باقتك
        </h2>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg, i) => (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-5 border transition-all overflow-hidden ${
                  pkg.is_featured
                    ? "glass-card-gold"
                    : "gradient-card"
                }`}
              >
                {pkg.is_featured && (
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-xs px-4 py-1 rounded-full">
                    ⭐ الأكثر شعبية
                  </div>
                )}

                {discount(pkg) > 0 && (
                  <div className="absolute -top-3 left-4 bg-red-500 text-white font-bold text-xs px-3 py-1 rounded-full">
                    خصم {discount(pkg)}%
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-foreground font-bold text-lg">{pkg.name_ar}</h3>
                    <p className="text-muted-foreground text-sm">{pkg.description_ar || `${pkg.duration_days} يوم`}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-foreground font-bold text-2xl">{pkg.price} <span className="text-sm text-muted-foreground">DH</span></p>
                    {pkg.original_price && pkg.original_price > pkg.price && (
                      <p className="text-muted-foreground text-sm line-through">{pkg.original_price} DH</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Timer className="w-4 h-4" />
                    <span>{pkg.duration_days} يوم</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>طلبات غير محدودة</span>
                  </div>
                </div>

                <Button
                  onClick={() => handleSubscribe(pkg)}
                  disabled={subscribing === pkg.id}
                    className={`w-full h-12 rounded-xl font-bold text-base ${
                    pkg.is_featured
                      ? "bg-gradient-to-r from-amber-500 to-primary text-primary-foreground hover:from-amber-600 hover:to-primary/90"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {subscribing === pkg.id ? "جاري الاشتراك..." : "اشترك الآن"}
                </Button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="mt-6 p-4 rounded-xl glass-card">
          <p className="text-muted-foreground text-sm text-center mb-3">🎁 الشهر الأول مجاني لجميع السائقين الجدد</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" />طلبات غير محدودة خلال فترة الاشتراك</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" />دعم فني على مدار الساعة</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" />أولوية في توزيع الطلبات</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" />تقارير الأرباح التفصيلية</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DriverSubscription;
