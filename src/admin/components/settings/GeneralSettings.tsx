import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MapPin, Bell, Shield } from "lucide-react";

interface GeneralSettingsProps {
  settings: {
    maxRadius: string;
    autoAssign: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    maintenanceMode: boolean;
  };
  onChange: (key: string, value: any) => void;
}

const GeneralSettings = ({ settings, onChange }: GeneralSettingsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* المناطق */}
      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4 text-right">
          <MapPin className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">المناطق</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Input
              value={settings.maxRadius}
              onChange={e => onChange("maxRadius", e.target.value)}
              className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
              type="number"
            />
            <label className="text-sm text-foreground">نطاق الخدمة (كم)</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.autoAssign} onCheckedChange={v => onChange("autoAssign", v)} />
            <label className="text-sm text-foreground">تعيين تلقائي للسائقين</label>
          </div>
        </div>
      </div>

      {/* الإشعارات */}
      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4 text-right">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">الإشعارات</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Switch checked={settings.emailNotifications} onCheckedChange={v => onChange("emailNotifications", v)} />
            <label className="text-sm text-foreground">إشعارات البريد الإلكتروني</label>
          </div>
          <div className="flex items-center justify-between">
            <Switch checked={settings.pushNotifications} onCheckedChange={v => onChange("pushNotifications", v)} />
            <label className="text-sm text-foreground">إشعارات الدفع</label>
          </div>
        </div>
      </div>

      {/* النظام */}
      <div className="gradient-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-2 mb-4 text-right">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">النظام</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Switch checked={settings.maintenanceMode} onCheckedChange={v => onChange("maintenanceMode", v)} />
            <label className="text-sm text-foreground">وضع الصيانة</label>
          </div>
          <p className="text-xs text-muted-foreground text-right">عند تفعيل وضع الصيانة، لن يتمكن المستخدمون من الوصول إلى المنصة</p>
        </div>
      </div>
    </div>
  );
};

export default GeneralSettings;
