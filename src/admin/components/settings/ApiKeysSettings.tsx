import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Save, Loader2, CheckCircle, AlertCircle, ShieldCheck, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ApiKeyField {
  key: string;
  label: string;
  description: string;
  placeholder: string;
  group: string;
}

const API_KEY_FIELDS: ApiKeyField[] = [
  // Google Services
  {
    key: "google_maps_api_key",
    label: "Google Maps API Key",
    description: "مفتاح Google Maps للخرائط، تقدير المسافات، والملاحة الحية",
    placeholder: "AIza...",
    group: "google",
  },
  {
    key: "google_places_api_key",
    label: "Google Places API Key",
    description: "مفتاح Google Places للبحث عن المطاعم والمتاجر والشركاء (يستخدم نفس مفتاح Maps إذا كان مفعلاً)",
    placeholder: "AIza...",
    group: "google",
  },
  {
    key: "google_geocoding_api_key",
    label: "Google Geocoding API Key",
    description: "مفتاح تحويل العناوين إلى إحداثيات والعكس (يستخدم نفس مفتاح Maps إذا كان مفعلاً)",
    placeholder: "AIza...",
    group: "google",
  },
  {
    key: "google_directions_api_key",
    label: "Google Directions API Key",
    description: "مفتاح حساب المسارات والاتجاهات بين النقاط (يستخدم نفس مفتاح Maps إذا كان مفعلاً)",
    placeholder: "AIza...",
    group: "google",
  },
  // Payment Services
  {
    key: "paypal_client_id",
    label: "PayPal Client ID",
    description: "معرف تطبيق PayPal للمدفوعات",
    placeholder: "AX...",
    group: "payment",
  },
  {
    key: "stripe_publishable_key",
    label: "Stripe Publishable Key",
    description: "مفتاح Stripe العام للمدفوعات",
    placeholder: "pk_live_...",
    group: "payment",
  },
  // Communication
  {
    key: "mailbluster_api_key",
    label: "MailBluster API Key",
    description: "مفتاح MailBluster لإدارة حملات البريد الإلكتروني",
    placeholder: "...",
    group: "communication",
  },
];

const GROUP_LABELS: Record<string, { label: string; icon: string }> = {
  google: { label: "🗺️ خدمات Google", icon: "🗺️" },
  payment: { label: "💳 خدمات الدفع", icon: "💳" },
  communication: { label: "📧 التواصل", icon: "📧" },
};

const ApiKeysSettings = () => {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, "saved" | "error" | null>>({});
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("key", "api_keys")
        .maybeSingle();
      if (data?.value) {
        const stored = data.value as Record<string, string>;
        setKeys(stored);
      }
    };
    load();
  }, []);

  const handleReAuth = async () => {
    setAuthLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) throw new Error("لا يوجد بريد إلكتروني");

      const { error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });

      if (error) {
        toast({ title: "❌ كلمة المرور غير صحيحة", variant: "destructive" });
        return;
      }

      setIsAuthenticated(true);
      toast({ title: "✅ تم التحقق بنجاح" });
    } catch (err: any) {
      toast({ title: "❌ فشل التحقق", description: err?.message, variant: "destructive" });
    } finally {
      setAuthLoading(false);
      setPassword("");
    }
  };

  const maskKey = (key: string) => {
    if (!key || key.length < 8) return "••••••••";
    return key.slice(0, 6) + "••••••••" + key.slice(-4);
  };

  const handleSaveKey = async (field: ApiKeyField) => {
    const value = keys[field.key];
    if (!value?.trim()) {
      toast({ title: "❌ أدخل المفتاح أولاً", variant: "destructive" });
      return;
    }

    setSaving(field.key);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const updatedKeys = { ...keys, [field.key]: value.trim() };

      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "api_keys")
        .maybeSingle();

      if (existing) {
        await supabase
          .from("app_settings")
          .update({ value: updatedKeys as any, updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq("key", "api_keys");
      } else {
        await supabase
          .from("app_settings")
          .insert({ key: "api_keys", value: updatedKeys as any, updated_by: user?.id });
      }

      setStatuses(s => ({ ...s, [field.key]: "saved" }));
      toast({ title: `✅ تم حفظ ${field.label}` });
      setTimeout(() => setStatuses(s => ({ ...s, [field.key]: null })), 3000);
    } catch (err: any) {
      setStatuses(s => ({ ...s, [field.key]: "error" }));
      toast({ title: "❌ فشل الحفظ", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(null);
    }
  };

  // Password re-auth gate
  if (!isAuthenticated) {
    return (
      <Card className="border-primary/20 max-w-md mx-auto mt-10">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-xl">🔐 تأكيد الهوية</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            أدخل كلمة المرور للوصول إلى مفاتيح API المحمية
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            dir="ltr"
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleReAuth()}
          />
          <Button onClick={handleReAuth} disabled={authLoading || !password} className="w-full gap-2">
            {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            تأكيد والدخول
          </Button>
        </CardContent>
      </Card>
    );
  }

  const groups = [...new Set(API_KEY_FIELDS.map(f => f.group))];

  return (
    <div className="space-y-6">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <span>🔑 مفاتيح API</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground text-right">
            إدارة مفاتيح الخدمات الخارجية المستخدمة في المنصة — محمية بتأكيد الهوية
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          {groups.map((group) => (
            <div key={group} className="space-y-4">
              <h3 className="text-lg font-bold text-right border-b pb-2">
                {GROUP_LABELS[group]?.label || group}
              </h3>
              {group === "google" && (
                <p className="text-xs text-muted-foreground text-right bg-secondary/20 p-3 rounded-lg">
                  💡 إذا كنت تستخدم مفتاح Google واحد لكل الخدمات، أدخله في الحقل الأول فقط. سيتم استخدامه تلقائياً كاحتياطي لبقية الخدمات.
                </p>
              )}
              {API_KEY_FIELDS.filter(f => f.group === group).map((field) => (
                <div key={field.key} className="space-y-2 p-4 rounded-lg border border-border/50 bg-secondary/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statuses[field.key] === "saved" && <CheckCircle className="w-4 h-4 text-green-500" />}
                      {statuses[field.key] === "error" && <AlertCircle className="w-4 h-4 text-destructive" />}
                      <Button
                        size="sm"
                        onClick={() => handleSaveKey(field)}
                        disabled={saving === field.key}
                        className="gap-1"
                      >
                        {saving === field.key ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Save className="w-3 h-3" />
                        )}
                        حفظ
                      </Button>
                    </div>
                    <div className="text-right">
                      <Label className="font-semibold flex items-center gap-2 justify-end">
                        <span>{field.label}</span>
                        <Key className="w-4 h-4 text-primary" />
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">{field.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0"
                      onClick={() => setVisibility(v => ({ ...v, [field.key]: !v[field.key] }))}
                    >
                      {visibility[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Input
                      dir="ltr"
                      type={visibility[field.key] ? "text" : "password"}
                      placeholder={field.placeholder}
                      value={keys[field.key] || ""}
                      onChange={(e) => setKeys(k => ({ ...k, [field.key]: e.target.value }))}
                      className="font-mono text-sm"
                    />
                  </div>
                  {keys[field.key] && !visibility[field.key] && (
                    <p className="text-xs text-muted-foreground text-left font-mono">
                      {maskKey(keys[field.key])}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysSettings;
