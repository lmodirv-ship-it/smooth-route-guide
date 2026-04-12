import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { MapPin, Bell, Shield, Gift, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface FreePeriodSettings {
  enabled: boolean;
  from: string;
  to: string;
  label_ar: string;
}

interface GeneralSettingsProps {
  settings: {
    maxRadius: string;
    autoAssign: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
    maintenanceMode: boolean;
  };
  onChange: (key: string, value: any) => void;
  freePeriod: FreePeriodSettings;
  onFreePeriodChange: (fp: FreePeriodSettings) => void;
}

const GeneralSettings = ({ settings, onChange, freePeriod, onFreePeriodChange }: GeneralSettingsProps) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* الفترة المجانية */}
      <div className="glass-card rounded-xl p-6 lg:col-span-2 border-2 border-primary/20">
        <div className="flex items-center gap-2 mb-4 text-right">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">الفترة المجانية</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Switch
              checked={freePeriod.enabled}
              onCheckedChange={v => onFreePeriodChange({ ...freePeriod, enabled: v })}
            />
            <label className="text-sm text-foreground font-medium">تفعيل الفترة المجانية</label>
          </div>

          {freePeriod.enabled && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* من */}
                <div className="space-y-1">
                  <label className="text-sm text-foreground text-right block">من تاريخ</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !freePeriod.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {freePeriod.from ? format(new Date(freePeriod.from), "yyyy-MM-dd") : "اختر تاريخ البداية"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={freePeriod.from ? new Date(freePeriod.from) : undefined}
                        onSelect={d => d && onFreePeriodChange({ ...freePeriod, from: format(d, "yyyy-MM-dd") })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* إلى */}
                <div className="space-y-1">
                  <label className="text-sm text-foreground text-right block">إلى تاريخ</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !freePeriod.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {freePeriod.to ? format(new Date(freePeriod.to), "yyyy-MM-dd") : "اختر تاريخ النهاية"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={freePeriod.to ? new Date(freePeriod.to) : undefined}
                        onSelect={d => d && onFreePeriodChange({ ...freePeriod, to: format(d, "yyyy-MM-dd") })}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* رسالة مخصصة */}
              <div className="space-y-1">
                <label className="text-sm text-foreground text-right block">الرسالة التي تظهر للمستخدمين</label>
                <Input
                  value={freePeriod.label_ar}
                  onChange={e => onFreePeriodChange({ ...freePeriod, label_ar: e.target.value })}
                  className="bg-secondary/60 border-border text-right"
                  placeholder="مثال: خدمة مجانية حتى نهاية أبريل"
                  dir="rtl"
                />
              </div>

              {freePeriod.from && freePeriod.to && (
                <p className="text-xs text-muted-foreground text-right">
                  ✅ المنصة ستكون مجانية من <strong>{freePeriod.from}</strong> إلى <strong>{freePeriod.to}</strong>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* المناطق */}
      <div className="glass-card rounded-xl p-6">
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
      <div className="glass-card rounded-xl p-6">
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
      <div className="glass-card rounded-xl p-6">
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
