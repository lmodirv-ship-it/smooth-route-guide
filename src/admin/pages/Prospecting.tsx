import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search, Download, Loader2, MapPin, Phone, Star, Globe, Store, Bike, Truck,
  UtensilsCrossed, Send, Database, RefreshCw, CheckCircle2, Users, Building2,
  PhoneCall, TrendingUp, Eye, MailCheck, AlertCircle, Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProspectDetailSheet from "@/admin/components/ProspectDetailSheet";
import { toast } from "sonner";

type ProspectResult = {
  name: string;
  address: string;
  area: string;
  phone: string;
  email: string;
  rating: number;
  website?: string;
  google_place_id: string;
  category: string;
};

type DBProspect = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  area: string;
  city: string;
  country: string;
  category: string;
  rating: number;
  website: string;
  google_place_id: string;
  mailbluster_synced: boolean;
  source: string;
  status: string;
  notes: string;
  call_status: string;
  call_priority: string;
  call_notes: string;
  created_at: string;
  prospect_code: string;
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

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  new: { label: "جديد", color: "bg-blue-100 text-blue-800" },
  contacted: { label: "تم التواصل", color: "bg-yellow-100 text-yellow-800" },
  interested: { label: "مهتم", color: "bg-green-100 text-green-800" },
  not_interested: { label: "غير مهتم", color: "bg-red-100 text-red-800" },
  converted: { label: "شريك ✓", color: "bg-emerald-100 text-emerald-800" },
};

const CALL_STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "في الانتظار", color: "bg-gray-100 text-gray-700" },
  no_phone: { label: "بدون هاتف", color: "bg-red-50 text-red-600" },
  called: { label: "تم الاتصال", color: "bg-green-100 text-green-700" },
  no_answer: { label: "لم يرد", color: "bg-yellow-100 text-yellow-700" },
  callback: { label: "إعادة اتصال", color: "bg-purple-100 text-purple-700" },
};

type Stats = {
  total: number;
  withPhone: number;
  synced: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
};

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

  // DB state
  const [dbProspects, setDbProspects] = useState<DBProspect[]>([]);
  const [dbLoading, setDbLoading] = useState(false);
  const [dbFilter, setDbFilter] = useState("all");
  const [dbCityFilter, setDbCityFilter] = useState("all");
  const [dbStatusFilter, setDbStatusFilter] = useState("all");
  const [dbTotal, setDbTotal] = useState(0);
  const [triggeringAuto, setTriggeringAuto] = useState(false);
  const [dbCities, setDbCities] = useState<string[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, withPhone: 0, synced: 0, byStatus: {}, byCategory: {} });

  // New: text search, bulk selection, detail sheet, priority filter
  const [dbSearch, setDbSearch] = useState("");
  const [dbPriorityFilter, setDbPriorityFilter] = useState("all");
  const [dbRatingFilter, setDbRatingFilter] = useState("all");
  const [dbSelected, setDbSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<DBProspect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Load stats
  const loadStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("prospects").select("status, category, phone, mailbluster_synced");
      if (error) throw error;
      const rows = data || [];
      const byStatus: Record<string, number> = {};
      const byCategory: Record<string, number> = {};
      let withPhone = 0;
      let synced = 0;
      for (const r of rows) {
        byStatus[r.status || "new"] = (byStatus[r.status || "new"] || 0) + 1;
        byCategory[r.category] = (byCategory[r.category] || 0) + 1;
        if (r.phone) withPhone++;
        if (r.mailbluster_synced) synced++;
      }
      setStats({ total: rows.length, withPhone, synced, byStatus, byCategory });
    } catch {}
  }, []);

  // Load distinct cities from DB
  const loadCities = useCallback(async () => {
    try {
      const { data } = await supabase.from("prospects").select("city");
      if (data) {
        const unique = [...new Set(data.map((d: any) => d.city).filter(Boolean))];
        setDbCities(unique.sort());
      }
    } catch {}
  }, []);

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
      if (dbStatusFilter !== "all") query = query.eq("status", dbStatusFilter);
      if (dbPriorityFilter !== "all") query = query.eq("call_priority", dbPriorityFilter);
      if (dbRatingFilter === "high") query = query.gte("rating", 4);
      if (dbSearch.trim()) {
        query = query.or(`name.ilike.%${dbSearch.trim()}%,phone.ilike.%${dbSearch.trim()}%,email.ilike.%${dbSearch.trim()}%,prospect_code.ilike.%${dbSearch.trim()}%`);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setDbProspects((data || []) as unknown as DBProspect[]);
      setDbTotal(count || 0);
      setDbSelected(new Set());
    } catch (e: any) {
      toast.error("فشل تحميل البيانات: " + e.message);
    } finally {
      setDbLoading(false);
    }
  }, [dbFilter, dbCityFilter, dbStatusFilter, dbPriorityFilter, dbRatingFilter, dbSearch]);

  useEffect(() => {
    loadStats();
    loadCities();
  }, [loadStats, loadCities]);

  useEffect(() => {
    if (activeTab === "database") loadDbProspects();
  }, [activeTab, loadDbProspects]);

  // Bulk actions
  const toggleDbSelect = (id: string) => {
    setDbSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleDbSelectAll = () => {
    if (dbSelected.size === dbProspects.length) setDbSelected(new Set());
    else setDbSelected(new Set(dbProspects.map((p) => p.id)));
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (dbSelected.size === 0) return;
    setBulkAction(true);
    try {
      const ids = Array.from(dbSelected);
      const { error } = await supabase
        .from("prospects")
        .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
        .in("id", ids);
      if (error) throw error;
      toast.success(`تم تحديث ${ids.length} شريك إلى "${STATUS_MAP[newStatus]?.label || newStatus}"`);
      loadDbProspects();
      loadStats();
    } catch (e: any) {
      toast.error("فشل التحديث: " + e.message);
    } finally {
      setBulkAction(false);
    }
  };

  const bulkDelete = async () => {
    if (dbSelected.size === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${dbSelected.size} شريك محتمل؟`)) return;
    setBulkAction(true);
    try {
      const ids = Array.from(dbSelected);
      const { error } = await supabase.from("prospects").delete().in("id", ids);
      if (error) throw error;
      toast.success(`تم حذف ${ids.length} شريك`);
      loadDbProspects();
      loadStats();
    } catch (e: any) {
      toast.error("فشل الحذف: " + e.message);
    } finally {
      setBulkAction(false);
    }
  };

  const bulkSyncMailBluster = async () => {
    if (dbSelected.size === 0) return;
    setBulkAction(true);
    try {
      const selectedProspects = dbProspects.filter((p) => dbSelected.has(p.id));
      const { data, error } = await supabase.functions.invoke("mailbluster-sync", {
        body: {
          action: "sync_leads",
          leads: selectedProspects.map((r) => ({
            name: r.name, phone: r.phone, address: r.address, area: r.area,
            category: r.category, website: r.website, rating: r.rating, google_place_id: r.google_place_id,
          })),
        },
      });
      if (error) throw error;
      toast.success(`تم إرسال ${data?.synced || 0} جهة اتصال إلى MailBluster`);
      loadDbProspects();
    } catch (e: any) {
      toast.error("فشل الإرسال: " + e.message);
    } finally {
      setBulkAction(false);
    }
  };

  const openProspectDetail = (p: DBProspect) => {
    setSelectedProspect(p);
    setDetailOpen(true);
  };

  const handleProspectUpdate = (updated: DBProspect) => {
    setDbProspects((prev) => prev.map((p) => p.id === updated.id ? updated : p));
    setSelectedProspect(updated);
    loadStats();
  };

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
        email: r.email || "",
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
    if (selected.size === results.length) setSelected(new Set());
    else setSelected(new Set(results.map((r) => r.google_place_id)));
  };

  const exportCSV = () => {
    const items = results.filter((r) => selected.has(r.google_place_id));
    if (!items.length) { toast.error("اختر عنصراً واحداً على الأقل"); return; }
    const header = "Name,Phone,Email,Address,Area,Rating,Website,Category,Google Place ID";
    const rows = items.map((r) =>
      [r.name, r.phone, r.email || "", r.address, r.area, r.rating, r.website || "", r.category, r.google_place_id]
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
        name: r.name, phone: r.phone, email: r.email || "", address: r.address, area: r.area,
        city: searchCity, country: "Morocco", category: r.category, rating: r.rating,
        website: r.website || "", google_place_id: r.google_place_id, source: "google_manual",
        status: "new", call_status: r.phone ? "pending" : "no_phone",
        call_priority: Number(r.rating) >= 4 ? "high" : "normal",
      }));
      const { error } = await supabase.from("prospects").upsert(rows, { onConflict: "google_place_id" });
      if (error) throw error;
      toast.success(`تم حفظ ${items.length} شريك في قاعدة البيانات`);
      loadStats();
      loadCities();
    } catch (e: any) {
      toast.error("فشل الحفظ: " + (e.message || "خطأ"));
    } finally {
      setSyncing(false);
    }
  };

  const updateProspectStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase.from("prospects").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
      setDbProspects((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
      loadStats();
      toast.success("تم تحديث الحالة");
    } catch (e: any) {
      toast.error("فشل التحديث: " + e.message);
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
      if (data?.errors?.length > 0) console.warn("Auto-prospect errors:", data.errors);
      loadDbProspects();
      loadStats();
      loadCities();
    } catch (e: any) {
      toast.error("فشل التنقيب التلقائي: " + (e.message || "خطأ"));
    } finally {
      setTriggeringAuto(false);
    }
  };

  const topCategories = Object.entries(stats.byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Search className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">التنقيب عن الشركاء</h1>
            <p className="text-muted-foreground text-sm">
              جمع تلقائي ويدوي للمطاعم والمحلات + حفظ في قاعدة البيانات
            </p>
          </div>
        </div>
        <Button onClick={triggerAutoProspect} disabled={triggeringAuto} className="gap-2">
          {triggeringAuto ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          {triggeringAuto ? "جاري التنقيب..." : "تشغيل التنقيب التلقائي"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100"><Building2 className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
              <p className="text-xs text-blue-600">إجمالي الشركاء المحتملين</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100"><PhoneCall className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-2xl font-bold text-green-700">{stats.withPhone}</p>
              <p className="text-xs text-green-600">لديهم هاتف</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100"><MailCheck className="w-5 h-5 text-purple-600" /></div>
            <div>
              <p className="text-2xl font-bold text-purple-700">{stats.synced}</p>
              <p className="text-xs text-purple-600">مُرسَل لـ MailBluster</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100"><TrendingUp className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{stats.byStatus?.converted || 0}</p>
              <p className="text-xs text-amber-600">تم التحويل لشريك</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status breakdown mini-bar */}
      {stats.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">توزيع الحالات:</span>
              {Object.entries(STATUS_MAP).map(([key, { label, color }]) => (
                <Badge key={key} className={`${color} gap-1`}>
                  {label}: {stats.byStatus[key] || 0}
                </Badge>
              ))}
            </div>
            {topCategories.length > 0 && (
              <div className="flex items-center gap-4 flex-wrap mt-3">
                <span className="text-sm font-medium text-muted-foreground">أعلى الفئات:</span>
                {topCategories.map(([cat, count]) => (
                  <Badge key={cat} variant="outline" className="gap-1">
                    {BUSINESS_TYPES.find(b => b.value === cat)?.label || cat}: {count}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="search" className="gap-2"><Search className="w-4 h-4" /> بحث يدوي</TabsTrigger>
          <TabsTrigger value="database" className="gap-2"><Database className="w-4 h-4" /> قاعدة البيانات ({stats.total})</TabsTrigger>
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
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-lg">
                  النتائج ({results.length})
                  {selected.size > 0 && <Badge variant="secondary" className="mr-2">{selected.size} مختار</Badge>}
                </CardTitle>
                <div className="flex gap-2 flex-wrap">
                  <Button onClick={saveToDatabase} disabled={syncing || selected.size === 0} variant="default" className="gap-2">
                    {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                    حفظ في قاعدة البيانات
                  </Button>
                  <Button onClick={syncToMailBluster} disabled={syncing || selected.size === 0} variant="secondary" className="gap-2">
                    <Send className="w-4 h-4" /> إرسال إلى MailBluster
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
                      <TableHead>الإيميل</TableHead>
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
                        <TableCell>
                          {r.email ? <a href={`mailto:${r.email}`} className="text-primary hover:underline text-sm">{r.email}</a> : <span className="text-muted-foreground text-xs">—</span>}
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
                <p className="text-xs mt-1">النتائج تأتي من Google Places API وتُحفظ مباشرة في قاعدة البيانات</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Database Tab */}
        <TabsContent value="database" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Database className="w-5 h-5" /> الشركاء المحتملين ({dbTotal})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Search bar */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث بالاسم، الهاتف، أو الرمز..."
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && loadDbProspects()}
                    className="pr-9"
                  />
                </div>
                <Select value={dbCityFilter} onValueChange={setDbCityFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="المدينة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المدن</SelectItem>
                    {dbCities.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={dbFilter} onValueChange={setDbFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="الفئة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الفئات</SelectItem>
                    {BUSINESS_TYPES.map((bt) => (<SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={dbStatusFilter} onValueChange={setDbStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الحالات</SelectItem>
                    {Object.entries(STATUS_MAP).map(([k, v]) => (<SelectItem key={k} value={k}>{v.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                <Select value={dbPriorityFilter} onValueChange={setDbPriorityFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="الأولوية" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأولويات</SelectItem>
                    <SelectItem value="high">عالية</SelectItem>
                    <SelectItem value="normal">عادية</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={dbRatingFilter} onValueChange={setDbRatingFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="التقييم" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع التقييمات</SelectItem>
                    <SelectItem value="high">4+ نجوم</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadDbProspects} variant="outline" size="icon" disabled={dbLoading}>
                  <RefreshCw className={`w-4 h-4 ${dbLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {/* Bulk Action Toolbar */}
              {dbSelected.size > 0 && (
                <div className="flex items-center gap-2 mb-4 p-3 rounded-lg bg-muted/50 border flex-wrap">
                  <Badge variant="secondary">{dbSelected.size} مختار</Badge>
                  <Select onValueChange={(v) => bulkUpdateStatus(v)}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="تغيير الحالة" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_MAP).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={bulkSyncMailBluster} disabled={bulkAction} variant="outline" size="sm" className="gap-1.5">
                    {bulkAction ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    MailBluster
                  </Button>
                  <Button onClick={bulkDelete} disabled={bulkAction} variant="destructive" size="sm" className="gap-1.5">
                    <Trash2 className="w-3.5 h-3.5" /> حذف
                  </Button>
                </div>
              )}

              {dbLoading ? (
                <div className="py-12 text-center"><Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={dbSelected.size === dbProspects.length && dbProspects.length > 0}
                            onCheckedChange={toggleDbSelectAll}
                          />
                        </TableHead>
                        <TableHead>الرمز</TableHead>
                        <TableHead>الاسم</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>المدينة</TableHead>
                        <TableHead>الهاتف</TableHead>
                        <TableHead>الإيميل</TableHead>
                        <TableHead>التقييم</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>الاتصال</TableHead>
                        <TableHead>MailBluster</TableHead>
                        <TableHead>التاريخ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbProspects.map((p) => {
                        const statusInfo = STATUS_MAP[p.status] || STATUS_MAP.new;
                        const callInfo = CALL_STATUS_MAP[p.call_status] || CALL_STATUS_MAP.pending;
                        return (
                          <TableRow key={p.id} className="cursor-pointer" onClick={() => openProspectDetail(p)}>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={dbSelected.has(p.id)}
                                onCheckedChange={() => toggleDbSelect(p.id)}
                              />
                            </TableCell>
                            <TableCell className="font-mono text-xs font-bold text-primary">{p.prospect_code || "—"}</TableCell>
                            <TableCell className="font-medium max-w-[180px] truncate">{p.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {BUSINESS_TYPES.find(b => b.value === p.category)?.label || p.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{p.city}</TableCell>
                            <TableCell>
                              {p.phone ? (
                                <span className="flex items-center gap-1 text-sm">
                                  <Phone className="w-3 h-3" /> {p.phone}
                                </span>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell>
                              {p.email ? (
                                <a href={`mailto:${p.email}`} className="text-primary hover:underline text-sm truncate max-w-[180px] block">{p.email}</a>
                              ) : <span className="text-muted-foreground text-xs">—</span>}
                            </TableCell>
                            <TableCell>
                              <span className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {p.rating || 0}
                              </span>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <Select value={p.status || "new"} onValueChange={(v) => updateProspectStatus(p.id, v)}>
                                <SelectTrigger className="h-7 text-xs w-[120px] p-1">
                                  <Badge className={`${statusInfo.color} text-xs`}>{statusInfo.label}</Badge>
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(STATUS_MAP).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${callInfo.color} text-xs`}>{callInfo.label}</Badge>
                            </TableCell>
                            <TableCell>
                              {p.mailbluster_synced ? (
                                <Badge className="bg-green-100 text-green-800 gap-1 text-xs"><CheckCircle2 className="w-3 h-3" /> مُرسَل</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">—</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {new Date(p.created_at).toLocaleDateString("ar-MA")}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {dbProspects.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            لا توجد بيانات. ابحث يدوياً أو شغّل التنقيب التلقائي لبدء الجمع
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

      {/* Prospect Detail Sheet */}
      <ProspectDetailSheet
        prospect={selectedProspect}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onUpdate={handleProspectUpdate}
      />
    </div>
  );
};

export default Prospecting;
