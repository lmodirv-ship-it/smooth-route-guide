import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Download, Loader2, MapPin, Phone, Star, Globe, Store, Bike, Truck, UtensilsCrossed, Send } from "lucide-react";
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
    if (!items.length) {
      toast.error("اختر عنصراً واحداً على الأقل");
      return;
    }
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
    if (!items.length) {
      toast.error("اختر عنصراً واحداً على الأقل");
      return;
    }
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("mailbluster-sync", {
        body: {
          action: "sync_leads",
          leads: items.map((r) => ({
            name: r.name,
            phone: r.phone,
            address: r.address,
            area: r.area,
            category: r.category,
            website: r.website,
            rating: r.rating,
            google_place_id: r.google_place_id,
          })),
        },
      });
      if (error) throw error;
      toast.success(`تم إرسال ${data?.synced || 0} جهة اتصال إلى MailBluster`);
      if (data?.failed > 0) {
        toast.warning(`فشل إرسال ${data.failed} جهة اتصال`);
      }
    } catch (e: any) {
      console.error(e);
      toast.error("فشل الإرسال: " + (e.message || "خطأ"));
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center gap-3">
        <Search className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">التنقيب عن الشركاء</h1>
          <p className="text-muted-foreground text-sm">
            ابحث عن المطاعم والمحلات وخدمات التوصيل وصدّر النتائج لحملات التسويق
          </p>
        </div>
      </div>

      {/* Search Filters */}
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
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="أو أدخل مدينة أخرى..."
                value={customCity}
                onChange={(e) => setCustomCity(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">نوع النشاط</label>
              <Select value={businessType} onValueChange={setBusinessType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BUSINESS_TYPES.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>{bt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">الحي / المنطقة (اختياري)</label>
              <Input
                placeholder="مثال: المدينة القديمة"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
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

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              النتائج ({results.length})
              {selected.size > 0 && (
                <Badge variant="secondary" className="mr-2">{selected.size} مختار</Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={syncToMailBluster} disabled={syncing || selected.size === 0} variant="default" className="gap-2">
                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {syncing ? "جاري الإرسال..." : `إرسال إلى MailBluster (${selected.size})`}
              </Button>
              <Button onClick={exportCSV} variant="outline" className="gap-2">
                <Download className="w-4 h-4" /> تصدير CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selected.size === results.length && results.length > 0}
                      onCheckedChange={toggleAll}
                    />
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
                    <TableCell>
                      <Checkbox
                        checked={selected.has(r.google_place_id)}
                        onCheckedChange={() => toggleSelect(r.google_place_id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>
                      {r.phone ? (
                        <span className="flex items-center gap-1 text-sm">
                          <Phone className="w-3 h-3" /> {r.phone}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">{r.address}</TableCell>
                    <TableCell><Badge variant="outline">{r.area || "—"}</Badge></TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {r.rating}
                      </span>
                    </TableCell>
                    <TableCell>
                      {r.website ? (
                        <a href={r.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                          <Globe className="w-3 h-3" /> زيارة
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
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
    </div>
  );
};

export default Prospecting;
