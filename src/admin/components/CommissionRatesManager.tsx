import { useState, useEffect } from "react";
import { Percent, Save, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const CATEGORY_LABELS: Record<string, string> = {
  restaurants: "🍽️ المطاعم",
  drivers: "🚗 السائقين",
  delivery: "🛵 عمال التوصيل",
  stores: "🏪 المتاجر",
  pharmacy_beauty: "💊 صيدليات وتجميل",
  courier: "📦 خدمة كوريي",
  express_market: "⚡ ماركت سريع",
  supermarket: "🛒 سوبر ماركت",
  shops_gifts: "🎁 متاجر وهدايا",
};

interface CommissionRate {
  id: string;
  category: string;
  rate: number;
}

const CommissionRatesManager = () => {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("commission_rates" as any)
        .select("id, category, rate")
        .order("category");
      if (!error && data) {
        setRates(data as any);
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleRateChange = (id: string, value: string) => {
    setRates((prev) =>
      prev.map((r) => (r.id === id ? { ...r, rate: Number(value) || 0 } : r))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const r of rates) {
        const { error } = await supabase
          .from("commission_rates" as any)
          .update({ rate: r.rate, updated_at: new Date().toISOString() } as any)
          .eq("id", r.id);
        if (error) throw error;
      }
      toast({ title: "✅ تم حفظ نسب الأرباح بنجاح" });
    } catch (err: any) {
      toast({
        title: "❌ فشل حفظ نسب الأرباح",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="gradient-primary text-primary-foreground gap-1"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          حفظ
        </Button>
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">نسب أرباح المنصة</h3>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-right mb-4">
        النسبة الافتراضية 5% — يمكنك تعديل كل فئة على حدة
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rates.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 border border-border rounded-lg p-3"
          >
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={r.rate}
                onChange={(e) => handleRateChange(r.id, e.target.value)}
                className="bg-secondary/60 border-border h-9 w-20 text-sm text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {CATEGORY_LABELS[r.category] || r.category}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommissionRatesManager;
