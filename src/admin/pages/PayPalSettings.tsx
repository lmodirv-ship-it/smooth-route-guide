import { useState, useEffect } from "react";
import { Eye, EyeOff, Loader2, Save, RefreshCw, CreditCard, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const PayPalSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [settings, setSettings] = useState({
    clientId: "",
    secretKey: "",
    sandboxMode: true,
    enabled: true,
    currency: "USD",
    brandName: "HN Driver",
    returnUrl: "",
    cancelUrl: "",
  });

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "paypal_settings")
        .maybeSingle();
      if (data?.value) {
        const v = data.value as Record<string, unknown>;
        setSettings({
          clientId: String(v.clientId ?? ""),
          secretKey: String(v.secretKey ?? ""),
          sandboxMode: v.sandboxMode !== false,
          enabled: v.enabled !== false,
          currency: String(v.currency ?? "USD"),
          brandName: String(v.brandName ?? "HN Driver"),
          returnUrl: String(v.returnUrl ?? ""),
          cancelUrl: String(v.cancelUrl ?? ""),
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!settings.clientId.trim()) {
      toast({ title: "❌ يرجى إدخال Client ID", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = { ...settings };

      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "paypal_settings")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("app_settings")
          .update({ value: payload, updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq("key", "paypal_settings");
      } else {
        await supabase
          .from("app_settings")
          .insert({ key: "paypal_settings", value: payload, updated_by: user?.id });
      }
      toast({ title: "✅ تم حفظ إعدادات PayPal بنجاح" });
    } catch (err: any) {
      toast({ title: "❌ فشل الحفظ", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("paypal-payment", {
        body: { action: "test-connection" },
      });
      if (error) throw error;
      if (data?.success) {
        toast({ title: "✅ الاتصال بـ PayPal ناجح!" });
      } else {
        toast({ title: "❌ فشل الاتصال", description: data?.error || "تحقق من البيانات", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "❌ خطأ في الاختبار", description: err?.message, variant: "destructive" });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving} className="gradient-primary text-primary-foreground gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ الإعدادات
        </Button>
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-blue-500" />
          <h1 className="text-xl font-bold text-foreground">إعدادات PayPal</h1>
        </div>
      </div>

      {/* Status */}
      <div className="glass-card rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={settings.enabled ? "default" : "secondary"}>
            {settings.enabled ? "مفعّل" : "معطّل"}
          </Badge>
          <Badge variant={settings.sandboxMode ? "outline" : "destructive"}>
            {settings.sandboxMode ? "🧪 وضع اختبار (Sandbox)" : "🔴 وضع إنتاج (Live)"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={settings.enabled} onCheckedChange={v => setSettings(s => ({ ...s, enabled: v }))} />
          <label className="text-sm font-medium text-foreground">تفعيل PayPal</label>
        </div>
      </div>

      {/* API Credentials */}
      <div className="glass-card rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-foreground text-right">🔑 بيانات API</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block text-right">Client ID</label>
          <Input
            value={settings.clientId}
            onChange={e => setSettings(s => ({ ...s, clientId: e.target.value }))}
            placeholder="AetPmd...uGqG"
            className="bg-secondary/60 border-border font-mono text-xs"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block text-right">Secret Key</label>
          <div className="relative">
            <Input
              type={showSecret ? "text" : "password"}
              value={settings.secretKey}
              onChange={e => setSettings(s => ({ ...s, secretKey: e.target.value }))}
              placeholder="EGBfD4f...Zjna"
              className="bg-secondary/60 border-border font-mono text-xs pl-10"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowSecret(!showSecret)}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            يُحفظ مشفراً ولا يظهر للمستخدمين
          </p>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <Switch
            checked={settings.sandboxMode}
            onCheckedChange={v => setSettings(s => ({ ...s, sandboxMode: v }))}
          />
          <label className="text-sm text-foreground">
            🧪 وضع Sandbox (اختبار)
            <span className="block text-xs text-muted-foreground">فعّل هذا أثناء التطوير وأوقفه في الإنتاج</span>
          </label>
        </div>
      </div>

      {/* Payment Config */}
      <div className="glass-card rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-bold text-foreground text-right">⚙️ إعدادات الدفع</h2>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block text-right">العملة</label>
          <select
            value={settings.currency}
            onChange={e => setSettings(s => ({ ...s, currency: e.target.value }))}
            className="w-full h-10 rounded-md border border-input bg-secondary/60 px-3 text-sm"
            dir="ltr"
          >
            <option value="USD">USD — دولار أمريكي</option>
            <option value="EUR">EUR — يورو</option>
            <option value="GBP">GBP — جنيه إسترليني</option>
            <option value="MAD">MAD — درهم مغربي</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block text-right">اسم العلامة التجارية</label>
          <Input
            value={settings.brandName}
            onChange={e => setSettings(s => ({ ...s, brandName: e.target.value }))}
            placeholder="HN Driver"
            className="bg-secondary/60 border-border"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block text-right">رابط العودة بعد الدفع (اختياري)</label>
          <Input
            value={settings.returnUrl}
            onChange={e => setSettings(s => ({ ...s, returnUrl: e.target.value }))}
            placeholder="https://yoursite.com/payment-success"
            className="bg-secondary/60 border-border text-xs"
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground block text-right">رابط الإلغاء (اختياري)</label>
          <Input
            value={settings.cancelUrl}
            onChange={e => setSettings(s => ({ ...s, cancelUrl: e.target.value }))}
            placeholder="https://yoursite.com/payment-cancel"
            className="bg-secondary/60 border-border text-xs"
            dir="ltr"
          />
        </div>
      </div>

      {/* Test & Links */}
      <div className="glass-card rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-foreground text-right">🧪 اختبار الاتصال</h2>
        <div className="flex gap-3 flex-wrap">
          <Button onClick={handleTest} disabled={testing} variant="outline" className="gap-2">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            اختبار الاتصال
          </Button>
          <a
            href="https://developer.paypal.com/dashboard/applications"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              PayPal Developer Dashboard
            </Button>
          </a>
        </div>
        <p className="text-xs text-muted-foreground text-right">
          اضغط "اختبار الاتصال" للتحقق من صحة Client ID و Secret Key
        </p>
      </div>
    </div>
  );
};

export default PayPalSettings;
