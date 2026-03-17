import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UtensilsCrossed, Phone, MapPin, Clock, Star, Search, Plus, Edit, Trash2,
  CheckCircle, XCircle, Eye, PhoneCall, Store, ArrowRight, Image as ImageIcon,
  ChevronLeft, Loader2, ToggleLeft, ToggleRight, Upload, X, FolderOpen, Package
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type ViewMode = "list" | "store-detail";

const STORE_CATEGORIES = [
  { value: "restaurant", label: "مطعم" },
  { value: "fast_food", label: "Fast Food" },
  { value: "cafe", label: "مقهى / Café" },
  { value: "bakery", label: "مخبزة" },
  { value: "juice", label: "عصائر" },
  { value: "other", label: "أخرى" },
];

const RestaurantsCC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [stores, setStores] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedStore, setSelectedStore] = useState<any>(null);

  // Store form
  const [storeDialog, setStoreDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [storeForm, setStoreForm] = useState({
    name: "", category: "restaurant", address: "", phone: "",
    delivery_time_min: 20, delivery_time_max: 40, is_open: true,
    description: "", delivery_fee: 10, min_order: 0, zone_id: "",
  });
  const [storeImageFile, setStoreImageFile] = useState<File | null>(null);
  const [savingStore, setSavingStore] = useState(false);

  // Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [catDialog, setCatDialog] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState({ name_ar: "", name_fr: "" });

  // Menu Items
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [itemDialog, setItemDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState({
    name_ar: "", name_fr: "", description_ar: "", price: 0, is_available: true, category_id: "",
  });
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [savingItem, setSavingItem] = useState(false);

  // Fetch stores
  const fetchStores = useCallback(async () => {
    setLoading(true);
    const [storesRes, zonesRes] = await Promise.all([
      supabase.from("stores").select("*").order("created_at", { ascending: false }),
      supabase.from("zones").select("*").order("name_ar"),
    ]);
    setStores(storesRes.data || []);
    setZones(zonesRes.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStores(); }, [fetchStores]);

  // Realtime for stores
  useEffect(() => {
    const ch = supabase.channel("stores-rt").on("postgres_changes", { event: "*", schema: "public", table: "stores" }, () => fetchStores()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchStores]);

  // Fetch categories & items for a store
  const fetchStoreDetail = useCallback(async (storeId: string) => {
    const [catRes, itemRes] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("store_id", storeId).order("sort_order"),
      supabase.from("menu_items").select("*").eq("store_id", storeId).order("sort_order"),
    ]);
    setCategories(catRes.data || []);
    setMenuItems(itemRes.data || []);
  }, []);

  // Realtime for categories & items
  useEffect(() => {
    if (!selectedStore) return;
    const ch1 = supabase.channel("cats-rt").on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, () => fetchStoreDetail(selectedStore.id)).subscribe();
    const ch2 = supabase.channel("items-rt").on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => fetchStoreDetail(selectedStore.id)).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [selectedStore, fetchStoreDetail]);

  // Upload image
  const uploadImage = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("restaurant-images").upload(path, file);
    if (error) { toast({ title: "خطأ في رفع الصورة", description: error.message, variant: "destructive" }); return null; }
    const { data } = supabase.storage.from("restaurant-images").getPublicUrl(path);
    return data.publicUrl;
  };

  // Save store
  const handleSaveStore = async () => {
    if (!storeForm.name.trim()) { toast({ title: "أدخل اسم المطعم", variant: "destructive" }); return; }
    setSavingStore(true);
    let image_url = editingStore?.image_url || "";
    if (storeImageFile) {
      const url = await uploadImage(storeImageFile, "stores");
      if (url) image_url = url;
    }
    const payload = { ...storeForm, image_url, zone_id: storeForm.zone_id || null };
    if (editingStore) {
      await supabase.from("stores").update(payload).eq("id", editingStore.id);
      toast({ title: "تم تحديث المطعم ✅" });
    } else {
      await supabase.from("stores").insert(payload);
      toast({ title: "تم إضافة المطعم ✅" });
    }
    setSavingStore(false);
    setStoreDialog(false);
    setEditingStore(null);
    setStoreImageFile(null);
  };

  // Delete store
  const handleDeleteStore = async (id: string) => {
    await supabase.from("menu_items").delete().eq("store_id", id);
    await supabase.from("menu_categories").delete().eq("store_id", id);
    await supabase.from("stores").delete().eq("id", id);
    toast({ title: "تم حذف المطعم 🗑️" });
    if (selectedStore?.id === id) { setViewMode("list"); setSelectedStore(null); }
  };

  // Open store form
  const openStoreForm = (store?: any) => {
    if (store) {
      setEditingStore(store);
      setStoreForm({
        name: store.name, category: store.category, address: store.address || "",
        phone: store.phone || "", delivery_time_min: store.delivery_time_min || 20,
        delivery_time_max: store.delivery_time_max || 40, is_open: store.is_open,
        description: store.description || "", delivery_fee: store.delivery_fee || 10,
        min_order: store.min_order || 0, zone_id: store.zone_id || "",
      });
    } else {
      setEditingStore(null);
      setStoreForm({ name: "", category: "restaurant", address: "", phone: "", delivery_time_min: 20, delivery_time_max: 40, is_open: true, description: "", delivery_fee: 10, min_order: 0, zone_id: "" });
    }
    setStoreImageFile(null);
    setStoreDialog(true);
  };

  // Enter store detail
  const enterStore = (store: any) => {
    setSelectedStore(store);
    setViewMode("store-detail");
    fetchStoreDetail(store.id);
  };

  // Save category
  const handleSaveCat = async () => {
    if (!catForm.name_ar.trim()) { toast({ title: "أدخل اسم الفئة", variant: "destructive" }); return; }
    const payload = { ...catForm, store_id: selectedStore.id, sort_order: categories.length };
    if (editingCat) {
      await supabase.from("menu_categories").update(catForm).eq("id", editingCat.id);
      toast({ title: "تم تحديث الفئة ✅" });
    } else {
      await supabase.from("menu_categories").insert(payload);
      toast({ title: "تم إضافة الفئة ✅" });
    }
    setCatDialog(false);
    setEditingCat(null);
    fetchStoreDetail(selectedStore.id);
  };

  const openCatForm = (cat?: any) => {
    setEditingCat(cat || null);
    setCatForm({ name_ar: cat?.name_ar || "", name_fr: cat?.name_fr || "" });
    setCatDialog(true);
  };

  const handleDeleteCat = async (id: string) => {
    await supabase.from("menu_items").delete().eq("category_id", id);
    await supabase.from("menu_categories").delete().eq("id", id);
    toast({ title: "تم حذف الفئة 🗑️" });
    fetchStoreDetail(selectedStore.id);
  };

  // Save item
  const handleSaveItem = async () => {
    if (!itemForm.name_ar.trim() || !itemForm.category_id) { toast({ title: "أكمل البيانات المطلوبة", variant: "destructive" }); return; }
    setSavingItem(true);
    let image_url = editingItem?.image_url || "";
    if (itemImageFile) {
      const url = await uploadImage(itemImageFile, "items");
      if (url) image_url = url;
    }
    const payload = { ...itemForm, store_id: selectedStore.id, image_url, sort_order: menuItems.length };
    if (editingItem) {
      await supabase.from("menu_items").update({ ...itemForm, image_url }).eq("id", editingItem.id);
      toast({ title: "تم تحديث المنتج ✅" });
    } else {
      await supabase.from("menu_items").insert(payload);
      toast({ title: "تم إضافة المنتج ✅" });
    }
    setSavingItem(false);
    setItemDialog(false);
    setEditingItem(null);
    setItemImageFile(null);
    fetchStoreDetail(selectedStore.id);
  };

  const openItemForm = (cat_id?: string, item?: any) => {
    setEditingItem(item || null);
    setItemForm({
      name_ar: item?.name_ar || "", name_fr: item?.name_fr || "",
      description_ar: item?.description_ar || "", price: item?.price || 0,
      is_available: item?.is_available ?? true, category_id: item?.category_id || cat_id || "",
    });
    setItemImageFile(null);
    setItemDialog(true);
  };

  const handleDeleteItem = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    toast({ title: "تم حذف المنتج 🗑️" });
    fetchStoreDetail(selectedStore.id);
  };

  const toggleItemAvailability = async (item: any) => {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    fetchStoreDetail(selectedStore.id);
  };

  const filtered = stores.filter((s) =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    (s.address || "").toLowerCase().includes(search.toLowerCase())
  );

  // ===== STORE LIST VIEW =====
  if (viewMode === "list") {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <UtensilsCrossed className="w-7 h-7 text-primary" />
              إدارة المطاعم
            </h1>
            <p className="text-sm text-muted-foreground mt-1">إضافة وتعديل المطاعم والقوائم</p>
          </div>
          <Button onClick={() => openStoreForm()} className="gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all text-sm font-bold px-6 h-11">
            <Plus className="w-5 h-5" />
            ➕ إضافة مطعم
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "إجمالي المطاعم", value: stores.length, icon: Store, color: "text-info" },
            { label: "مفتوح", value: stores.filter(s => s.is_open).length, icon: CheckCircle, color: "text-emerald-400" },
            { label: "مغلق", value: stores.filter(s => !s.is_open).length, icon: XCircle, color: "text-destructive" },
          ].map((s, i) => (
            <div key={i} className="glass-strong rounded-xl p-4 border border-border">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-secondary/60 ${s.color}`}><s.icon className="w-5 h-5" /></div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="bg-secondary/60 border-border pr-9 text-sm" />
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-center py-20 text-muted-foreground">جاري التحميل...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((store) => (
              <motion.div key={store.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-strong rounded-xl border border-border overflow-hidden hover:border-primary/30 transition-colors group">
                <div className="h-32 bg-secondary/40 relative overflow-hidden">
                  {store.image_url ? (
                    <img src={store.image_url} alt={store.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><UtensilsCrossed className="w-10 h-10 text-muted-foreground/30" /></div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge className={`text-[10px] ${store.is_open ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-destructive/20 text-destructive border-destructive/30"}`}>
                      {store.is_open ? "مفتوح" : "مغلق"}
                    </Badge>
                  </div>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{store.name}</h3>
                      <p className="text-[10px] text-muted-foreground">{STORE_CATEGORIES.find(c => c.value === store.category)?.label || store.category}</p>
                    </div>
                    {store.rating && (
                      <div className="flex items-center gap-1 text-amber-400"><Star className="w-3.5 h-3.5 fill-amber-400" /><span className="text-xs font-bold">{store.rating}</span></div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{store.delivery_time_min}-{store.delivery_time_max} د</span>
                    {store.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{store.phone}</span>}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 border-primary/30 text-primary hover:bg-primary/10" onClick={() => enterStore(store)}>
                      <FolderOpen className="w-3 h-3" />إدارة القائمة
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 border-info/30 text-info hover:bg-info/10" onClick={() => openStoreForm(store)}>
                      <Edit className="w-3 h-3" />تعديل
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1 border-destructive/30 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteStore(store.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Store Dialog */}
        <Dialog open={storeDialog} onOpenChange={setStoreDialog}>
          <DialogContent className="glass-strong border-border max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground">
                <UtensilsCrossed className="w-5 h-5 text-primary" />
                {editingStore ? "تعديل المطعم" : "إضافة مطعم جديد"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">اسم المطعم *</Label>
                <Input value={storeForm.name} onChange={e => setStoreForm(p => ({ ...p, name: e.target.value }))} placeholder="اسم المطعم" className="bg-secondary/60 border-border mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">نوع المطعم</Label>
                <Select value={storeForm.category} onValueChange={v => setStoreForm(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="bg-secondary/60 border-border mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{STORE_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">الوصف</Label>
                <Textarea value={storeForm.description} onChange={e => setStoreForm(p => ({ ...p, description: e.target.value }))} placeholder="وصف المطعم" className="bg-secondary/60 border-border mt-1" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">العنوان</Label>
                  <Input value={storeForm.address} onChange={e => setStoreForm(p => ({ ...p, address: e.target.value }))} className="bg-secondary/60 border-border mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">المنطقة</Label>
                  <Select value={storeForm.zone_id} onValueChange={v => setStoreForm(p => ({ ...p, zone_id: v }))}>
                    <SelectTrigger className="bg-secondary/60 border-border mt-1"><SelectValue placeholder="اختر المنطقة" /></SelectTrigger>
                    <SelectContent>{zones.map(z => <SelectItem key={z.id} value={z.id}>{z.name_ar} ({z.city})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">رقم الهاتف</Label>
                <Input value={storeForm.phone} onChange={e => setStoreForm(p => ({ ...p, phone: e.target.value }))} className="bg-secondary/60 border-border mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">وقت التحضير (أدنى)</Label>
                  <Input type="number" value={storeForm.delivery_time_min} onChange={e => setStoreForm(p => ({ ...p, delivery_time_min: +e.target.value }))} className="bg-secondary/60 border-border mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">وقت التحضير (أقصى)</Label>
                  <Input type="number" value={storeForm.delivery_time_max} onChange={e => setStoreForm(p => ({ ...p, delivery_time_max: +e.target.value }))} className="bg-secondary/60 border-border mt-1" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">رسوم التوصيل (DH)</Label>
                  <Input type="number" value={storeForm.delivery_fee} onChange={e => setStoreForm(p => ({ ...p, delivery_fee: +e.target.value }))} className="bg-secondary/60 border-border mt-1" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">الحد الأدنى (DH)</Label>
                  <Input type="number" value={storeForm.min_order} onChange={e => setStoreForm(p => ({ ...p, min_order: +e.target.value }))} className="bg-secondary/60 border-border mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">صورة المطعم</Label>
                <div className="mt-1 flex items-center gap-3">
                  {(editingStore?.image_url || storeImageFile) && (
                    <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden">
                      <img src={storeImageFile ? URL.createObjectURL(storeImageFile) : editingStore?.image_url} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <label className="cursor-pointer px-3 py-2 rounded-lg bg-secondary/60 border border-border text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    {storeImageFile ? storeImageFile.name : "اختر صورة"}
                    <input type="file" accept="image/*" className="hidden" onChange={e => setStoreImageFile(e.target.files?.[0] || null)} />
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">حالة المطعم</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{storeForm.is_open ? "مفعّل" : "غير مفعّل"}</span>
                  <Switch checked={storeForm.is_open} onCheckedChange={v => setStoreForm(p => ({ ...p, is_open: v }))} />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStoreDialog(false)} className="flex-1">إلغاء</Button>
                <Button onClick={handleSaveStore} disabled={savingStore} className="flex-1 gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground">
                  {savingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {editingStore ? "حفظ التعديلات" : "حفظ"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== STORE DETAIL VIEW (Categories + Items) =====
  return (
    <div className="space-y-6" dir="rtl">
      {/* Back + Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => { setViewMode("list"); setSelectedStore(null); }}>
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
          <div className="flex items-center gap-3">
            {selectedStore?.image_url && (
              <img src={selectedStore.image_url} className="w-10 h-10 rounded-lg object-cover" />
            )}
            <div>
              <h1 className="text-xl font-bold text-foreground">{selectedStore?.name}</h1>
              <p className="text-xs text-muted-foreground">{STORE_CATEGORIES.find(c => c.value === selectedStore?.category)?.label}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => openCatForm()}>
            <Plus className="w-4 h-4" />
            فئة جديدة
          </Button>
          <Button size="sm" className="gap-1" onClick={() => openItemForm()}>
            <Plus className="w-4 h-4" />
            منتج جديد
          </Button>
        </div>
      </div>

      {/* Categories + Items */}
      {categories.length === 0 ? (
        <div className="text-center py-16 glass-strong rounded-xl border border-border">
          <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد فئات بعد</p>
          <Button variant="outline" size="sm" className="mt-3 gap-1" onClick={() => openCatForm()}>
            <Plus className="w-4 h-4" />أضف فئة
          </Button>
        </div>
      ) : (
        categories.map((cat) => {
          const catItems = menuItems.filter(i => i.category_id === cat.id);
          return (
            <div key={cat.id} className="glass-strong rounded-xl border border-border overflow-hidden">
              {/* Category Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/30 border-b border-border">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-primary" />
                  <h2 className="font-bold text-foreground text-sm">{cat.name_ar}</h2>
                  {cat.name_fr && <span className="text-[10px] text-muted-foreground">({cat.name_fr})</span>}
                  <Badge className="bg-secondary text-muted-foreground text-[10px]">{catItems.length} منتج</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openItemForm(cat.id)}>
                    <Plus className="w-3.5 h-3.5 text-primary" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openCatForm(cat)}>
                    <Edit className="w-3.5 h-3.5 text-info" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteCat(cat.id)}>
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              {/* Items */}
              {catItems.length === 0 ? (
                <div className="px-4 py-6 text-center text-muted-foreground text-xs">
                  لا توجد منتجات في هذه الفئة
                  <Button variant="link" size="sm" className="text-primary text-xs mr-1" onClick={() => openItemForm(cat.id)}>إضافة منتج</Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {catItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors">
                      <div className="w-14 h-14 rounded-lg bg-secondary/40 overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/30" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground text-sm truncate">{item.name_ar}</h4>
                          {!item.is_available && <Badge className="bg-destructive/20 text-destructive border-destructive/30 text-[9px]">غير متوفر</Badge>}
                        </div>
                        {item.name_fr && <p className="text-[10px] text-muted-foreground">{item.name_fr}</p>}
                        {item.description_ar && <p className="text-[10px] text-muted-foreground truncate">{item.description_ar}</p>}
                      </div>
                      <p className="font-bold text-primary text-sm flex-shrink-0">{item.price} DH</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => toggleItemAvailability(item)} title={item.is_available ? "إخفاء" : "إظهار"}>
                          {item.is_available ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openItemForm(cat.id, item)}>
                          <Edit className="w-3.5 h-3.5 text-info" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleDeleteItem(item.id)}>
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      {/* Category Dialog */}
      <Dialog open={catDialog} onOpenChange={setCatDialog}>
        <DialogContent className="glass-strong border-border max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingCat ? "تعديل الفئة" : "إضافة فئة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">اسم الفئة (عربي) *</Label>
              <Input value={catForm.name_ar} onChange={e => setCatForm(p => ({ ...p, name_ar: e.target.value }))} placeholder="مثال: بيتزا" className="bg-secondary/60 border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">اسم الفئة (فرنسي)</Label>
              <Input value={catForm.name_fr} onChange={e => setCatForm(p => ({ ...p, name_fr: e.target.value }))} placeholder="Ex: Pizza" className="bg-secondary/60 border-border mt-1" />
            </div>
            <Button onClick={handleSaveCat} className="w-full">{editingCat ? "حفظ" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent className="glass-strong border-border max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-foreground">{editingItem ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">الفئة *</Label>
              <Select value={itemForm.category_id} onValueChange={v => setItemForm(p => ({ ...p, category_id: v }))}>
                <SelectTrigger className="bg-secondary/60 border-border mt-1"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                <SelectContent>{categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">اسم الوجبة (عربي) *</Label>
                <Input value={itemForm.name_ar} onChange={e => setItemForm(p => ({ ...p, name_ar: e.target.value }))} className="bg-secondary/60 border-border mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">اسم الوجبة (فرنسي)</Label>
                <Input value={itemForm.name_fr} onChange={e => setItemForm(p => ({ ...p, name_fr: e.target.value }))} className="bg-secondary/60 border-border mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">الوصف</Label>
              <Textarea value={itemForm.description_ar} onChange={e => setItemForm(p => ({ ...p, description_ar: e.target.value }))} className="bg-secondary/60 border-border mt-1" rows={2} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">السعر (DH) *</Label>
              <Input type="number" value={itemForm.price} onChange={e => setItemForm(p => ({ ...p, price: +e.target.value }))} className="bg-secondary/60 border-border mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">صورة المنتج</Label>
              <div className="mt-1 flex items-center gap-3">
                {(editingItem?.image_url || itemImageFile) && (
                  <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden">
                    <img src={itemImageFile ? URL.createObjectURL(itemImageFile) : editingItem?.image_url} className="w-full h-full object-cover" />
                  </div>
                )}
                <label className="cursor-pointer px-3 py-2 rounded-lg bg-secondary/60 border border-border text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Upload className="w-3 h-3" />
                  {itemImageFile ? itemImageFile.name : "اختر صورة"}
                  <input type="file" accept="image/*" className="hidden" onChange={e => setItemImageFile(e.target.files?.[0] || null)} />
                </label>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm text-foreground">متوفر</Label>
              <Switch checked={itemForm.is_available} onCheckedChange={v => setItemForm(p => ({ ...p, is_available: v }))} />
            </div>
            <Button onClick={handleSaveItem} disabled={savingItem} className="w-full gap-2">
              {savingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {editingItem ? "حفظ التعديلات" : "إضافة المنتج"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantsCC;
