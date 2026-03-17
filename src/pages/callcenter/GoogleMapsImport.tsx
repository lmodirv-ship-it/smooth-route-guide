import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MapPin, Search, Download, Check, CheckSquare, Square,
  Loader2, Star, Phone, Clock, Trash2, Edit, Eye,
  Globe, ChevronDown, ChevronUp, Plus, X, Package,
  FolderOpen, ToggleLeft, ToggleRight, Navigation, Sparkles, Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Restaurant = {
  name: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  phone: string;
  rating: number;
  image_url: string;
  is_open: boolean;
  google_place_id: string;
  category: string;
};

type SavedRestaurant = Restaurant & {
  id: string;
  created_at: string;
};

type MenuCategory = {
  id?: string;
  name_ar: string;
  name_fr: string;
  store_id?: string;
};

type MenuItem = {
  id?: string;
  name_ar: string;
  name_fr: string;
  description_ar: string;
  description_fr: string;
  price: number;
  image_url: string;
  category_id?: string;
  store_id?: string;
};

const GoogleMapsImport = () => {
  const [city] = useState("Tanger");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<Restaurant[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [source, setSource] = useState("");
  const [activeTab, setActiveTab] = useState("import");

  // Management state
  const [savedRestaurants, setSavedRestaurants] = useState<SavedRestaurant[]>([]);
  const [loadingManage, setLoadingManage] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState<SavedRestaurant | null>(null);
  const [detailRestaurant, setDetailRestaurant] = useState<SavedRestaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newCategory, setNewCategory] = useState({ name_ar: "", name_fr: "" });
  const [newItem, setNewItem] = useState<MenuItem>({ name_ar: "", name_fr: "", description_ar: "", description_fr: "", price: 0, image_url: "" });
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [importLogs, setImportLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    if (activeTab === "manage") loadSavedRestaurants();
    loadImportLogs();
  }, [activeTab]);

  const loadImportLogs = async () => {
    const { data } = await supabase.from("import_logs").select("*").order("created_at", { ascending: false }).limit(20);
    if (data) setImportLogs(data);
  };

  const loadSavedRestaurants = async () => {
    setLoadingManage(true);
    const { data } = await supabase.from("stores").select("*").order("created_at", { ascending: false });
    if (data) setSavedRestaurants(data as any);
    setLoadingManage(false);
  };

  const searchRestaurants = async () => {
    setLoading(true);
    setResults([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("google-places-search", {
        body: { city, type: type === "all" ? "restaurants" : type, useGoogle: true },
      });
      if (error) throw error;
      setResults(data.restaurants || []);
      setSource(data.source || "mock");
      toast.success(`تم العثور على ${data.total} مطعم (${data.source === 'google' ? 'Google Maps' : 'بيانات تجريبية'})`);
    } catch (e: any) {
      toast.error("خطأ في البحث: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (idx: number) => {
    const s = new Set(selected);
    s.has(idx) ? s.delete(idx) : s.add(idx);
    setSelected(s);
  };

  const selectAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((_, i) => i)));
    }
  };

  const importRestaurants = async (indices: number[]) => {
    setSaving(true);
    try {
      const toImport = indices.map(i => results[i]);
      const rows = toImport.map(r => ({
        name: r.name,
        address: r.address,
        area: r.area,
        lat: r.lat,
        lng: r.lng,
        phone: r.phone,
        rating: r.rating,
        image_url: r.image_url,
        is_open: r.is_open,
        google_place_id: r.google_place_id,
        category: r.category || "restaurant",
      }));

      const { error } = await supabase.from("stores").insert(rows);
      if (error) throw error;

      // Log the import
      await supabase.from("import_logs").insert({
        source_url: `Google Maps - ${city}`,
        source_type: source === "google" ? "google_places" : "mock",
        city,
        restaurants_count: rows.length,
        products_count: 0,
        categories_count: 0,
        status: "completed",
      });

      toast.success(`✅ تم استيراد ${rows.length} مطعم بنجاح`);
      setResults(prev => prev.filter((_, i) => !indices.includes(i)));
      setSelected(new Set());
      loadImportLogs();
    } catch (e: any) {
      toast.error("خطأ في الاستيراد: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRestaurantStatus = async (id: string, currentOpen: boolean) => {
    const { error } = await supabase.from("stores").update({ is_open: !currentOpen }).eq("id", id);
    if (error) { toast.error("خطأ"); return; }
    setSavedRestaurants(prev => prev.map(r => r.id === id ? { ...r, is_open: !currentOpen } : r));
    toast.success(currentOpen ? "تم إلغاء التفعيل" : "تم التفعيل");
  };

  const deleteRestaurant = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا المطعم؟")) return;
    await supabase.from("menu_items").delete().eq("store_id", id);
    await supabase.from("menu_categories").delete().eq("store_id", id);
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) { toast.error("خطأ في الحذف"); return; }
    setSavedRestaurants(prev => prev.filter(r => r.id !== id));
    toast.success("تم الحذف");
  };

  const saveEditRestaurant = async () => {
    if (!editingRestaurant) return;
    const { id, created_at, ...rest } = editingRestaurant;
    const { error } = await supabase.from("stores").update(rest).eq("id", id);
    if (error) { toast.error("خطأ في التحديث"); return; }
    setSavedRestaurants(prev => prev.map(r => r.id === id ? editingRestaurant : r));
    setEditingRestaurant(null);
    toast.success("تم التحديث");
  };

  const openDetail = async (r: SavedRestaurant) => {
    setDetailRestaurant(r);
    const { data: cats } = await supabase.from("menu_categories").select("*").eq("store_id", r.id).order("sort_order");
    setCategories(cats || []);
    const { data: items } = await supabase.from("menu_items").select("*").eq("store_id", r.id).order("sort_order");
    setMenuItems(items as any || []);
    setSelectedCategoryId("");
  };

  const addCategory = async () => {
    if (!detailRestaurant || !newCategory.name_ar) return;
    const { data, error } = await supabase.from("menu_categories").insert({
      store_id: detailRestaurant.id,
      name_ar: newCategory.name_ar,
      name_fr: newCategory.name_fr || newCategory.name_ar,
    }).select().single();
    if (error) { toast.error("خطأ"); return; }
    setCategories(prev => [...prev, data]);
    setNewCategory({ name_ar: "", name_fr: "" });
    toast.success("تمت إضافة الفئة");
  };

  const addItem = async () => {
    if (!detailRestaurant || !selectedCategoryId || !newItem.name_ar) return;
    const { data, error } = await supabase.from("menu_items").insert({
      store_id: detailRestaurant.id,
      category_id: selectedCategoryId,
      name_ar: newItem.name_ar,
      name_fr: newItem.name_fr || newItem.name_ar,
      description_ar: newItem.description_ar,
      description_fr: newItem.description_fr,
      price: newItem.price,
      image_url: newItem.image_url,
    }).select().single();
    if (error) { toast.error("خطأ"); return; }
    setMenuItems(prev => [...prev, data as any]);
    setNewItem({ name_ar: "", name_fr: "", description_ar: "", description_fr: "", price: 0, image_url: "" });
    toast.success("تمت إضافة المنتج");
  };

  const deleteItem = async (id: string) => {
    await supabase.from("menu_items").delete().eq("id", id);
    setMenuItems(prev => prev.filter(i => i.id !== id));
  };

  const deleteCategory = async (id: string) => {
    await supabase.from("menu_items").delete().eq("category_id", id);
    await supabase.from("menu_categories").delete().eq("id", id);
    setCategories(prev => prev.filter(c => c.id !== id));
    setMenuItems(prev => prev.filter(i => i.category_id !== id));
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            استيراد من Google Maps
          </h1>
          <p className="text-muted-foreground text-sm mt-1">ابحث عن المطاعم وقم باستيرادها مباشرة</p>
        </div>
        <Badge variant="outline" className="border-primary/30 text-primary">
          {city}
        </Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-secondary/60 border border-border">
          <TabsTrigger value="import" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Download className="w-4 h-4 ml-1" /> استيراد
          </TabsTrigger>
          <TabsTrigger value="manage" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Edit className="w-4 h-4 ml-1" /> إدارة المطاعم
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="w-4 h-4 ml-1" /> سجل العمليات
          </TabsTrigger>
        </TabsList>

        {/* ===== IMPORT TAB ===== */}
        <TabsContent value="import" className="space-y-4">
          {/* Search Bar */}
          <Card className="bg-card/60 border-border backdrop-blur">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 items-end">
                <div className="flex-1">
                  <label className="text-xs text-muted-foreground mb-1 block">المدينة</label>
                  <Input value={city} disabled className="bg-secondary/60 border-border" />
                </div>
                <div className="w-48">
                  <label className="text-xs text-muted-foreground mb-1 block">نوع النشاط</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="bg-secondary/60 border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المطاعم</SelectItem>
                      <SelectItem value="restaurant">مطاعم</SelectItem>
                      <SelectItem value="café">مقاهي</SelectItem>
                      <SelectItem value="fast-food">وجبات سريعة</SelectItem>
                      <SelectItem value="pizzeria">بيتزا</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={searchRestaurants} disabled={loading} className="h-10">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Search className="w-4 h-4 ml-1" />}
                  بحث
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/20 text-primary border-primary/30">
                    {results.length} نتيجة
                  </Badge>
                  <Badge variant="outline" className={source === 'google' ? 'border-green-500/30 text-green-400' : 'border-amber-500/30 text-amber-400'}>
                    <Globe className="w-3 h-3 ml-1" />
                    {source === 'google' ? 'Google Maps' : 'بيانات تجريبية'}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selected.size === results.length ? <CheckSquare className="w-4 h-4 ml-1" /> : <Square className="w-4 h-4 ml-1" />}
                    {selected.size === results.length ? "إلغاء الكل" : "تحديد الكل"}
                  </Button>
                  {selected.size > 0 && (
                    <Button size="sm" onClick={() => importRestaurants([...selected])} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <Download className="w-4 h-4 ml-1" />}
                      استيراد المحدد ({selected.size})
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => importRestaurants(results.map((_, i) => i))} disabled={saving}>
                    <Download className="w-4 h-4 ml-1" />
                    استيراد الكل
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {results.map((r, idx) => (
                  <Card
                    key={idx}
                    className={`bg-card/60 border-border backdrop-blur cursor-pointer transition-all hover:border-primary/50 ${
                      selected.has(idx) ? "ring-2 ring-primary border-primary" : ""
                    }`}
                    onClick={() => toggleSelect(idx)}
                  >
                    <div className="relative">
                      {r.image_url && (
                        <img src={r.image_url} alt={r.name} className="w-full h-36 object-cover rounded-t-lg" />
                      )}
                      <div className="absolute top-2 right-2">
                        {selected.has(idx) ? (
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-primary-foreground" />
                          </div>
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-background/80 border border-border" />
                        )}
                      </div>
                      {r.is_open ? (
                        <Badge className="absolute top-2 left-2 bg-green-500/90 text-white text-[10px]">مفتوح</Badge>
                      ) : (
                        <Badge className="absolute top-2 left-2 bg-red-500/90 text-white text-[10px]">مغلق</Badge>
                      )}
                    </div>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-sm text-foreground">{r.name}</h3>
                        <div className="flex items-center gap-0.5 text-amber-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-xs">{r.rating}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {r.address}
                      </p>
                      {r.area && (
                        <Badge variant="outline" className="text-[10px] border-info/30 text-info">
                          <Navigation className="w-2.5 h-2.5 ml-0.5" /> {r.area}
                        </Badge>
                      )}
                      {r.phone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" /> {r.phone}
                        </p>
                      )}
                      <Badge variant="outline" className="text-[10px]">{r.category}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {!loading && results.length === 0 && (
            <Card className="bg-card/40 border-border border-dashed">
              <CardContent className="p-12 text-center">
                <MapPin className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">ابحث عن المطاعم في طنجة للبدء</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== MANAGE TAB ===== */}
        <TabsContent value="manage" className="space-y-4">
          {loadingManage ? (
            <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : savedRestaurants.length === 0 ? (
            <Card className="bg-card/40 border-border border-dashed">
              <CardContent className="p-12 text-center">
                <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد مطاعم بعد. قم بالاستيراد أولاً.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {savedRestaurants.map(r => (
                <Card key={r.id} className="bg-card/60 border-border backdrop-blur">
                  {r.image_url && (
                    <img src={r.image_url} alt={r.name} className="w-full h-32 object-cover rounded-t-lg" />
                  )}
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <h3 className="font-bold text-sm">{r.name}</h3>
                      <div className="flex items-center gap-0.5 text-amber-400">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-xs">{r.rating}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.address}</p>
                    <div className="flex items-center gap-1">
                      <Badge className={r.is_open ? "bg-green-500/20 text-green-400 text-[10px]" : "bg-red-500/20 text-red-400 text-[10px]"}>
                        {r.is_open ? "مفعّل" : "معطّل"}
                      </Badge>
                      {r.area && <Badge variant="outline" className="text-[10px]">{r.area}</Badge>}
                    </div>
                    <div className="flex gap-1 pt-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => openDetail(r)}>
                        <Eye className="w-3 h-3 ml-1" /> تفاصيل
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingRestaurant({ ...r })}>
                        <Edit className="w-3 h-3 ml-1" /> تعديل
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => toggleRestaurantStatus(r.id, r.is_open)}>
                        {r.is_open ? <ToggleRight className="w-3 h-3 ml-1" /> : <ToggleLeft className="w-3 h-3 ml-1" />}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => deleteRestaurant(r.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== LOGS TAB ===== */}
        <TabsContent value="logs" className="space-y-4">
          {importLogs.length === 0 ? (
            <Card className="bg-card/40 border-dashed border-border">
              <CardContent className="p-12 text-center">
                <Clock className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد عمليات استيراد سابقة</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {importLogs.map(log => (
                <Card key={log.id} className="bg-card/60 border-border">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${log.status === 'completed' ? 'bg-green-400' : 'bg-amber-400'}`} />
                      <div>
                        <p className="text-sm font-medium">{log.source_url}</p>
                        <p className="text-xs text-muted-foreground">
                          {log.city} • {log.restaurants_count} مطعم • {log.source_type}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <Badge variant="outline" className={log.status === 'completed' ? 'border-green-500/30 text-green-400' : 'border-amber-500/30 text-amber-400'}>
                        {log.status === 'completed' ? 'مكتمل' : log.status}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(log.created_at).toLocaleString('ar-MA')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ===== EDIT DIALOG ===== */}
      <Dialog open={!!editingRestaurant} onOpenChange={() => setEditingRestaurant(null)}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تعديل المطعم</DialogTitle>
          </DialogHeader>
          {editingRestaurant && (
            <div className="space-y-3">
              <Input placeholder="الاسم" value={editingRestaurant.name} onChange={e => setEditingRestaurant({ ...editingRestaurant, name: e.target.value })} />
              <Input placeholder="العنوان" value={editingRestaurant.address} onChange={e => setEditingRestaurant({ ...editingRestaurant, address: e.target.value })} />
              <Input placeholder="المنطقة" value={editingRestaurant.area || ""} onChange={e => setEditingRestaurant({ ...editingRestaurant, area: e.target.value })} />
              <Input placeholder="الهاتف" value={editingRestaurant.phone || ""} onChange={e => setEditingRestaurant({ ...editingRestaurant, phone: e.target.value })} />
              <Input placeholder="التقييم" type="number" step="0.1" value={editingRestaurant.rating || 0} onChange={e => setEditingRestaurant({ ...editingRestaurant, rating: +e.target.value })} />
              <Input placeholder="رابط الصورة" value={editingRestaurant.image_url || ""} onChange={e => setEditingRestaurant({ ...editingRestaurant, image_url: e.target.value })} />
              <div className="flex items-center gap-2">
                <Switch checked={editingRestaurant.is_open} onCheckedChange={v => setEditingRestaurant({ ...editingRestaurant, is_open: v })} />
                <span className="text-sm">{editingRestaurant.is_open ? "مفعّل" : "معطّل"}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingRestaurant(null)}>إلغاء</Button>
            <Button onClick={saveEditRestaurant}>حفظ التعديلات</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== DETAIL DIALOG ===== */}
      <Dialog open={!!detailRestaurant} onOpenChange={() => setDetailRestaurant(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-primary" />
              {detailRestaurant?.name}
            </DialogTitle>
          </DialogHeader>
          {detailRestaurant && (
            <div className="space-y-6">
              {/* Categories Section */}
              <div>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-1">
                  <FolderOpen className="w-4 h-4 text-info" /> الفئات ({categories.length})
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {categories.map(c => (
                    <Badge key={c.id} variant="outline" className="flex items-center gap-1 border-info/30 text-info">
                      {c.name_ar}
                      <X className="w-3 h-3 cursor-pointer hover:text-destructive" onClick={() => deleteCategory(c.id!)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="اسم الفئة (عربي)" value={newCategory.name_ar} onChange={e => setNewCategory({ ...newCategory, name_ar: e.target.value })} className="flex-1" />
                  <Input placeholder="Nom (FR)" value={newCategory.name_fr} onChange={e => setNewCategory({ ...newCategory, name_fr: e.target.value })} className="flex-1" />
                  <Button size="sm" onClick={addCategory}><Plus className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Products Section */}
              <div>
                <h3 className="text-sm font-bold mb-2 flex items-center gap-1">
                  <Package className="w-4 h-4 text-primary" /> المنتجات ({menuItems.length})
                </h3>
                {menuItems.length > 0 && (
                  <div className="space-y-1 mb-3 max-h-40 overflow-auto">
                    {menuItems.map(item => (
                      <div key={item.id} className="flex items-center justify-between bg-secondary/40 rounded-lg px-3 py-2">
                        <div>
                          <span className="text-sm font-medium">{item.name_ar}</span>
                          <span className="text-xs text-muted-foreground mr-2">{item.name_fr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary/20 text-primary text-xs">{item.price} DH</Badge>
                          <Trash2 className="w-3 h-3 text-destructive cursor-pointer" onClick={() => deleteItem(item.id!)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {categories.length > 0 && (
                  <div className="space-y-2 border-t border-border pt-3">
                    <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                      <SelectTrigger className="bg-secondary/60"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c.id} value={c.id!}>{c.name_ar}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="اسم المنتج (عربي)" value={newItem.name_ar} onChange={e => setNewItem({ ...newItem, name_ar: e.target.value })} />
                      <Input placeholder="Nom produit (FR)" value={newItem.name_fr} onChange={e => setNewItem({ ...newItem, name_fr: e.target.value })} />
                      <Input placeholder="السعر (DH)" type="number" value={newItem.price || ""} onChange={e => setNewItem({ ...newItem, price: +e.target.value })} />
                      <Input placeholder="رابط الصورة" value={newItem.image_url} onChange={e => setNewItem({ ...newItem, image_url: e.target.value })} />
                    </div>
                    <Textarea placeholder="وصف (عربي)" value={newItem.description_ar} onChange={e => setNewItem({ ...newItem, description_ar: e.target.value })} rows={2} />
                    <Button size="sm" onClick={addItem} disabled={!selectedCategoryId}>
                      <Plus className="w-4 h-4 ml-1" /> إضافة منتج
                    </Button>
                  </div>
                )}
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">أضف فئة أولاً لتتمكن من إضافة المنتجات</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GoogleMapsImport;
