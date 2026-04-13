import { useState, useEffect } from "react";
import { Key, Eye, EyeOff, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";
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
}

const API_KEY_FIELDS: ApiKeyField[] = [
  {
    key: "google_maps_api_key",
    label: "Google Maps API Key",
    description: "مفتاح Google Maps و Places API للبحث عن الشركاء والخرائط",
    placeholder: "AIza...",
  },
  {
    key: "paypal_client_id",
    label: "PayPal Client ID",
    description: "معرف تطبيق PayPal للمدفوعات",
    placeholder: "AX...",
  },
  {
    key: "stripe_publishable_key",
    label: "Stripe Publishable Key",
    description: "مفتاح Stripe العام للمدفوعات",
    placeholder: "pk_live_...",
  },
  {
    key: "mailbluster_api_key",
    label: "MailBluster API Key",
    description: "مفتاح MailBluster لإدارة حملات البريد الإلكتروني",
    placeholder: "...",
  },
];

const ApiKeysSettings = () => {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [visibility, setVisibility] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, "saved" | "error" | null>>({});

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

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-right">
            <span>🔑 مفاتيح API</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground text-right">
            إدارة مفاتيح الخدمات الخارجية المستخدمة في المنصة
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {API_KEY_FIELDS.map((field) => (
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
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysSettings;
