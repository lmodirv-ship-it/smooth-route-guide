import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Crown, Star, Package, Loader2, Check, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import PaymentMethodPicker, { PaymentMethod } from "@/components/PaymentMethodPicker";

const StoreSubscription = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPkg, setSelectedPkg] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [walletBalance, setWalletBalance] = useState(0);
  const [subscribing, setSubscribing] = useState(false);
  const [stars, setStars] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load wallet balance
      const { data: wallet } = await supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle();
      setWalletBalance(wallet?.balance || 0);

      // Load stars
      const { data: starData } = await supabase.from("reward_stars").select("stars, level").eq("user_id", user.id).maybeSingle();
      setStars(starData?.stars || 0);

      // Load customer packages (store type)
      const { data: pkgs } = await supabase.from("customer_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      setPackages(pkgs || []);
      setLoading(false);
    };
    load();
  }, []);

  const handlePaymentComplete = async (method: PaymentMethod, transactionId?: string) => {
    if (!selectedPkg) return;
    setSubscribing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("يجب تسجيل الدخول");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + selectedPkg.duration_days);

      const { error } = await supabase.from("customer_subscriptions").insert({
        user_id: user.id,
        package_id: selectedPkg.id,
        subscription_type: "store",
        status: method === "wallet" ? "active" : "pending",
        starts_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        payment_method: method,
        amount_paid: selectedPkg.price,
        credits_total: selectedPkg.credits || 0,
        credits_remaining: selectedPkg.credits || 0,
      });

      if (error) throw error;

      // Grant stars
      const newStars = stars + 10;
      await supabase.from("reward_stars").upsert({
        user_id: user.id,
        stars: newStars,
        total_earned: newStars,
      }, { onConflict: "user_id" });

      await supabase.from("star_history").insert({
        user_id: user.id,
        stars_change: 10,
        reason: `اشتراك في باقة ${selectedPkg.name_ar}`,
        granted_by: user.id,
      });

      toast({ title: "✅ تم الاشتراك بنجاح!", description: `+10 نجوم مكافأة ⭐` });
      setSelectedPkg(null);
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) return <div className="min-h-screen gradient-dark flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="min-h-screen gradient-dark pb-8" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-secondary">
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </button>
        <span className="font-bold text-foreground text-lg">الباقات والاشتراكات</span>
        <div className="w-9" />
      </div>

      {/* Stars badge */}
      <div className="mx-4 mt-4 glass-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
          <span className="text-2xl font-bold text-foreground">{stars}</span>
          <span className="text-sm text-muted-foreground">نجمة</span>
        </div>
        <p className="text-sm text-muted-foreground">اكسب نجوم مع كل اشتراك!</p>
      </div>

      <div className="px-4 mt-6">
        <h2 className="text-foreground font-bold text-lg mb-4 flex items-center gap-2">
          <Crown className="w-5 h-5 text-warning" />
          اختر باقتك
        </h2>

        <div className="space-y-4">
          {packages.map((pkg, i) => {
            const discount = pkg.original_price && pkg.original_price > pkg.price
              ? Math.round(((pkg.original_price - pkg.price) / pkg.original_price) * 100)
              : 0;

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative rounded-2xl p-5 border transition-all overflow-hidden ${
                  pkg.is_featured ? "glass-card-gold" : "gradient-card"
                }`}
              >
                {pkg.is_featured && (
                  <div className="absolute -top-3 right-4 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-xs px-4 py-1 rounded-full">
                    ⭐ الأكثر شعبية
                  </div>
                )}
                {discount > 0 && (
                  <div className="absolute -top-3 left-4 bg-red-500 text-white font-bold text-xs px-3 py-1 rounded-full">
                    خصم {discount}%
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
                  {pkg.credits && (
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span>{pkg.credits} رصيد</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>+10 نجوم</span>
                  </div>
                </div>

                <Button
                  onClick={() => setSelectedPkg(selectedPkg?.id === pkg.id ? null : pkg)}
                  className={`w-full h-12 rounded-xl font-bold text-base ${
                    pkg.is_featured
                      ? "bg-gradient-to-r from-amber-500 to-primary text-primary-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {selectedPkg?.id === pkg.id ? "إلغاء" : "اشترك الآن"}
                </Button>

                {selectedPkg?.id === pkg.id && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-4 pt-4 border-t border-border">
                    <PaymentMethodPicker
                      selected={paymentMethod}
                      onChange={setPaymentMethod}
                      walletBalance={walletBalance}
                      amount={pkg.price}
                      onPaymentComplete={handlePaymentComplete}
                      loading={subscribing}
                      referenceType="store_subscription"
                    />
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>

        {packages.length === 0 && (
          <p className="text-center text-muted-foreground py-8">لا توجد باقات متاحة حالياً</p>
        )}

        <div className="mt-6 p-4 rounded-xl glass-card">
          <p className="text-muted-foreground text-sm text-center mb-3">💳 طرق الدفع المدعومة</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" />💵 نقداً — الدفع عند التأكيد</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" />👛 المحفظة — خصم فوري</li>
            <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" />💎 PayPal — دفع إلكتروني آمن</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StoreSubscription;
