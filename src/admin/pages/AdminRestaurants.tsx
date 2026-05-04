import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminGeo } from "@/admin/contexts/AdminGeoContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Store, UtensilsCrossed, Loader2, Sparkles, Save, RefreshCw, ListPlus } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CsvMenuImport from "@/admin/components/CsvMenuImport";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/i18n/context";

const AdminRestaurants = () => {
  const { t, dir } = useI18n();
  const tr = t.restaurantAdmin;
  const { selectedCountry, selectedCity } = useAdminGeo();
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [storeForm, setStoreForm] = useState({ name: "", description: "", address: "", phone: "", email: "", delivery_fee: 10, delivery_time_min: 20, delivery_time_max: 40, rating: 4.5, commission_rate: 5 });
  const [itemForm, setItemForm] = useState({ name_ar: "", name_fr: "", description_ar: "", price: 0, category_id: "", is_available: true });
  const [generatedStores, setGeneratedStores] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoMenu, setAutoMenu] = useState(true);
  const [generatingMenuFor, setGeneratingMenuFor] = useState<string | null>(null);
  const [bulkMenuProgress, setBulkMenuProgress] = useState<{ current: number; total: number } | null>(null);

  const generateMenusForAllEmpty = async () => {
    const emptyStores = stores.filter(
      (s) => !menuItems.some((i) => i.store_id === s.id) || !s.email || s.email.trim() === ""
    );
    if (!emptyStores.length) {
      toast({ title: "✅ كل المطاعم لديها قوائم وإيمايل" });
      return;
    }
    if (!confirm(`سيتم توليد قوائم/إيمايلات لـ ${emptyStores.length} مطعم. هل تريد المتابعة؟`)) return;
    setBulkMenuProgress({ current: 0, total: emptyStores.length });
    let ok = 0, fail = 0;
    for (let i = 0; i < emptyStores.length; i++) {
      const st = emptyStores[i];
      setBulkMenuProgress({ current: i + 1, total: emptyStores.length });
      try {
        const { cats, items } = await generateMenuForStore(st);
        if (cats > 0 && items > 0) ok++; else fail++;
      } catch (e) {
        console.error("bulk menu fail", st.name, e);
        fail++;
      }
    }
    setBulkMenuProgress(null);
    toast({ title: `✅ تم: ${ok} | ❌ فشل: ${fail}` });
    fetchAll();
  };

  // Generate menu for one store via AI and persist to DB
  const generateMenuForStore = async (store: any): Promise<{ cats: number; items: number }> => {
    const { data, error } = await supabase.functions.invoke("generate-menu", {
      body: {
        restaurantName: store.name,
        restaurantCategory: store.category || "restaurant",
        restaurantAddress: store.address || "",
      },
    });
    if (error) throw error;
    const menu = data?.menu;
    if (!menu?.categories?.length) throw new Error("AI returned empty menu");

    let catCount = 0, itemCount = 0;
    const errors: string[] = [];
    for (let i = 0; i < menu.categories.length; i++) {
      const c = menu.categories[i];
      const { data: catRow, error: catErr } = await supabase
        .from("menu_categories")
        .insert({ store_id: store.id, name_ar: c.name_ar, name_fr: c.name_fr || c.name_ar, sort_order: i })
        .select("id").single();
      if (catErr) {
        console.error("[generateMenuForStore] category insert failed", catErr, { store: store.name });
        errors.push(`cat: ${catErr.message}`);
        continue;
      }
      catCount++;
      const itemsPayload = (c.items || []).map((it: any, j: number) => ({
        store_id: store.id,
        category_id: catRow.id,
        name_ar: it.name_ar,
        name_fr: it.name_fr || it.name_ar,
        description_ar: it.description_ar || "",
        price: Number(it.price) || 0,
        is_available: true,
        sort_order: j,
      }));
      if (itemsPayload.length) {
        const { error: itErr } = await supabase.from("menu_items").insert(itemsPayload);
        if (itErr) {
          console.error("[generateMenuForStore] items insert failed", itErr, { store: store.name });
          errors.push(`items: ${itErr.message}`);
        } else {
          itemCount += itemsPayload.length;
        }
      }
    }
    if (catCount === 0 && errors.length) {
      throw new Error(errors[0]);
    }
    return { cats: catCount, items: itemCount };
  };

  const regenerateMenuForStore = async (store: any) => {
    setGeneratingMenuFor(store.id);
    try {
      // Wipe existing
      await supabase.from("menu_items").delete().eq("store_id", store.id);
      await supabase.from("menu_categories").delete().eq("store_id", store.id);
      const { cats, items } = await generateMenuForStore(store);
      toast({ title: `✅ ${store.name}: ${cats} فئة / ${items} منتج` });
      fetchAll();
    } catch (e: any) {
      toast({ title: "خطأ في توليد القائمة", description: e.message, variant: "destructive" });
    }
    setGeneratingMenuFor(null);
  };

  const generateStoreCode = () => {
    return String(Math.floor(100000 + Math.random() * 900000));
  };

  const generateRestaurants = async () => {
    if (selectedCountry === "all") {
      toast({ title: `⚠️ ${tr.selectCountryFirst}`, variant: "destructive" });
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
      if (results.length === 0) {
        toast({ title: tr.noNewRestaurants });
        setGenerating(false);
        return;
      }
      const existingNames = new Set(stores.map((s: any) => s.name?.toLowerCase()));
      const newOnes = results.filter((r: any) => !existingNames.has(r.name?.toLowerCase())).map((r: any) => ({
        ...r,
        store_code: generateStoreCode(),
        commission_rate: 5,
      }));
      setGeneratedStores(newOnes);
      toast({ title: `✅ ${tr.generated.replace("{count}", String(newOnes.length))}` });
    } catch (err: any) {
      console.error("generate restaurants error:", err);
      toast({ title: tr.generateError, description: err.message, variant: "destructive" });
    }
    setGenerating(false);
  };

  const saveGeneratedStores = async () => {
    if (generatedStores.length === 0) {
      toast({ title: tr.noRestaurantsToSave });
      return;
    }
    setSaving(true);
    try {
      const toInsert = generatedStores.map((r: any) => ({
        name: r.name,
        address: r.address || "",
        area: r.area || "",
        phone: r.phone || "",
        rating: r.rating || 0,
        delivery_fee: r.delivery_fee || 10,
        is_open: r.is_open ?? true,
        category: r.category || "restaurant",
        image_url: r.image_url || "",
        google_place_id: r.google_place_id || "",
        lat: r.lat || null,
        lng: r.lng || null,
        country: selectedCountry !== "all" ? selectedCountry : "المغرب",
        city: selectedCity !== "all" ? selectedCity : "",
        commission_rate: r.commission_rate || 5,
        store_code: r.store_code || generateStoreCode(),
        is_confirmed: false,
      }));
      const { data: inserted, error } = await supabase.from("stores").insert(toInsert).select("*");
      if (error) throw error;
      toast({ title: `✅ ${tr.saved.replace("{count}", String(toInsert.length))}` });

      // Auto-generate menus for newly inserted stores
      if (autoMenu && inserted?.length) {
        toast({ title: `🍽️ توليد القوائم لـ ${inserted.length} مطعم...` });
        let okCount = 0;
        let lastError = "";
        for (const st of inserted) {
          try {
            const { cats, items } = await generateMenuForStore(st);
            if (cats > 0 && items > 0) okCount++;
            else lastError = `لم يتم إدراج أي عناصر لـ ${st.name}`;
          } catch (e: any) {
            lastError = e?.message || String(e);
            console.error("auto menu failed for", st.name, e);
          }
        }
        if (okCount === inserted.length) {
          toast({ title: `✅ تم توليد قوائم ${okCount}/${inserted.length} مطعم` });
        } else {
          toast({
            title: `⚠️ توليد القوائم: ${okCount}/${inserted.length}`,
            description: lastError || "بعض القوائم فشلت",
            variant: "destructive",
          });
        }
      }

      setGeneratedStores([]);
      fetchAll();
    } catch (err: any) {
      console.error("save generated stores error:", err);
      toast({ title: tr.saveError, description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const fetchAll = async () => {
    setLoading(true);
    let storeQuery = supabase.from("stores").select("*").order("name");
    if (selectedCountry !== "all") storeQuery = storeQuery.eq("country", selectedCountry);
    if (selectedCity !== "all") storeQuery = storeQuery.eq("city", selectedCity);
    const [s, c, m] = await Promise.all([
      storeQuery,
      supabase.from("menu_categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("sort_order"),
    ]);
    console.info(`[admin-restaurants] fetched ${s.data?.length || 0} stores`);
    setStores(s.data || []);
    setCategories(c.data || []);
    setMenuItems(m.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [selectedCountry, selectedCity]);

  const saveStore = async () => {
    try {
      if (editingStore) {
        await supabase.from("stores").update({ ...storeForm }).eq("id", editingStore.id);
        toast({ title: `${tr.storeUpdated} ✅` });
      } else {
        await supabase.from("stores").insert({ ...storeForm, category: "restaurant", is_open: true, isActive: true });
        toast({ title: `${tr.storeAdded} ✅` });
      }
      setShowStoreDialog(false);
      setEditingStore(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    }
  };

  const saveItem = async () => {
    try {
      if (editingItem) {
        await supabase.from("menu_items").update({ ...itemForm }).eq("id", editingItem.id);
        toast({ title: `${tr.productUpdated} ✅` });
      } else {
        await supabase.from("menu_items").insert({ ...itemForm, store_id: selectedStore });
        toast({ title: `${tr.productAdded} ✅` });
      }
      setShowItemDialog(false);
      setEditingItem(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: t.common.error, description: err.message, variant: "destructive" });
    }
  };

  const toggleAvailability = async (item: any) => {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    fetchAll();
  };

  const openEditStore = (store: any) => {
    setEditingStore(store);
    setStoreForm({ name: store.name, description: store.description || "", address: store.address || "", phone: store.phone || "", email: store.email || "", delivery_fee: store.delivery_fee || 10, delivery_time_min: store.delivery_time_min || 20, delivery_time_max: store.delivery_time_max || 40, rating: store.rating || 4.5, commission_rate: store.commission_rate ?? 5 });
    setShowStoreDialog(true);
  };

  const openAddStore = () => {
    setEditingStore(null);
    setStoreForm({ name: "", description: "", address: "", phone: "", email: "", delivery_fee: 10, delivery_time_min: 20, delivery_time_max: 40, rating: 4.5, commission_rate: 5 });
    setShowStoreDialog(true);
  };

  const updateCommission = async (storeId: string, value: number) => {
    const { error } = await supabase.from("stores").update({ commission_rate: value } as any).eq("id", storeId);
    if (!error) {
      setStores(prev => prev.map(s => s.id === storeId ? { ...s, commission_rate: value } : s));
      toast({ title: `✅ ${tr.commissionUpdated}` });
    }
  };

  const openEditItem = (item: any) => {
    setEditingItem(item);
    setItemForm({ name_ar: item.name_ar, name_fr: item.name_fr || "", description_ar: item.description_ar || "", price: item.price, category_id: item.category_id, is_available: item.is_available });
    setShowItemDialog(true);
  };

  const openAddItem = () => {
    setEditingItem(null);
    const storeCats = categories.filter((c) => c.store_id === selectedStore);
    setItemForm({ name_ar: "", name_fr: "", description_ar: "", price: 0, category_id: storeCats[0]?.id || "", is_available: true });
    setShowItemDialog(true);
  };

  const storeCats = categories.filter((c) => c.store_id === selectedStore);
  const storeItems = menuItems.filter((i) => i.store_id === selectedStore);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6" dir={dir}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Store className="w-6 h-6" /> {tr.title}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-border bg-secondary/40 cursor-pointer">
            <Switch checked={autoMenu} onCheckedChange={setAutoMenu} />
            <span className="font-medium">توليد القائمة تلقائياً مع المطعم</span>
          </label>
          <Button onClick={generateRestaurants} disabled={generating} className="gap-1 bg-green-600 hover:bg-green-700 text-white">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {tr.generate}
          </Button>
          <Button onClick={saveGeneratedStores} disabled={saving || generatedStores.length === 0} className="gap-1 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} {tr.save}
          </Button>
          <Button
            onClick={generateMenusForAllEmpty}
            disabled={!!bulkMenuProgress}
            className="gap-1 bg-purple-600 hover:bg-purple-700 text-white"
            title="توليد قوائم لكل المطاعم الفارغة"
          >
            {bulkMenuProgress
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {bulkMenuProgress.current}/{bulkMenuProgress.total}</>
              : <><Sparkles className="w-4 h-4" /> توليد قوائم الفارغة</>}
          </Button>
          <Button onClick={openAddStore} className="gap-1"><Plus className="w-4 h-4" /> {tr.addRestaurant}</Button>
        </div>
      </div>

      {generatedStores.length > 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-green-500" />
              {tr.discovered} ({generatedStores.length})
              <Badge variant="secondary" className="bg-green-100 text-green-700">{tr.newBadge}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{tr.name}</TableHead>
                  <TableHead>{tr.phone}</TableHead>
                  <TableHead>{tr.address}</TableHead>
                  <TableHead>{tr.rating}</TableHead>
                  <TableHead>{tr.deliveryFee}</TableHead>
                  <TableHead>{tr.commission}</TableHead>
                  <TableHead>{tr.code}</TableHead>
                  <TableHead>{tr.confirmation}</TableHead>
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
                    <TableCell>
                      <Badge variant="outline" className="text-orange-500 border-orange-500/30">{tr.unconfirmed}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="stores" dir={dir}>
        <TabsList><TabsTrigger value="stores">{tr.restaurants}</TabsTrigger><TabsTrigger value="menu">{tr.menu}</TabsTrigger></TabsList>

        <TabsContent value="stores">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                 <TableRow>
                      <TableHead>{tr.code}</TableHead>
                      <TableHead>{tr.name}</TableHead>
                      <TableHead>{tr.phone}</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>{tr.address}</TableHead>
                      <TableHead>المدينة</TableHead>
                      <TableHead>البلد</TableHead>
                      <TableHead>{tr.rating}</TableHead>
                      <TableHead>{tr.commission}</TableHead>
                      <TableHead>{tr.confirmation}</TableHead>
                      <TableHead>القائمة</TableHead>
                      <TableHead>{tr.actions}</TableHead>
                    </TableRow>
                 </TableHeader>
                 <TableBody>
                   {stores.map((s, idx) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-sm font-bold">{s.store_code || "—"}</TableCell>
                        <TableCell className="font-bold">{s.name}</TableCell>
                        <TableCell className="text-muted-foreground direction-ltr">{s.phone || "—"}</TableCell>
                        <TableCell className="text-muted-foreground direction-ltr text-xs">{s.email || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{s.address}</TableCell>
                        <TableCell className="text-sm">{s.city || "—"}</TableCell>
                        <TableCell className="text-sm">{s.country || "—"}</TableCell>
                        <TableCell>⭐ {s.rating}</TableCell>
                       <TableCell>
                         <Input
                           type="number"
                           min="0"
                           max="100"
                           step="0.5"
                           value={s.commission_rate ?? 5}
                           onChange={(e) => {
                             const val = Number(e.target.value);
                             setStores(prev => prev.map(x => x.id === s.id ? { ...x, commission_rate: val } : x));
                           }}
                           onBlur={(e) => updateCommission(s.id, Number(e.target.value) || 5)}
                           className="w-20 h-8 text-center text-sm"
                         />
                       </TableCell>
                       
                       <TableCell>
                         <Button
                           size="sm"
                           variant="outline"
                           className={s.is_confirmed ? "text-emerald-500 border-emerald-500/30" : "text-orange-500 border-orange-500/30"}
                           onClick={async () => {
                             const newVal = !s.is_confirmed;
                             await supabase.from("stores").update({ is_confirmed: newVal } as any).eq("id", s.id);
                             setStores(prev => prev.map(x => x.id === s.id ? { ...x, is_confirmed: newVal } : x));
                             toast({ title: newVal ? `✅ ${tr.confirmDone}` : `⚠️ ${tr.confirmUndone}` });
                           }}
                         >
                           {s.is_confirmed ? tr.confirmed : tr.unconfirmed}
                         </Button>
                       </TableCell>
                       <TableCell>
                         {(() => {
                           const count = menuItems.filter(i => i.store_id === s.id).length;
                           return (
                             <Badge variant="outline" className={count > 0 ? "border-emerald-500/40 text-emerald-500" : "border-orange-500/40 text-orange-500"}>
                               {count > 0 ? `${count} منتج` : "فارغة"}
                             </Badge>
                           );
                         })()}
                       </TableCell>
                       <TableCell>
                         <div className="flex gap-1 flex-wrap">
                           <Button size="sm" variant="outline" onClick={() => openEditStore(s)} title="تعديل"><Pencil className="w-3 h-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => setSelectedStore(s.id)} title="عرض القائمة">
                              <UtensilsCrossed className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => window.open(`/admin/restaurants/${s.id}/menu`, "_blank") } title="عرض كما يراها الزبون">
                              <Store className="w-3 h-3" />
                            </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             className="text-purple-500 border-purple-500/30"
                             disabled={generatingMenuFor === s.id}
                             onClick={() => regenerateMenuForStore(s)}
                             title="إعادة توليد القائمة بالذكاء الاصطناعي"
                           >
                             {generatingMenuFor === s.id
                               ? <Loader2 className="w-3 h-3 animate-spin" />
                               : <RefreshCw className="w-3 h-3" />}
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="menu">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {selectedStore ? `${tr.menuOf} ${stores.find((s) => s.id === selectedStore)?.name}` : tr.selectRestaurantFirst}
                </CardTitle>
                {selectedStore && <Button size="sm" onClick={openAddItem} className="gap-1"><Plus className="w-3 h-3" /> {tr.addProduct}</Button>}
              </div>
              {!selectedStore && (
                <div className="flex gap-2 flex-wrap mt-2">
                  {stores.map((s) => (
                    <Button key={s.id} size="sm" variant="outline" onClick={() => setSelectedStore(s.id)}>{s.name}</Button>
                  ))}
                </div>
              )}
            </CardHeader>
            {selectedStore && (
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tr.product}</TableHead>
                      <TableHead>{tr.category}</TableHead>
                      <TableHead>{tr.price}</TableHead>
                      <TableHead>{tr.available}</TableHead>
                      <TableHead>{tr.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {storeItems.map((item) => (
                      <TableRow key={item.id} className={!item.is_available ? "opacity-50" : ""}>
                        <TableCell>
                          <div><span className="font-bold">{item.name_ar}</span><br /><span className="text-xs text-muted-foreground">{item.name_fr}</span></div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{storeCats.find((c) => c.id === item.category_id)?.name_ar}</TableCell>
                        <TableCell className="font-bold text-primary">{item.price} DH</TableCell>
                        <TableCell>
                          <Switch checked={item.is_available} onCheckedChange={() => toggleAvailability(item)} />
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openEditItem(item)}><Pencil className="w-3 h-3" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
          {selectedStore && (
            <CsvMenuImport
              storeId={selectedStore}
              storeName={stores.find((s) => s.id === selectedStore)?.name || ""}
              categories={storeCats}
              onImportComplete={fetchAll}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Store Dialog */}
      <Dialog open={showStoreDialog} onOpenChange={setShowStoreDialog}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{editingStore ? tr.editRestaurant : tr.addRestaurant}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{tr.name}</Label><Input value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} /></div>
            <div><Label>{tr.description}</Label><Input value={storeForm.description} onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })} /></div>
            <div><Label>{tr.address}</Label><Input value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} /></div>
            <div><Label>{tr.phone}</Label><Input value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} /></div>
            <div><Label>Email</Label><Input type="email" value={storeForm.email} onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{tr.deliveryFee} (DH)</Label><Input type="number" value={storeForm.delivery_fee} onChange={(e) => setStoreForm({ ...storeForm, delivery_fee: +e.target.value })} /></div>
              <div><Label>{tr.rating}</Label><Input type="number" step="0.1" value={storeForm.rating} onChange={(e) => setStoreForm({ ...storeForm, rating: +e.target.value })} /></div>
            </div>
            <div><Label>{tr.commission}</Label><Input type="number" min="0" max="100" step="0.5" value={storeForm.commission_rate} onChange={(e) => setStoreForm({ ...storeForm, commission_rate: +e.target.value })} /></div>
            <Button onClick={saveStore} className="w-full">{editingStore ? t.zones.update : t.zones.add}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent dir={dir}>
          <DialogHeader><DialogTitle>{editingItem ? tr.editProduct : tr.addProduct}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>{tr.nameAr}</Label><Input value={itemForm.name_ar} onChange={(e) => setItemForm({ ...itemForm, name_ar: e.target.value })} /></div>
            <div><Label>{tr.nameFr}</Label><Input value={itemForm.name_fr} onChange={(e) => setItemForm({ ...itemForm, name_fr: e.target.value })} /></div>
            <div><Label>{tr.descriptionLabel}</Label><Input value={itemForm.description_ar} onChange={(e) => setItemForm({ ...itemForm, description_ar: e.target.value })} /></div>
            <div><Label>{tr.price} (DH)</Label><Input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: +e.target.value })} /></div>
            <div>
              <Label>{tr.category}</Label>
              <select value={itemForm.category_id} onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {storeCats.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={itemForm.is_available} onCheckedChange={(v) => setItemForm({ ...itemForm, is_available: v })} />
              <Label>{tr.available}</Label>
            </div>
            <Button onClick={saveItem} className="w-full">{editingItem ? t.zones.update : t.zones.add}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRestaurants;