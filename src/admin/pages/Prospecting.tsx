import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, Loader2, MapPin, Phone, Star, Globe, Store, Bike, Truck, UtensilsCrossed, Send, Database, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ProspectResult = {
  name: string;
  address: string;
  area: string;
  phone: string;
  rating: number;
  website?: string;
  google_place_id: string;
  category: string;
};

type DBProspect = ProspectResult & {
  id: string;
  city: string;
  email: string;
  mailbluster_synced: boolean;
  source: string;
  status: string;
  created_at: string;
};

const BUSINESS_TYPES = [
  { value: "restaurant", label: "🍽️ مطاعم", icon: UtensilsCrossed },
  { value: "cafe", label: "☕ مقاهي", icon: Store },
  { value: "grocery_or_supermarket", label: "🛒 بقالة / سوبرماركت", icon: Store },
  { value: "bakery", label: "🥖 مخابز", icon: Store },
  { value: "pharmacy", label: "💊 صيدليات", icon: Store },
  { value: "clothing_store", label: "👕 ملابس", icon: Store },
  { value: "electronics_store", label: "📱 إلكترونيات", icon: Store },
  { value: "florist", label: "🌸 بائع زهور", icon: Store },
  { value: "courier", label: "🏍️ خدمات توصيل / سعاة", icon: Bike },
  { value: "moving_company", label: "🚚 نقل وشحن", icon: Truck },
  { value: "store", label: "🏪 محلات تجارية (عام)", icon: Store },
];

const CITIES = [
  "طنجة", "مراكش", "الدار البيضاء", "الرباط", "فاس", "أكادير",
  "مكناس", "وجدة", "تطوان", "القنيطرة",
];

const Prospecting = () => {
  const [city, setCity] = useState("طنجة");
  const [customCity, setCustomCity] = useState("");
  const [businessType, setBusinessType] = useState("restaurant");
  const [area, setArea] = useState("");
  const [results, setResults] = useState<ProspectResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("search");

  // DB prospects state
  const [dbProspects, setDbProspects] = useState<DBProspect[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbFilter, setDbFilter] = useState("all");
  const [dbCityFilter, setDbCityFilter] = useState("all");
  const [dbTotal, setDbTotal] = useState(0);
  const [triggeringAuto, setTriggeringAuto] = useState(false);

  const loadDbProspects = useCallback(async () => {
    setDbLoading(true);
    try {
      let query = supabase
        .from("prospects")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(200);

      if (dbFilter !== "all") query = query.eq("category", dbFilter);
      if (dbCityFilter !== "all") query = query.eq("city", dbCityFilter);

      const { data, error, count } = await query;
      if (error) throw error;
      setDbProspects((data || []) as unknown as DBProspect[]);
      setDbTotal(count || 0);
    } catch (e: any) {
      toast.error("فشل تحميل البيانات: " + e.message);
    } finally {
      setDbLoading(false);
    }
  }, [dbFilter, dbCityFilter]);

  useEffect(() => {
    if (activeTab === "database") loadDbProspects();
  }, [activeTab, loadDbProspects]);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setResults([]);
    setSelected(new Set());
    try {
      const searchCity = customCity.trim() || city;
      const { data, error } = await supabase.functions.invoke("google-places-search", {
        body: { city: searchCity, type: businessType, useGoogle: true, area: area.trim() || undefined },
      });
      if (error) throw error;
      const items = (data?.restaurants || []).map((r: any) => ({
        name: r.name,
        address: r.address,
        area: r.area,
        phone: r.phone,
        rating: r.rating,
        website: r.website || "",
        google_place_id: r.google_place_id,
        category: r.category || businessType,
      }));
      setResults(items);
      toast.success(`تم العثور على ${items.length} نتيجة`);
    } catch (e: any) {
      console.error(e);
      toast.error("فشل البحث: " + (e.message || "خطأ"));
    } finally {
      setLoading(false);
    }
  }, [city, customCity, businessType, area]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.google_place_id)));
    }
  };

  const exportCSV = () => {
    const items = results.filter((r) => selected.has(r.google_place_id));
    if (!items.length) { toast.error("اختر عنصراً واحداً على الأقل"); return; }
    const header = "Name,Phone,Email,Address,Area,Rating,Website,Category,Google Place ID";
    const rows = items.map((r) =>
      [r.name, r.phone, "", r.address, r.area, r.rating, r.website || "", r.category, r.google_place_id]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prospects-${city}-${businessType}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`تم تصدير ${items.length} عنصر`);
  };

  const syncToMailBluster = async () => {
    const items = results.filter((r) => selected.has(r.google_place_id));
    if (!items.length) { toast.error("اختر عنصراً واحداً على الأقل"); return; }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("mailbluster-sync", {
        body: {
          action: "sync_leads",
          leads: items.map((r) => ({
            name: r.name, phone: r.phone, address: r.address, area: r.area,
            category: r.category, website: r.website, rating: r.rating, google_place_id: r.google_place_id,
          })),
        },
      });
      if (error) throw error;
      toast.success(`تم إرسال ${data?.synced || 0} جهة اتصال إلى MailBluster`);
      if (data?.failed > 0) toast.warning(`فشل إرسال ${data.failed} جهة اتصال`);
    } catch (e: any) {
      console.error(e);
      toast.error("فشل الإرسال: " + (e.message || "خطأ"));
    } finally {
      setSyncing(false);
    }
  };

  const saveToDatabase = async () => {
    const items = results.filter((r) => selected.has(r.google_place_id));
    if (!items.length) { toast.error("اختر عنصراً واحداً على الأقل"); return; }
    setSyncing(true);
    try {
      const searchCity = customCity.trim() || city;
      const rows = items.map((r) => ({
        name: r.name, phone: r.phone, address: r.address, area: r.area,
        city: searchCity, category: r.category, rating: r.rating,
        website: r.website || "", google_place_id: r.google_place_id, source: "google_manual",
      }));
      const { error } = await supabase.from("prospects").upsert(rows, { onConflict: "google_place_id" });
      if (error) throw error;
      toast.success(`تم حفظ ${items.length} شريك في قاعدة البيانات`);
    } catch (e: any) {
      toast.error("فشل الحفظ: " + (e.message || "خطأ"));
    } finally {
      setSyncing(false);
    }
  };

  const triggerAutoProspect = async () => {
    setTriggeringAuto(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-prospect", {
        body: { sync_mailbluster: true },
      });
      if (error) throw error;
      toast.success(`تم جمع ${data?.new_prospects || 0} شريك جديد | MailBluster: ${data?.mailbluster_synced || 0}`);
      if (data?.errors?.length > 0) {
        console.warn("Auto-prospect errors:", data.errors);
      }
      loadDbProspects();
    } catch (e: any) {
      toast.error("فشل التنقيب التلقائي: " + (e.message || "خطأ"));
    } finally {
      setTriggeringAuto(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Search className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">التنقيب عن الشركاء</h1>
            <p className="text-muted-foreground text-sm">
              جمع تلقائي ويدوي للمطاعم والمحلات وخدمات التوصيل + إرسال إلى MailBluster
            </p>
          </div>
        </div>
        <Button onClick={triggerAutoProspect} disabled={triggeringAuto} variant="outline" className="gap-2">
          {triggeringAuto ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {triggeringAuto ? "جاري التنقيب..." : "تشغيل التنقيب التلقائي"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="search" className="gap-2"><Search className="w-4 h-4" /> بحث يدوي</TabsTrigger>
          <TabsTrigger value="database" className="gap-2"><Database className="w-4 h-4" /> قاعدة البيانات ({dbTotal})</TabsTrigger>
        </TabsList>

        {/* Manual Search Tab */}
        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5" /> فلاتر البحث
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">المدينة</label>
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CITIES.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                    </SelectContent>
                  </Select>
                  <Input placeholder="أو أدخل مدينة أخرى..." value={customCity} onChange={(e) => setCustomCity(e.target.value)} className="mt-1" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">نوع النشاط</label>
                  <Select value={businessType} onValueChange={setBusinessType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((bt) => (<SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">الحي / المنطقة (اختياري)</label>
                  <Input placeholder="مثال: المدينة القديمة" value={area} onChange={(e) => setArea(e.target.value)} />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleSearch} disabled={loading} className="w-full gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    {loading ? "جاري البحث..." : "بحث"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {results.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                  النتائج ({results.length})
                  {selected.size > 0 && <Badge variant="secondary" className="mr-2">{selected.size} مختار</Badge>}
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={saveToDatabase} disabled={syncing || selected.size === 0} variant="secondary" className="gap-2">
                    <Database className="w-4 h-4" /> حفظ في قاعدة البيانات
                  </Button>
                  <Button onClick={syncToMailBluster} disabled={syncing || selected.size === 0} variant="default" className="gap-2">
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    إرسال إلى MailBluster
                  </Button>
                  <Button onClick={exportCSV} variant="outline" className="gap-2">
                    <Download className="w-4 h-4" /> CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox checked={selected.size === results.length && results.length > 0} onCheckedChange={toggleAll} />
                      </TableHead>
                      <TableHead>الاسم</TableHead>
                      <TableHead>الهاتف</TableHead>
                      <TableHead>العنوان</TableHead>
                      <TableHead>الحي</TableHead>
                      <TableHead>التقييم</TableHead>
                      <TableHead>الموقع</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r) => (
                      <TableRow key={r.google_place_id}>
                        <TableCell><Checkbox checked={selected.has(r.google_place_id)} onCheckedChange={() => toggleSelect(r.google_place_id)} /></TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>
                          {r.phone ? <span className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3" /> {r.phone}</span> : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{r.address}</TableCell>
                        <TableCell><Badge variant="outline">{r.area || "—"}</Badge></TableCell>
                        <TableCell><span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {r.rating}</span></TableCell>
                        <TableCell>
                          {r.website ? <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1"><Globe className="w-3 h-3" /> زيارة</a> : <span className="text-muted-foreground text-xs">—</span>}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {results.length === 0 && !loading && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>ابحث عن المحلات والمطاعم وخدمات التوصيل في مدينتك</p>
                <p className="text-xs mt-1">النتائج تأتي من Google Places API</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" /> الشركاء المحتملين المُجمَّعين ({dbTotal})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3 mb-4 flex-wrap">
                <Select value={dbFilter} onValueChange={setDbFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="الفئة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    {BUSINESS_TYPES.map((bt) => (<SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={dbCityFilter} onValueChange={setDbCityFilter}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="المدينة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المدن</SelectItem>
                    <SelectItem value="Tanger">طنجة</SelectItem>
                    <SelectItem value="Marrakech">مراكش</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadDbProspects} variant="outline" size="icon" disabled={dbLoading}>
                  <RefreshCw className={`w-4 h-4 ${dbLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {dbLoading ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>المدينة</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>التقييم</TableHead>
                        <TableHead>MailBluster</TableHead>
                        <TableHead>المصدر</TableHead>
                        <TableHead>التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbProspects.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell><Badge variant="outline">{BUSINESS_TYPES.find(b => b.value === p.category)?.label || p.category}</Badge></TableCell>
                          <TableCell>{p.city}</TableCell>
                          <TableCell>
                            {p.phone ? <span className="flex items-center gap-1 text-sm"><Phone className="w-3 h-3" /> {p.phone}</span> : "—"}
                          </TableCell>
                          <TableCell><span className="flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {p.rating}</span></TableCell>
                          <TableCell>
                            {p.mailbluster_synced ? (
                              <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="w-3 h-3" /> مُرسَل</Badge>
                            ) : (
                              <Badge variant="secondary">في الانتظار</Badge>
                            )}
                          </TableCell>
                          <TableCell><Badge variant="outline">{p.source === "google_auto" ? "تلقائي" : "يدوي"}</Badge></TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("ar-MA")}</TableCell>
                        </TableRow>
                      ))}
                      {dbProspects.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            لا توجد بيانات بعد. اضغط "تشغيل التنقيب التلقائي" لبدء الجمع
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Prospecting;
