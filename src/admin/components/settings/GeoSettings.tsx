import { useState, useEffect } from "react";
import { Globe, MapPin, Save, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const GeoSettings = () => {
  const [allCountries, setAllCountries] = useState<string[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [activeCountries, setActiveCountries] = useState<string[]>([]);
  const [defaultCountry, setDefaultCountry] = useState("all");
  const [defaultCity, setDefaultCity] = useState("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: zones } = await supabase
        .from("zones")
        .select("country, city")
        .eq("is_active", true);

      if (zones) {
        const uniqueCountries = [...new Set(zones.map(z => z.country))].sort();
        setAllCountries(uniqueCountries);
      }

      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("key", "geo_settings")
        .maybeSingle();

      if (settings?.value) {
        const geo = settings.value as any;
        setDefaultCountry(geo.defaultCountry || "all");
        setDefaultCity(geo.defaultCity || "all");
        setActiveCountries(geo.activeCountries || []);
      }

      setLoading(false);
    };
    load();
  }, []);

  // Load cities for default country
  useEffect(() => {
    if (defaultCountry === "all") {
      setAllCities([]);
      return;
    }
    const fetchCities = async () => {
      const { data } = await supabase
        .from("zones")
        .select("city")
        .eq("country", defaultCountry)
        .eq("is_active", true);
      if (data) {
        setAllCities([...new Set(data.map(z => z.city))].sort());
      }
    };
    fetchCities();
  }, [defaultCountry]);

  const toggleCountry = (country: string) => {
    setActiveCountries(prev =>
      prev.includes(country)
        ? prev.filter(c => c !== country)
        : [...prev, country]
    );
  };

  const selectAll = () => setActiveCountries([...allCountries]);
  const deselectAll = () => setActiveCountries([]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const value = { defaultCountry, defaultCity, activeCountries };

      const { data: existing } = await supabase
        .from("app_settings")
        .select("id")
        .eq("key", "geo_settings")
        .maybeSingle();

      if (existing) {
        await supabase.from("app_settings").update({
          value,
          updated_at: new Date().toISOString(),
          updated_by: user?.id,
        }).eq("key", "geo_settings");
      } else {
        await supabase.from("app_settings").insert({
          key: "geo_settings",
          value,
          updated_by: user?.id,
        });
      }

      toast({ title: "✅ تم حفظ الإعدادات الجغرافية بنجاح" });
    } catch (err: any) {
      toast({ title: "❌ خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="gradient-card rounded-xl border border-border p-6 space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={handleSave} disabled={saving} className="gap-2 gradient-primary text-primary-foreground">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ
        </Button>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-foreground">الإعدادات الجغرافية</h3>
          <Globe className="w-5 h-5 text-primary" />
        </div>
      </div>

      {/* Default country/city */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground text-right block">البلد الافتراضي</label>
          <Select value={defaultCountry} onValueChange={v => { setDefaultCountry(v); setDefaultCity("all"); }}>
            <SelectTrigger>
              <Globe className="w-4 h-4 ml-2 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل البلدان</SelectItem>
              {allCountries.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground text-right block">المدينة الافتراضية</label>
          <Select value={defaultCity} onValueChange={setDefaultCity} disabled={defaultCountry === "all"}>
            <SelectTrigger>
              <MapPin className="w-4 h-4 ml-2 text-primary" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المدن</SelectItem>
              {allCities.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Active countries */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">تحديد الكل</Button>
            <Button variant="outline" size="sm" onClick={deselectAll} className="text-xs">إلغاء الكل</Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">البلدان النشطة في الفلتر</span>
            <Badge variant="secondary">{activeCountries.length} / {allCountries.length}</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-auto p-1">
          {allCountries.map(country => (
            <label
              key={country}
              className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-right ${
                activeCountries.includes(country)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <Checkbox
                checked={activeCountries.includes(country)}
                onCheckedChange={() => toggleCountry(country)}
              />
              <span className="text-sm text-foreground">{country}</span>
              {activeCountries.includes(country) && <Check className="w-3 h-3 text-primary mr-auto" />}
            </label>
          ))}
        </div>

        {allCountries.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-4">
            لا توجد بلدان في قاعدة البيانات. أضف مناطق أولاً من صفحة المناطق والأسعار.
          </p>
        )}
      </div>
    </div>
  );
};

export default GeoSettings;
