import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Sun, Moon, RotateCcw } from "lucide-react";
import { DELIVERY_PRICING_DEFAULTS } from "@/hooks/useDeliveryPricingSettings";
import { toast } from "@/hooks/use-toast";

interface DeliveryPricingState {
  dayBaseFare: string;
  dayIncludedKm: string;
  dayExtraKmRate: string;
  nightBaseFare: string;
  nightIncludedKm: string;
  nightExtraKmRate: string;
  dayStartHour: string;
  dayEndHour: string;
  roundingMethod: string;
}

interface DeliveryPricingSettingsProps {
  pricing: DeliveryPricingState;
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}

const DeliveryPricingSettings = ({ pricing, onChange, onReset }: DeliveryPricingSettingsProps) => {
  const dayFields = [
    { label: "السعر الأساسي (DH)", key: "dayBaseFare" },
    { label: "الكيلومترات المشمولة", key: "dayIncludedKm" },
    { label: "سعر كل كم إضافي (DH)", key: "dayExtraKmRate" },
  ];

  const nightFields = [
    { label: "السعر الأساسي (DH)", key: "nightBaseFare" },
    { label: "الكيلومترات المشمولة", key: "nightIncludedKm" },
    { label: "سعر كل كم إضافي (DH)", key: "nightExtraKmRate" },
  ];

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={onReset} className="text-xs gap-1">
          <RotateCcw className="w-3 h-3" />
          إعادة تعيين
        </Button>
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground">إعدادات تسعير التوصيل</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sun className="w-4 h-4 text-yellow-500" />
            <h4 className="font-semibold text-sm text-foreground">التسعيرة النهارية</h4>
          </div>
          {dayFields.map(field => (
            <div key={field.key} className="flex items-center justify-between gap-4">
              <Input
                value={pricing[field.key as keyof typeof pricing]}
                onChange={e => onChange(field.key, e.target.value)}
                className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
                type="number"
              />
              <label className="text-sm text-foreground">{field.label}</label>
            </div>
          ))}
        </div>

        <div className="space-y-4 border border-border rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-blue-400" />
            <h4 className="font-semibold text-sm text-foreground">التسعيرة الليلية</h4>
          </div>
          {nightFields.map(field => (
            <div key={field.key} className="flex items-center justify-between gap-4">
              <Input
                value={pricing[field.key as keyof typeof pricing]}
                onChange={e => onChange(field.key, e.target.value)}
                className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
                type="number"
              />
              <label className="text-sm text-foreground">{field.label}</label>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between gap-4">
          <Input
            value={pricing.dayStartHour}
            onChange={e => onChange("dayStartHour", e.target.value)}
            className="bg-secondary/60 border-border h-9 w-20 text-sm text-center"
            type="number" min="0" max="23"
          />
          <label className="text-sm text-foreground">بداية النهار (ساعة)</label>
        </div>
        <div className="flex items-center justify-between gap-4">
          <Input
            value={pricing.dayEndHour}
            onChange={e => onChange("dayEndHour", e.target.value)}
            className="bg-secondary/60 border-border h-9 w-20 text-sm text-center"
            type="number" min="0" max="23"
          />
          <label className="text-sm text-foreground">بداية الليل (ساعة)</label>
        </div>
        <div className="flex items-center justify-between gap-4">
          <Select value={pricing.roundingMethod} onValueChange={v => onChange("roundingMethod", v)}>
            <SelectTrigger className="bg-secondary/60 border-border h-9 w-32 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="round">تقريب عادي</SelectItem>
              <SelectItem value="ceil">تقريب لأعلى</SelectItem>
              <SelectItem value="floor">تقريب لأسفل</SelectItem>
              <SelectItem value="none">بدون تقريب</SelectItem>
            </SelectContent>
          </Select>
          <label className="text-sm text-foreground">تقريب المسافة</label>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-right mt-3">
        النهار: {pricing.dayStartHour}:00 → {pricing.dayEndHour}:00 | الليل: {pricing.dayEndHour}:00 → {pricing.dayStartHour}:00
      </p>
    </div>
  );
};

export default DeliveryPricingSettings;
