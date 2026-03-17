import { useState, useEffect } from "react";
import { Settings, Save, DollarSign, MapPin, Bell, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    baseFare: "5",
    perKmRate: "2.5",
    perMinRate: "0.5",
    minFare: "10",
    maxRadius: "50",
    autoAssign: true,
    emailNotifications: true,
    pushNotifications: true,
    maintenanceMode: false,
  });

  const handleSave = () => {
    // In production, save to a settings table
    localStorage.setItem("admin_settings", JSON.stringify(settings));
    toast({ title: "تم حفظ الإعدادات بنجاح" });
  };

  useEffect(() => {
    const saved = localStorage.getItem("admin_settings");
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const Section = ({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) => (
    <div className="gradient-card rounded-xl border border-border p-6">
      <div className="flex items-center gap-2 mb-4 text-right">
        <Icon className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={handleSave} className="gradient-primary text-primary-foreground"><Save className="w-4 h-4 ml-2" />حفظ الإعدادات</Button>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">إعدادات المنصة</h1>
          <Settings className="w-6 h-6 text-primary" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="التسعيرة" icon={DollarSign}>
          <div className="space-y-4">
            {[
              { label: "التسعيرة الأساسية (ر.س)", key: "baseFare" },
              { label: "سعر الكيلومتر (ر.س)", key: "perKmRate" },
              { label: "سعر الدقيقة (ر.س)", key: "perMinRate" },
              { label: "الحد الأدنى للأجرة (ر.س)", key: "minFare" },
            ].map(field => (
              <div key={field.key} className="flex items-center justify-between gap-4">
                <Input
                  value={settings[field.key as keyof typeof settings] as string}
                  onChange={e => setSettings(s => ({ ...s, [field.key]: e.target.value }))}
                  className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
                  type="number"
                />
                <label className="text-sm text-foreground">{field.label}</label>
              </div>
            ))}
          </div>
        </Section>

        <Section title="المناطق" icon={MapPin}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Input
                value={settings.maxRadius}
                onChange={e => setSettings(s => ({ ...s, maxRadius: e.target.value }))}
                className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
                type="number"
              />
              <label className="text-sm text-foreground">نطاق الخدمة (كم)</label>
            </div>
            <div className="flex items-center justify-between">
              <Switch checked={settings.autoAssign} onCheckedChange={v => setSettings(s => ({ ...s, autoAssign: v }))} />
              <label className="text-sm text-foreground">تعيين تلقائي للسائقين</label>
            </div>
          </div>
        </Section>

        <Section title="الإشعارات" icon={Bell}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Switch checked={settings.emailNotifications} onCheckedChange={v => setSettings(s => ({ ...s, emailNotifications: v }))} />
              <label className="text-sm text-foreground">إشعارات البريد الإلكتروني</label>
            </div>
            <div className="flex items-center justify-between">
              <Switch checked={settings.pushNotifications} onCheckedChange={v => setSettings(s => ({ ...s, pushNotifications: v }))} />
              <label className="text-sm text-foreground">إشعارات الدفع</label>
            </div>
          </div>
        </Section>

        <Section title="النظام" icon={Shield}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Switch checked={settings.maintenanceMode} onCheckedChange={v => setSettings(s => ({ ...s, maintenanceMode: v }))} />
              <label className="text-sm text-foreground">وضع الصيانة</label>
            </div>
            <p className="text-xs text-muted-foreground text-right">عند تفعيل وضع الصيانة، لن يتمكن المستخدمون من الوصول إلى المنصة</p>
          </div>
        </Section>
      </div>
    </div>
  );
};

export default AdminSettings;
