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
import { MapPin, Plus, Pencil, Trash2, DollarSign, Navigation, Loader2, Globe, Building2, List, Wand2, Save } from "lucide-react";
import { useI18n } from "@/i18n/context";
import { translateCountry } from "@/lib/countryTranslations";

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
  const { t, dir, locale } = useI18n();
  const tz = t.zones;
  const tc = (name: string) => translateCountry(name, locale);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [savingAll, setSavingAll] = useState(false);

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
    if (error) toast.error(tz.loadError);
    else {
      const zonesData = (data || []) as Zone[];
      setZones(zonesData);
    }
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);

  useEffect(() => {
    if (zones.length > 0 && !selectedCountry) {
      const firstCountry = zones[0]?.country || "المغرب";
      setSelectedCountry(firstCountry);
      const firstCity = zones.find(z => z.country === firstCountry)?.city || "";
      if (firstCity) setSelectedCity(firstCity);
    }
  }, [zones]);

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

  const countryCount = availableCountries.length;
  const cityCount = useMemo(() => {
    const set = new Set(zones.map(z => `${z.country}|${z.city}`));
    return set.size;
  }, [zones]);

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
    if (!form.name_ar.trim()) { toast.error(tz.nameRequired); return; }
    if (!form.country.trim()) { toast.error(tz.countryRequired); return; }
    if (!form.city.trim()) { toast.error(tz.cityRequired); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from("zones").update(form).eq("id", editingId);
      if (error) toast.error(tz.updateError);
      else toast.success(tz.updated);
    } else {
      const { error } = await supabase.from("zones").insert(form);
      if (error) toast.error(tz.addError);
      else toast.success(tz.added);
    }
    setSaving(false);
    setDialogOpen(false);
    fetchZones();
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tz.deleteConfirm)) return;
    const { error } = await supabase.from("zones").delete().eq("id", id);
    if (error) toast.error(tz.deleteError);
    else { toast.success(tz.deleted); fetchZones(); }
  };

  const toggleActive = async (z: Zone) => {
    const { error } = await supabase.from("zones").update({ is_active: !z.is_active }).eq("id", z.id);
    if (error) toast.error(tz.error);
    else fetchZones();
  };

  const handleAutoGenerate = async () => {
    if (!selectedCountry) {
      toast.error(tz.selectCountryFirst);
      return;
    }
    setAutoGenerating(true);
    try {
      if (!selectedCity) {
        const { data, error } = await supabase.functions.invoke("search-neighborhoods", {
          body: { country: selectedCountry, mode: "cities" },
        });
        if (error || !data?.success) {
          toast.error(data?.error || tz.serviceError);
          setAutoGenerating(false);
          return;
        }
        const cities = data.cities || [];
        if (cities.length === 0) {
          toast.info(`لم يتم العثور على مدن لـ ${selectedCountry}`);
          setAutoGenerating(false);
          return;
        }
        const existingCities = new Set(
          zones.filter(z => z.country === selectedCountry).map(z => z.city.trim())
        );
        const newCities = cities.filter((c: any) => !existingCities.has(c.name.trim()));
        if (newCities.length === 0) {
          toast.info(`جميع المدن المكتشفة (${cities.length}) موجودة بالفعل. جاري البحث عن المزيد...`);
          // Try Google Places for more cities
          const { data: moreData } = await supabase.functions.invoke("search-neighborhoods", {
            body: { country: selectedCountry, mode: "cities", extended: true },
          });
          const moreCities = moreData?.cities || [];
          const extraCities = moreCities.filter((c: any) => !existingCities.has(c.name.trim()));
          if (extraCities.length === 0) {
            toast.info(`لا توجد مدن جديدة لإضافتها لـ ${selectedCountry}`);
            setAutoGenerating(false);
            return;
          }
          const toInsertExtra = extraCities.map((c: any) => ({
            name_ar: "وسط المدينة",
            name_fr: "Centre Ville",
            city: c.name,
            country: selectedCountry,
            center_lat: c.lat || 0,
            center_lng: c.lng || 0,
            radius_km: 3,
            delivery_fee: 10,
            is_active: true,
          }));
          const { error: insertErr } = await supabase.from("zones").insert(toInsertExtra);
          if (insertErr) {
            toast.error(tz.addCitiesError);
          } else {
            toast.success(`✅ تمت إضافة ${toInsertExtra.length} مدينة جديدة`);
            fetchZones();
          }
          setAutoGenerating(false);
          return;
        }
        const toInsert = newCities.map((c: any) => ({
          name_ar: "وسط المدينة",
          name_fr: "Centre Ville",
          city: c.name,
          country: selectedCountry,
          center_lat: c.lat || 0,
          center_lng: c.lng || 0,
          radius_km: 3,
          delivery_fee: 10,
          is_active: true,
        }));
        const { error: insertError } = await supabase.from("zones").insert(toInsert);
        if (insertError) {
          toast.error(tz.addCitiesError);
        } else {
          toast.success(tz.citiesAdded.replace("{count}", String(toInsert.length)));
          fetchZones();
        }
      } else {
        const { data, error } = await supabase.functions.invoke("search-neighborhoods", {
          body: { city: selectedCity, country: selectedCountry },
        });
        if (error || !data?.success) {
          toast.error(data?.error || tz.serviceError);
          setAutoGenerating(false);
          return;
        }
        const neighborhoods = data.neighborhoods || [];
        if (neighborhoods.length === 0) {
          toast.info(`لم يتم العثور على أحياء لمدينة ${selectedCity}`);
          setAutoGenerating(false);
          return;
        }
        const existingNames = new Set(
          zones
            .filter(z => z.country === selectedCountry && z.city === selectedCity)
            .map(z => z.name_ar.trim())
        );
        const newZones = neighborhoods.filter(
          (n: any) => !existingNames.has(n.name_ar.trim())
        );
        if (newZones.length === 0) {
          toast.info(`جميع الأحياء المكتشفة (${neighborhoods.length}) موجودة بالفعل في ${selectedCity}`);
          setAutoGenerating(false);
          return;
        }
        const toInsert = newZones.map((n: any) => ({
          name_ar: n.name_ar,
          name_fr: n.name_fr || "",
          city: selectedCity,
          country: selectedCountry,
          center_lat: n.center_lat || 0,
          center_lng: n.center_lng || 0,
          radius_km: 3,
          delivery_fee: 10,
          is_active: true,
        }));
        const { error: insertError } = await supabase.from("zones").insert(toInsert);
        if (insertError) {
          toast.error(tz.addZonesError);
        } else {
          toast.success(tz.zonesAdded.replace("{count}", String(toInsert.length)));
          fetchZones();
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(tz.serviceError);
    }
    setAutoGenerating(false);
  };

  const handleSaveAll = async () => {
    if (!selectedCountry || !selectedCity) {
      toast.error(tz.selectCountryAndCity);
      return;
    }
    const currentZones = zones.filter(z => z.country === selectedCountry && z.city === selectedCity);
    if (currentZones.length === 0) {
      toast.info(tz.noZonesToSave);
      return;
    }
    setSavingAll(true);
    try {
      let savedCount = 0;
      for (const z of currentZones) {
        const { error } = await supabase.from("zones").update({
          name_ar: z.name_ar,
          name_fr: z.name_fr,
          city: z.city,
          country: z.country,
          center_lat: z.center_lat,
          center_lng: z.center_lng,
          radius_km: z.radius_km,
          delivery_fee: z.delivery_fee,
          is_active: z.is_active,
        }).eq("id", z.id);
        if (!error) savedCount++;
      }
      toast.success(tz.zonesSaved.replace("{count}", String(savedCount)));
      fetchZones();
    } catch {
      toast.error(tz.saveError);
    }
    setSavingAll(false);
  };

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            {tz.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{tz.subtitle}</p>
        </div>
        <Button onClick={openCreate} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> {tz.addZone}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{countryCount}</p>
              <p className="text-xs text-muted-foreground">{tz.country}</p>
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
              <p className="text-xs text-muted-foreground">{tz.city}</p>
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
              <p className="text-xs text-muted-foreground">{tz.activeZone}</p>
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
              <p className="text-xs text-muted-foreground">{tz.avgDeliveryFee}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="glass-strong border-border">
              <CardContent className="p-4">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Globe className="w-4 h-4 text-primary" /> {tz.selectCountry}
                </Label>
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger><SelectValue placeholder={`— ${tz.selectCountry} —`} /></SelectTrigger>
                  <SelectContent>
                    {availableCountries.map(c => (
                      <SelectItem key={c} value={c}>
                        {tc(c)} ({zones.filter(z => z.country === c).length} {tz.zoneCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card className="glass-strong border-border">
              <CardContent className="p-4">
                <Label className="text-sm font-semibold flex items-center gap-2 mb-2">
                  <Building2 className="w-4 h-4 text-primary" /> {tz.selectCity}
                </Label>
                <Select value={selectedCity} onValueChange={setSelectedCity} disabled={!selectedCountry}>
                  <SelectTrigger><SelectValue placeholder={selectedCountry ? `— ${tz.selectCity} —` : tz.selectCountryFirst} /></SelectTrigger>
                  <SelectContent>
                    {availableCities.map(c => (
                      <SelectItem key={c} value={c}>
                        {c} ({zones.filter(z => z.country === selectedCountry && z.city === c).length} {tz.zoneCount})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {selectedCountry && (
            <div className="flex justify-center gap-3">
              <Button
                onClick={handleAutoGenerate}
                disabled={autoGenerating}
                variant="outline"
                className="gap-2 bg-green-600 hover:bg-green-700 text-white border-green-600"
              >
                {autoGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {autoGenerating ? tz.generating : tz.generate}
              </Button>
              <Button
                onClick={handleSaveAll}
                disabled={savingAll || !selectedCity}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {savingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {savingAll ? tz.saving : tz.save}
              </Button>
            </div>
          )}

          {selectedCountry && selectedCity && (
            <Card className="glass-strong border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <List className="w-5 h-5 text-primary" />
                  {selectedCity} — {tc(selectedCountry)}
                  <Badge variant="secondary" className="mr-2">{filteredZones.length} {tz.zoneCount}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredZones.length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">{tz.noZonesInCity}</p>
                    <Button onClick={openCreate} variant="outline" className="mt-3 gap-2">
                      <Plus className="w-4 h-4" /> {tz.addZone}
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>#</TableHead>
                          <TableHead>{tz.nameAr}</TableHead>
                          <TableHead>{tz.nameFr}</TableHead>
                          <TableHead>{tz.radiusKm}</TableHead>
                          <TableHead>{tz.deliveryFee}</TableHead>
                          <TableHead>{tz.status}</TableHead>
                          <TableHead>{tz.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredZones.map((z, idx) => (
                          <TableRow key={z.id} className="hover:bg-muted/10">
                            <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-semibold">{z.name_ar}</TableCell>
                            <TableCell className="text-muted-foreground">{z.name_fr || "—"}</TableCell>
                            <TableCell>{z.radius_km} km</TableCell>
                            <TableCell className="font-bold text-primary">{z.delivery_fee} DH</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Switch checked={z.is_active} onCheckedChange={() => toggleActive(z)} />
                                <Badge variant={z.is_active ? "default" : "secondary"} className="text-xs">
                                  {z.is_active ? tz.active : tz.inactive}
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

          {!selectedCountry && zones.length > 0 && (
            <Card className="glass-strong border-border">
              <CardContent className="py-12 text-center">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{tz.selectCountryPrompt}</p>
              </CardContent>
            </Card>
          )}

          {selectedCountry && !selectedCity && (
            <Card className="glass-strong border-border">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{tz.selectCityPrompt}</p>
              </CardContent>
            </Card>
          )}

          {zones.length === 0 && (
            <Card className="glass-strong border-border">
              <CardContent className="py-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">{tz.noZonesYet}</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-border max-w-md" dir={dir}>
          <DialogHeader>
            <DialogTitle>{editingId ? tz.editZone : tz.addNewZone}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">{tz.country} *</Label>
              <Select
                value={COUNTRIES.includes(form.country) ? form.country : "__other__"}
                onValueChange={v => {
                  if (v !== "__other__") setForm(f => ({ ...f, country: v }));
                  else setForm(f => ({ ...f, country: "" }));
                }}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder={tz.selectCountry} /></SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  <SelectItem value="__other__">{tz.otherCountry}</SelectItem>
                </SelectContent>
              </Select>
              {!COUNTRIES.includes(form.country) && (
                <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder={tz.country} className="mt-2" />
              )}
            </div>
            <div>
              <Label className="text-xs">{tz.city} *</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder={tz.cityExample} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{tz.nameAr} *</Label>
                <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} placeholder={tz.neighborhoodArExample} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{tz.nameFr}</Label>
                <Input value={form.name_fr} onChange={e => setForm(f => ({ ...f, name_fr: e.target.value }))} placeholder={tz.neighborhoodFrExample} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{tz.lat}</Label>
                <Input type="number" step="0.0001" value={form.center_lat} onChange={e => setForm(f => ({ ...f, center_lat: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{tz.lng}</Label>
                <Input type="number" step="0.0001" value={form.center_lng} onChange={e => setForm(f => ({ ...f, center_lng: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{tz.radius}</Label>
                <Input type="number" step="0.5" value={form.radius_km} onChange={e => setForm(f => ({ ...f, radius_km: parseFloat(e.target.value) || 1 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">{tz.deliveryFee} (DH)</Label>
                <Input type="number" step="1" value={form.delivery_fee} onChange={e => setForm(f => ({ ...f, delivery_fee: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-sm">{tz.activeZoneLabel}</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? tz.update : tz.add}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZonesManagement;