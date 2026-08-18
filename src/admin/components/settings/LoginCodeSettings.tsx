import { useEffect, useState } from "react";
import { KeyRound, Loader2, Save, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LoginCodeConfig {
  enabled: boolean;
  expiryMinutes: number;
  maxAttempts: number;
}

interface CodeRow {
  id: string;
  email: string;
  verification: boolean;
  date: string;
  attempts: number;
}

const DEFAULTS: LoginCodeConfig = { enabled: true, expiryMinutes: 10, maxAttempts: 5 };

const LoginCodeSettings = () => {
  const [config, setConfig] = useState<LoginCodeConfig>(DEFAULTS);
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const [{ data: setting }, { data: codes }] = await Promise.all([
        supabase.from("app_settings").select("value").eq("key", "login_code").maybeSingle(),
        supabase
          .from("login_codes")
          .select("id, email, verification, date, attempts")
          .order("date", { ascending: false })
          .limit(20),
      ]);

      if (setting?.value) {
        const v = setting.value as Record<string, unknown>;
        setConfig({
          enabled: typeof v.enabled === "boolean" ? v.enabled : DEFAULTS.enabled,
          expiryMinutes: Number(v.expiryMinutes) || DEFAULTS.expiryMinutes,
          maxAttempts: Number(v.maxAttempts) || DEFAULTS.maxAttempts,
        });
      }
      setRows((codes as CodeRow[]) ?? []);
      setLoading(false);
    };
    void load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "login_code")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("app_settings")
          .update({ value: config as unknown as never, updated_at: new Date().toISOString(), updated_by: user?.id })
          .eq("key", "login_code");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("app_settings")
          .insert({ key: "login_code", value: config as unknown as never, updated_by: user?.id });
        if (error) throw error;
      }
      toast({ title: "✅ تم حفظ إعدادات رمز الدخول" });
    } catch (err: any) {
      toast({ title: "❌ فشل الحفظ", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="w-5 h-5 text-primary" />
            رمز الدخول (6 أرقام)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between">
            <Switch
              checked={config.enabled}
              onCheckedChange={(v) => setConfig((c) => ({ ...c, enabled: v }))}
            />
            <Label className="text-sm">تفعيل الدخول برمز مُرسَل إلى البريد</Label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm">مدة صلاحية الرمز (بالدقائق)</Label>
              <Input
                type="number"
                min={1}
                max={60}
                value={config.expiryMinutes}
                onChange={(e) => setConfig((c) => ({ ...c, expiryMinutes: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm">الحد الأقصى للمحاولات</Label>
              <Input
                type="number"
                min={1}
                max={20}
                value={config.maxAttempts}
                onChange={(e) => setConfig((c) => ({ ...c, maxAttempts: Number(e.target.value) }))}
              />
            </div>
          </div>

          <Button onClick={save} disabled={saving} className="gradient-primary text-primary-foreground">
            {saving ? <Loader2 className="w-4 h-4 ml-2 animate-spin" /> : <Save className="w-4 h-4 ml-2" />}
            حفظ
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">آخر الرموز المُرسَلة</CardTitle>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد رموز بعد.</p>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between border border-border/50 rounded-lg px-3 py-2 text-sm">
                  <Badge variant={r.verification ? "default" : "secondary"} className="gap-1">
                    {r.verification ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                    {r.verification ? "تم التحقق" : "لم يُستخدم"}
                  </Badge>
                  <div className="text-right">
                    <div className="font-medium text-foreground">{r.email}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(r.date).toLocaleString("ar-MA")} • محاولات: {r.attempts}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginCodeSettings;
