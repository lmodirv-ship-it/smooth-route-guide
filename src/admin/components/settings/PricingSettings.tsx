import { Input } from "@/components/ui/input";
import { DollarSign } from "lucide-react";

interface PricingSettingsProps {
  settings: {
    baseFare: string;
    perKmRate: string;
    perMinRate: string;
    minFare: string;
  };
  onChange: (key: string, value: string) => void;
}

const PricingSettings = ({ settings, onChange }: PricingSettingsProps) => {
  const fields = [
    { label: "التسعيرة الأساسية (DH)", key: "baseFare" },
    { label: "سعر الكيلومتر (DH)", key: "perKmRate" },
    { label: "سعر الدقيقة (DH)", key: "perMinRate" },
    { label: "الحد الأدنى للأجرة (DH)", key: "minFare" },
  ];

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4 text-right">
        <DollarSign className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">التسعيرة</h3>
      </div>
      <div className="space-y-4">
        {fields.map(field => (
          <div key={field.key} className="flex items-center justify-between gap-4">
            <Input
              value={settings[field.key as keyof typeof settings]}
              onChange={e => onChange(field.key, e.target.value)}
              className="bg-secondary/60 border-border h-9 w-32 text-sm text-center"
              type="number"
            />
            <label className="text-sm text-foreground">{field.label}</label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PricingSettings;
