import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2, DollarSign, Navigation, Loader2, ChevronDown, ChevronLeft, Globe, Building2 } from "lucide-react";

type Zone = {
  id: string;
  name_ar: string;
  name_fr: string;
  city: string;
  country: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  delivery_fee: number;
  is_active: boolean;
  created_at: string;
};

const COUNTRIES = [
  "المغرب", "الجزائر", "تونس", "ليبيا", "مصر", "موريتانيا",
  "السعودية", "الإمارات", "الكويت", "قطر", "البحرين", "عُمان",
  "الأردن", "لبنان", "العراق", "سوريا", "فلسطين", "اليمن", "السودان",
  "تركيا", "فرنسا", "إسبانيا", "بلجيكا", "هولندا", "ألمانيا", "إيطاليا",
  "كندا", "الولايات المتحدة", "بريطانيا",
];

const emptyForm = {
  name_ar: "",
  name_fr: "",
  city: "Tanger",
  country: "المغرب",
  center_lat: 35.7595,
  center_lng: -5.834,
  radius_km: 3,
  delivery_fee: 10,
  is_active: true,
};

const ZonesManagement = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [openCountries, setOpenCountries] = useState<Set<string>>(new Set());
  const [openCities, setOpenCities] = useState<Set<string>>(new Set());

  const fetchZones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .order("country")
      .order("city")
      .order("name_ar");
    if (error) toast.error("خطأ في تحميل المناطق");
    else {
      const zonesData = (data || []) as Zone[];
      setZones(zonesData);
      // Auto-open all countries and cities
      setOpenCountries(new Set(zonesData.map(z => z.country)));
      setOpenCities(new Set(zonesData.map(z => `${z.country}|${z.city}`)));
    }
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);

  // Group zones: Country → City → Zones
  const grouped = useMemo(() => {
    const map = new Map<string, Map<string, Zone[]>>();
    zones.forEach(z => {
      const country = z.country || "المغرب";
      if (!map.has(country)) map.set(country, new Map());
      const cityMap = map.get(country)!;
      if (!cityMap.has(z.city)) cityMap.set(z.city, []);
      cityMap.get(z.city)!.push(z);
    });
    return map;
  }, [zones]);

  const toggleCountry = (c: string) => {
    setOpenCountries(prev => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  const toggleCity = (key: string) => {
    setOpenCities(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const openCreate = (presetCountry?: string, presetCity?: string) => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      country: presetCountry || emptyForm.country,
      city: presetCity || emptyForm.city,
    });
    setDialogOpen(true);
  };

  const openEdit = (z: Zone) => {
    setEditingId(z.id);
    setForm({
      name_ar: z.name_ar,
      name_fr: z.name_fr,
      city: z.city,
      country: z.country || "المغرب",
      center_lat: z.center_lat,
      center_lng: z.center_lng,
      radius_km: z.radius_km,
      delivery_fee: z.delivery_fee,
      is_active: z.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_ar.trim()) { toast.error("اسم المنطقة بالعربية مطلوب"); return; }
    if (!form.country.trim()) { toast.error("البلد مطلوب"); return; }
    if (!form.city.trim()) { toast.error("المدينة مطلوبة"); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from("zones").update(form).eq("id", editingId);
      if (error) toast.error("خطأ في التحديث");
      else toast.success("تم تحديث المنطقة");
    } else {
      const { error } = await supabase.from("zones").insert(form);
      if (error) toast.error("خطأ في الإضافة");
      else toast.success("تمت إضافة المنطقة");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchZones();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذه المنطقة؟")) return;
    const { error } = await supabase.from("zones").delete().eq("id", id);
    if (error) toast.error("خطأ في الحذف");
    else { toast.success("تم الحذف"); fetchZones(); }
  };

  const toggleActive = async (z: Zone) => {
    const { error } = await supabase.from("zones").update({ is_active: !z.is_active }).eq("id", z.id);
    if (error) toast.error("خطأ");
    else fetchZones();
  };

  const countryCount = grouped.size;
  const cityCount = Array.from(grouped.values()).reduce((s, m) => s + m.size, 0);

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            إدارة المناطق والأسعار
          </h1>
          <p className="text-sm text-muted-foreground mt-1">تنظيم حسب البلد → المدينة → الأحياء</p>
        </div>
        <Button onClick={() => openCreate()} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> إضافة منطقة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{countryCount}</p>
              <p className="text-xs text-muted-foreground">بلد</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{cityCount}</p>
              <p className="text-xs text-muted-foreground">مدينة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{zones.filter(z => z.is_active).length}</p>
              <p className="text-xs text-muted-foreground">حي نشط</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {zones.length > 0 ? (zones.reduce((s, z) => s + z.delivery_fee, 0) / zones.length).toFixed(0) : 0} DH
              </p>
              <p className="text-xs text-muted-foreground">متوسط رسوم التوصيل</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Hierarchical View */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : zones.length === 0 ? (
        <Card className="glass-strong border-border">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد مناطق بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([country, cityMap]) => {
            const isCountryOpen = openCountries.has(country);
            const totalInCountry = Array.from(cityMap.values()).reduce((s, arr) => s + arr.length, 0);

            return (
              <Card key={country} className="glass-strong border-border overflow-hidden">
                {/* Country Header */}
                <button
                  onClick={() => toggleCountry(country)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isCountryOpen ? <ChevronDown className="w-5 h-5 text-muted-foreground" /> : <ChevronLeft className="w-5 h-5 text-muted-foreground" />}
                    <Globe className="w-5 h-5 text-primary" />
                    <span className="text-lg font-bold text-foreground">{country}</span>
                    <Badge variant="secondary">{totalInCountry} حي</Badge>
                    <Badge variant="outline" className="text-muted-foreground">{cityMap.size} مدينة</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs"
                    onClick={(e) => { e.stopPropagation(); openCreate(country); }}
                  >
                    <Plus className="w-3 h-3" /> مدينة جديدة
                  </Button>
                </button>

                {isCountryOpen && (
                  <div className="border-t border-border">
                    {Array.from(cityMap.entries()).map(([city, cityZones]) => {
                      const cityKey = `${country}|${city}`;
                      const isCityOpen = openCities.has(cityKey);

                      return (
                        <div key={cityKey} className="border-b border-border last:border-b-0">
                          {/* City Header */}
                          <button
                            onClick={() => toggleCity(cityKey)}
                            className="w-full flex items-center justify-between px-6 py-3 hover:bg-muted/20 transition-colors bg-muted/10"
                          >
                            <div className="flex items-center gap-3">
                              {isCityOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronLeft className="w-4 h-4 text-muted-foreground" />}
                              <Building2 className="w-4 h-4 text-blue-500" />
                              <span className="font-semibold text-foreground">{city}</span>
                              <Badge variant="secondary" className="text-xs">{cityZones.length} حي</Badge>
                              <Badge variant="outline" className="text-xs">
                                {cityZones.filter(z => z.is_active).length} نشط
                              </Badge>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-xs"
                              onClick={(e) => { e.stopPropagation(); openCreate(country, city); }}
                            >
                              <Plus className="w-3 h-3" /> حي جديد
                            </Button>
                          </button>

                          {/* Neighborhoods */}
                          {isCityOpen && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 p-4 bg-background/50">
                              {cityZones.map(z => (
                                <Card key={z.id} className="border-border hover:border-primary/30 transition-colors">
                                  <CardHeader className="pb-2 flex flex-row items-start justify-between">
                                    <div>
                                      <CardTitle className="text-sm">{z.name_ar}</CardTitle>
                                      <p className="text-xs text-muted-foreground">{z.name_fr}</p>
                                    </div>
                                    <Badge variant={z.is_active ? "default" : "secondary"} className={z.is_active ? "bg-green-500/20 text-green-400 border-green-500/30 text-xs" : "text-xs"}>
                                      {z.is_active ? "نشط" : "معطل"}
                                    </Badge>
                                  </CardHeader>
                                  <CardContent className="space-y-2">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="bg-secondary/50 rounded-lg p-2 text-center">
                                        <p className="text-muted-foreground">النطاق</p>
                                        <p className="font-semibold text-foreground">{z.radius_km} كم</p>
                                      </div>
                                      <div className="bg-secondary/50 rounded-lg p-2 text-center">
                                        <p className="text-muted-foreground">رسوم التوصيل</p>
                                        <p className="font-bold text-primary">{z.delivery_fee} DH</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between pt-2 border-t border-border">
                                      <div className="flex items-center gap-2">
                                        <Switch checked={z.is_active} onCheckedChange={() => toggleActive(z)} />
                                        <span className="text-xs text-muted-foreground">{z.is_active ? "نشط" : "معطل"}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(z)}>
                                          <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                                        </Button>
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleDelete(z.id)}>
                                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                        </Button>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-border max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل المنطقة" : "إضافة حي جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">البلد *</Label>
              <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="مثال: المغرب" className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">المدينة *</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="مثال: طنجة" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">اسم الحي بالعربية *</Label>
                <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="مثال: مسنانة" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">اسم الحي بالفرنسية</Label>
                <Input value={form.name_fr} onChange={e => setForm(f => ({ ...f, name_fr: e.target.value }))} placeholder="ex: Mesnana" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">خط العرض (Lat)</Label>
                <Input type="number" step="0.0001" value={form.center_lat} onChange={e => setForm(f => ({ ...f, center_lat: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">خط الطول (Lng)</Label>
                <Input type="number" step="0.0001" value={form.center_lng} onChange={e => setForm(f => ({ ...f, center_lng: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">النطاق (كم)</Label>
                <Input type="number" step="0.5" value={form.radius_km} onChange={e => setForm(f => ({ ...f, radius_km: parseFloat(e.target.value) || 1 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">رسوم التوصيل (DH)</Label>
                <Input type="number" step="1" value={form.delivery_fee} onChange={e => setForm(f => ({ ...f, delivery_fee: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-sm">منطقة نشطة</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZonesManagement;
