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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2, DollarSign, Navigation, Loader2, Globe, Building2, List, Wand2 } from "lucide-react";

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
  city: "",
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
  const [autoGenerating, setAutoGenerating] = useState(false);

  // Filter state
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");

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
    }
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);

  // Auto-select first country and city on load
  useEffect(() => {
    if (zones.length > 0 && !selectedCountry) {
      const firstCountry = zones[0]?.country || "المغرب";
      setSelectedCountry(firstCountry);
      const firstCity = zones.find(z => z.country === firstCountry)?.city || "";
      if (firstCity) setSelectedCity(firstCity);
    }
  }, [zones]);

  // Derived data
  const availableCountries = useMemo(() => {
    const dbCountries = new Set(zones.map(z => z.country || "المغرب"));
    const all = new Set([...COUNTRIES, ...dbCountries]);
    return Array.from(all).sort();
  }, [zones]);

  const availableCities = useMemo(() => {
    if (!selectedCountry) return [];
    const set = new Set(zones.filter(z => z.country === selectedCountry).map(z => z.city));
    return Array.from(set).sort();
  }, [zones, selectedCountry]);

  const filteredZones = useMemo(() => {
    if (!selectedCountry) return [];
    if (!selectedCity) return [];
    return zones.filter(z => z.country === selectedCountry && z.city === selectedCity);
  }, [zones, selectedCountry, selectedCity]);

  // Stats
  const countryCount = availableCountries.length;
  const cityCount = useMemo(() => {
    const set = new Set(zones.map(z => `${z.country}|${z.city}`));
    return set.size;
  }, [zones]);

  // Reset city when country changes
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    setSelectedCity("");
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      country: selectedCountry || emptyForm.country,
      city: selectedCity || emptyForm.city,
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

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            إدارة المناطق والأسعار
          </h1>
          <p className="text-sm text-muted-foreground mt-1">اختر البلد ← المدينة ← تظهر المناطق</p>
        </div>
        <Button onClick={openCreate} className="gradient-primary text-primary-foreground gap-2">
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
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{cityCount}</p>
              <p className="text-xs text-muted-foreground">مدينة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{zones.filter(z => z.is_active).length}</p>
              <p className="text-xs text-muted-foreground">حي نشط</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
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

      {/* Filter: Country → City */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Country Select */}
            <Card className="glass-strong border-border">
              <CardContent className="p-4">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-primary" /> اختر البلد
                </Label>
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger><SelectValue placeholder="— اختر البلد —" /></SelectTrigger>
                  <SelectContent>
                    {availableCountries.map(c => (
                      <SelectItem key={c} value={c}>
                        {c} ({zones.filter(z => z.country === c).length} منطقة)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* City Select */}
            <Card className="glass-strong border-border">
              <CardContent className="p-4">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-primary" /> اختر المدينة
                </Label>
                <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedCountry}>
                  <SelectTrigger><SelectValue placeholder={selectedCountry ? "— اختر المدينة —" : "اختر البلد أولاً"} /></SelectTrigger>
                  <SelectContent>
                    {availableCities.map(c => (
                      <SelectItem key={c} value={c}>
                        {c} ({zones.filter(z => z.country === selectedCountry && z.city === c).length} منطقة)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Zones Table */}
          {selectedCountry && selectedCity && (
            <Card className="glass-strong border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <List className="w-5 h-5 text-primary" />
                  مناطق {selectedCity} — {selectedCountry}
                  <Badge variant="secondary" className="mr-2">{filteredZones.length} منطقة</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredZones.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">لا توجد مناطق في هذه المدينة</p>
                    <Button onClick={openCreate} variant="outline" className="mt-3 gap-2">
                      <Plus className="w-4 h-4" /> إضافة منطقة
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-right">#</TableHead>
                          <TableHead className="text-right">الاسم بالعربية</TableHead>
                          <TableHead className="text-right">الاسم بالفرنسية</TableHead>
                          <TableHead className="text-right">النطاق (كم)</TableHead>
                          <TableHead className="text-right">رسوم التوصيل</TableHead>
                          <TableHead className="text-right">الحالة</TableHead>
                          <TableHead className="text-right">إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredZones.map((z, idx) => (
                          <TableRow key={z.id} className="hover:bg-muted/10">
                            <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-semibold">{z.name_ar}</TableCell>
                            <TableCell className="text-muted-foreground">{z.name_fr || "—"}</TableCell>
                            <TableCell>{z.radius_km} كم</TableCell>
                            <TableCell className="font-bold text-primary">{z.delivery_fee} DH</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch checked={z.is_active} onCheckedChange={() => toggleActive(z)} />
                                <Badge variant={z.is_active ? "default" : "secondary"} className="text-xs">
                                  {z.is_active ? "نشط" : "معطل"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(z)}>
                                  <Pencil className="w-4 h-4 text-muted-foreground" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(z.id)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Prompt to select */}
          {!selectedCountry && zones.length > 0 && (
            <Card className="glass-strong border-border">
              <CardContent className="py-12 text-center">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">اختر بلداً لعرض مدنه ومناطقه</p>
              </CardContent>
            </Card>
          )}

          {selectedCountry && !selectedCity && (
            <Card className="glass-strong border-border">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">اختر مدينة لعرض مناطقها</p>
              </CardContent>
            </Card>
          )}

          {zones.length === 0 && (
            <Card className="glass-strong border-border">
              <CardContent className="py-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد مناطق بعد</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-border max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل المنطقة" : "إضافة منطقة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">البلد *</Label>
              <Select
                value={COUNTRIES.includes(form.country) ? form.country : "__other__"}
                onValueChange={v => {
                  if (v !== "__other__") setForm(f => ({ ...f, country: v }));
                  else setForm(f => ({ ...f, country: "" }));
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="اختر البلد" /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="__other__">أخرى...</SelectItem>
                </SelectContent>
              </Select>
              {!COUNTRIES.includes(form.country) && (
                <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="أدخل اسم البلد" className="mt-2" />
              )}
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
