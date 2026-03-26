import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, Loader2, Search, Sparkles, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGeo } from "@/admin/contexts/AdminGeoContext";
import { toast } from "@/hooks/use-toast";

const SupervisorRestaurants = () => {
  const { selectedCountry, selectedCity } = useAdminGeo();
  const [stores, setStores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [generatedStores, setGeneratedStores] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const generateStoreCode = () => String(Math.floor(100000 + Math.random() * 900000));

  const fetchStores = async () => {
    setLoading(true);
    let query = supabase.from("stores").select("*").order("name");
    if (selectedCountry !== "all") query = query.eq("country", selectedCountry);
    if (selectedCity !== "all") query = query.eq("city", selectedCity);
    const { data } = await query;
    setStores(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchStores(); }, [selectedCountry, selectedCity]);

  const generateRestaurants = async () => {
    if (selectedCountry === "all") {
      toast({ title: "⚠️ اختر البلد أولاً", variant: "destructive" });
      return;
    }
    setGenerating(true);
    try {
      const cityParam = selectedCity !== "all" ? selectedCity : undefined;
      const { data, error } = await supabase.functions.invoke("google-places-search", {
        body: { city: cityParam || selectedCountry, type: "restaurants", useGoogle: true },
      });
      if (error) throw error;
      const results = data?.restaurants || [];
      const existingNames = new Set(stores.map((s: any) => s.name?.toLowerCase()));
      const newOnes = results.filter((r: any) => !existingNames.has(r.name?.toLowerCase())).map((r: any) => ({
        ...r,
        store_code: generateStoreCode(),
        commission_rate: 5,
      }));
      setGeneratedStores(newOnes);
      toast({ title: `✅ تم توليد ${newOnes.length} مطعم جديد` });
    } catch (err: any) {
      toast({ title: "خطأ في التوليد", description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const saveGeneratedStores = async () => {
    if (generatedStores.length === 0) return;
    setSaving(true);
    try {
      const toInsert = generatedStores.map((r: any) => ({
        name: r.name, address: r.address || "", area: r.area || "", phone: r.phone || "",
        rating: r.rating || 0, delivery_fee: r.delivery_fee || 10, is_open: true,
        category: r.category || "restaurant", image_url: r.image_url || "",
        google_place_id: r.google_place_id || "", lat: r.lat || null, lng: r.lng || null,
        country: selectedCountry !== "all" ? selectedCountry : "المغرب",
        city: selectedCity !== "all" ? selectedCity : "",
        commission_rate: r.commission_rate || 5, store_code: r.store_code || generateStoreCode(), is_confirmed: false,
      }));
      const { error } = await supabase.from("stores").insert(toInsert);
      if (error) throw error;
      toast({ title: `✅ تم حفظ ${toInsert.length} مطعم` });
      setGeneratedStores([]);
      fetchStores();
    } catch (err: any) {
      toast({ title: "خطأ في الحفظ", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const filtered = stores.filter(s =>
    !search || s.name?.includes(search) || (s.address || "").includes(search) || (s.phone || "").includes(search)
  );

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{stores.length} مطعم/متجر</Badge>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-orange-500" />
            المطاعم والمتاجر
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={generateRestaurants} disabled={generating} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} توليد
          </Button>
          <Button onClick={saveGeneratedStores} disabled={saving || generatedStores.length === 0} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} حفظ
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث بالاسم أو العنوان أو الهاتف" className="pr-10" />
      </div>

      {generatedStores.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              مطاعم مكتشفة ({generatedStores.length})
              <Badge variant="secondary" className="bg-green-100 text-green-700">جديد</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">#</TableHead>
                  <TableHead className="text-right">الاسم</TableHead>
                  <TableHead className="text-right">الهاتف</TableHead>
                  <TableHead className="text-right">العنوان</TableHead>
                  <TableHead className="text-right">التقييم</TableHead>
                  <TableHead className="text-right">رسوم التوصيل</TableHead>
                  <TableHead className="text-right">العمولة %</TableHead>
                  <TableHead className="text-right">رقم</TableHead>
                  <TableHead className="text-right">تأكيد</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {generatedStores.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell className="font-bold">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm" dir="ltr">{r.phone || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.address}</TableCell>
                    <TableCell>⭐ {r.rating || "—"}</TableCell>
                    <TableCell>{r.delivery_fee || 10} DH</TableCell>
                    <TableCell>{r.commission_rate || 5}%</TableCell>
                    <TableCell className="font-mono text-sm">{r.store_code || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-orange-500 border-orange-500/30">غير مؤكد</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-right">#</TableHead>
              <TableHead className="text-right">الاسم</TableHead>
              <TableHead className="text-right">الهاتف</TableHead>
              <TableHead className="text-right">العنوان</TableHead>
              <TableHead className="text-right">التقييم</TableHead>
              <TableHead className="text-right">رسوم التوصيل</TableHead>
              <TableHead className="text-right">العمولة %</TableHead>
              <TableHead className="text-right">رقم</TableHead>
              <TableHead className="text-center">تأكيد</TableHead>
              <TableHead className="text-center">الحالة</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">لا توجد مطاعم</TableCell>
              </TableRow>
            ) : filtered.map((s, idx) => (
              <TableRow key={s.id}>
                <TableCell className="font-bold text-muted-foreground">{idx + 1}</TableCell>
                <TableCell className="font-medium text-right">{s.name}</TableCell>
                <TableCell className="text-muted-foreground text-sm" dir="ltr">{s.phone || "—"}</TableCell>
                <TableCell className="text-right text-muted-foreground text-sm">{s.address || "—"}</TableCell>
                <TableCell>{s.rating ? `⭐ ${Number(s.rating).toFixed(1)}` : "—"}</TableCell>
                <TableCell>{s.delivery_fee} DH</TableCell>
                <TableCell>{s.commission_rate ?? 5}%</TableCell>
                <TableCell className="font-mono text-sm">{s.store_code || "—"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="outline" className={s.is_confirmed ? "text-emerald-500 border-emerald-500/30" : "text-orange-500 border-orange-500/30"}>
                    {s.is_confirmed ? "مؤكد" : "غير مؤكد"}
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className={s.is_open
                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                    : "bg-destructive/15 text-destructive border-destructive/30"
                  }>
                    {s.is_open ? "مفتوح" : "مغلق"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </motion.div>
  );
};

export default SupervisorRestaurants;
