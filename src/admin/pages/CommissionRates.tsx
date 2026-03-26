import { useState, useEffect } from "react";
import { Percent, Save, Loader2, TrendingUp, BarChart3 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

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

const CHART_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#8b5cf6", "#ec4899", "#64748b",
];

interface CommissionRate {
  id: string;
  category: string;
  rate: number;
}

const CommissionRatesPage = () => {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("commission_rates")
        .select("id, category, rate")
        .order("category");
      if (!error && data) setRates(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleRateChange = (id: string, value: string) => {
    setRates(prev => prev.map(r => (r.id === id ? { ...r, rate: Number(value) || 0 } : r)));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const r of rates) {
        const { error } = await supabase
          .from("commission_rates")
          .update({ rate: r.rate, updated_at: new Date().toISOString() })
          .eq("id", r.id);
        if (error) throw error;
      }
      toast({ title: "✅ تم حفظ نسب الأرباح بنجاح" });
    } catch (err: any) {
      toast({ title: "❌ فشل حفظ نسب الأرباح", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const avgRate = rates.length ? (rates.reduce((s, r) => s + r.rate, 0) / rates.length).toFixed(1) : "0";
  const maxRate = rates.length ? Math.max(...rates.map(r => r.rate)) : 0;
  const minRate = rates.length ? Math.min(...rates.map(r => r.rate)) : 0;

  const chartData = rates.map(r => ({
    name: CATEGORY_LABELS[r.category]?.replace(/^.+\s/, "") || r.category,
    rate: r.rate,
  }));

  const pieData = rates.map(r => ({
    name: CATEGORY_LABELS[r.category]?.replace(/^.+\s/, "") || r.category,
    value: r.rate,
  }));

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground gap-1">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ التعديلات
        </Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">إدارة نسب الأرباح</h1>
          <Percent className="w-6 h-6 text-primary" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="gradient-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">متوسط النسبة</p>
          <p className="text-2xl font-bold text-primary">{avgRate}%</p>
        </div>
        <div className="gradient-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">أعلى نسبة</p>
          <p className="text-2xl font-bold text-green-500">{maxRate}%</p>
        </div>
        <div className="gradient-card rounded-xl border border-border p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">أدنى نسبة</p>
          <p className="text-2xl font-bold text-orange-500">{minRate}%</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="gradient-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">مقارنة النسب</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" domain={[0, 'auto']} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" width={100} tick={{ fill: 'hsl(var(--foreground))', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                formatter={(v: number) => [`${v}%`, 'النسبة']}
              />
              <Bar dataKey="rate" radius={[0, 6, 6, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="gradient-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-foreground">توزيع النسب</h3>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                dataKey="value"
                label={({ name, value }) => `${name} ${value}%`}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => [`${v}%`, 'النسبة']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rate Cards */}
      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4">
          <Percent className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">تعديل النسب</h3>
        </div>
        <p className="text-xs text-muted-foreground text-right mb-4">
          النسبة الافتراضية 5% — يمكنك تعديل كل فئة على حدة
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rates.map(r => (
            <div key={r.id} className="flex items-center justify-between gap-3 border border-border rounded-lg p-3 hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={r.rate}
                  onChange={e => handleRateChange(r.id, e.target.value)}
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
    </div>
  );
};

export default CommissionRatesPage;
