import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Plus, Trash2, Edit, Save, Store as StoreIcon,
  Package, ImageIcon, Loader2, Upload, X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/context";

const MyStore = () => {
  const navigate = useNavigate();
  const { dir } = useI18n();
  const [store, setStore] = useState<any>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [productDialog, setProductDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productForm, setProductForm] = useState({
    name_ar: "", name_fr: "", description_ar: "", description_fr: "",
    price: "", image_url: "", category_id: "",
  });
  const [categoryForm, setCategoryForm] = useState({ name_ar: "", name_fr: "" });
  const [uploading, setUploading] = useState(false);

  const fetchStore = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { data: storeData } = await supabase
      .from("stores")
      .select("*")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (!storeData) {
      setStore(null);
      setLoading(false);
      return;
    }

    setStore(storeData);

    const [catRes, itemsRes] = await Promise.all([
      supabase.from("menu_categories").select("*").eq("store_id", storeData.id).order("sort_order"),
      supabase.from("menu_items").select("*").eq("store_id", storeData.id).order("sort_order"),
    ]);
    setCategories(catRes.data || []);
    setMenuItems(itemsRes.data || []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  const handleUpdateStore = async (field: string, value: any) => {
    if (!store) return;
    const { error } = await supabase.from("stores").update({ [field]: value }).eq("id", store.id);
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    setStore({ ...store, [field]: value });
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${store.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("restaurant-images").upload(path, file);
    if (error) {
      toast({ title: "خطأ في رفع الصورة", variant: "destructive" });
      setUploading(false);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from("restaurant-images").getPublicUrl(path);
    setUploading(false);
    return publicUrl;
  };

  const handleSaveProduct = async () => {
    if (!store || !productForm.name_ar || !productForm.price) {
      toast({ title: "يرجى ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      store_id: store.id,
      name_ar: productForm.name_ar,
      name_fr: productForm.name_fr,
      description_ar: productForm.description_ar,
      description_fr: productForm.description_fr,
      price: parseFloat(productForm.price) || 0,
      image_url: productForm.image_url,
      category_id: productForm.category_id || categories[0]?.id,
    };

    if (editingProduct) {
      const { error } = await supabase.from("menu_items").update(payload).eq("id", editingProduct.id);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "تم تحديث المنتج ✅" });
    } else {
      const { error } = await supabase.from("menu_items").insert(payload);
      if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); setSaving(false); return; }
      toast({ title: "تمت إضافة المنتج ✅" });
    }

    setSaving(false);
    setProductDialog(false);
    setEditingProduct(null);
    setProductForm({ name_ar: "", name_fr: "", description_ar: "", description_fr: "", price: "", image_url: "", category_id: "" });
    fetchStore();
  };

  const handleDeleteProduct = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (error) { toast({ title: "خطأ", variant: "destructive" }); return; }
    toast({ title: "تم حذف المنتج" });
    fetchStore();
  };

  const handleSaveCategory = async () => {
    if (!store || !categoryForm.name_ar) {
      toast({ title: "يرجى إدخال اسم الفئة", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("menu_categories").insert({
      store_id: store.id,
      name_ar: categoryForm.name_ar,
      name_fr: categoryForm.name_fr,
    });
    if (error) { toast({ title: "خطأ", description: error.message, variant: "destructive" }); return; }
    toast({ title: "تمت إضافة الفئة ✅" });
    setCategoryDialog(false);
    setCategoryForm({ name_ar: "", name_fr: "" });
    fetchStore();
  };

  const openEditProduct = (item: any) => {
    setEditingProduct(item);
    setProductForm({
      name_ar: item.name_ar,
      name_fr: item.name_fr,
      description_ar: item.description_ar || "",
      description_fr: item.description_fr || "",
      price: String(item.price),
      image_url: item.image_url || "",
      category_id: item.category_id,
    });
    setProductDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5" dir="rtl">
        <div className="text-center max-w-sm">
          <StoreIcon className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">ليس لديك محل مسجل</h2>
          <p className="text-sm text-muted-foreground mb-6">
            تواصل مع الإدارة لتسجيل محلك في المنصة
          </p>
          <Button onClick={() => navigate(-1)} variant="outline">رجوع</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-10" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-50 px-5 py-4 flex items-center justify-between bg-card border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl bg-secondary">
          <ArrowRight className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-bold text-lg text-foreground">إدارة المحل</h1>
        <div className="w-9" />
      </div>

      {/* Store Info */}
      <div className="px-5 mt-4">
        <div className="bg-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-14 h-14 rounded-xl bg-secondary overflow-hidden flex-shrink-0">
              {store.image_url ? (
                <img src={store.image_url} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <StoreIcon className="w-6 h-6 text-muted-foreground/30" />
                </div>
              )}
            </div>
            <div>
              <h2 className="font-bold text-foreground">{store.name}</h2>
              <p className="text-xs text-muted-foreground">{store.category}</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 border-t border-border">
            <Label className="text-sm text-foreground">حالة المحل</Label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{store.is_open ? "مفتوح" : "مغلق"}</span>
              <Switch
                checked={store.is_open}
                onCheckedChange={(val) => handleUpdateStore("is_open", val)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">الفئات</h3>
          <Button size="sm" variant="outline" onClick={() => setCategoryDialog(true)} className="gap-1 rounded-xl">
            <Plus className="w-4 h-4" /> إضافة فئة
          </Button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Badge key={cat.id} variant="secondary" className="whitespace-nowrap px-3 py-1.5 text-sm">
              {cat.name_ar}
            </Badge>
          ))}
          {categories.length === 0 && (
            <p className="text-xs text-muted-foreground">لم تضف أي فئات بعد</p>
          )}
        </div>
      </div>

      {/* Products */}
      <div className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-foreground">المنتجات ({menuItems.length})</h3>
          <Button
            size="sm"
            onClick={() => {
              setEditingProduct(null);
              setProductForm({ name_ar: "", name_fr: "", description_ar: "", description_fr: "", price: "", image_url: "", category_id: categories[0]?.id || "" });
              setProductDialog(true);
            }}
            className="gap-1 rounded-xl"
            disabled={categories.length === 0}
          >
            <Plus className="w-4 h-4" /> إضافة منتج
          </Button>
        </div>

        {categories.length === 0 && (
          <p className="text-xs text-muted-foreground mb-3">أضف فئة أولاً ثم أضف منتجات</p>
        )}

        <div className="space-y-3">
          {menuItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-card rounded-2xl border border-border p-4"
            >
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-xl bg-secondary/40 overflow-hidden flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-sm">{item.name_ar}</h4>
                  {item.description_ar && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.description_ar}</p>
                  )}
                  <p className="text-sm font-bold text-primary mt-1">{item.price} DH</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEditProduct(item)} className="p-2 rounded-lg bg-secondary hover:bg-secondary/80">
                    <Edit className="w-4 h-4 text-foreground" />
                  </button>
                  <button onClick={() => handleDeleteProduct(item.id)} className="p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20">
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Add/Edit Product Dialog */}
      <Dialog open={productDialog} onOpenChange={setProductDialog}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "تعديل المنتج" : "إضافة منتج جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>اسم المنتج (عربي) *</Label>
              <Input value={productForm.name_ar} onChange={(e) => setProductForm({ ...productForm, name_ar: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>اسم المنتج (فرنسي)</Label>
              <Input value={productForm.name_fr} onChange={(e) => setProductForm({ ...productForm, name_fr: e.target.value })} className="mt-1" dir="ltr" />
            </div>
            <div>
              <Label>السعر (DH) *</Label>
              <Input type="number" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} className="mt-1" dir="ltr" />
            </div>
            {categories.length > 0 && (
              <div>
                <Label>الفئة</Label>
                <Select value={productForm.category_id} onValueChange={(val) => setProductForm({ ...productForm, category_id: val })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name_ar}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>وصف المنتج (عربي)</Label>
              <Textarea value={productForm.description_ar} onChange={(e) => setProductForm({ ...productForm, description_ar: e.target.value })} className="mt-1" rows={2} />
            </div>
            <div>
              <Label>رابط الصورة</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={productForm.image_url}
                  onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                  placeholder="https://..."
                  dir="ltr"
                  className="flex-1"
                />
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await handleUploadImage(file);
                      if (url) setProductForm({ ...productForm, image_url: url });
                    }}
                  />
                  <div className="h-10 px-3 rounded-md border border-input bg-background flex items-center gap-1.5 text-sm text-muted-foreground hover:bg-accent">
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </div>
                </label>
              </div>
            </div>
            <Button onClick={handleSaveProduct} disabled={saving} className="w-full gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {editingProduct ? "حفظ التعديلات" : "إضافة المنتج"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={categoryDialog} onOpenChange={setCategoryDialog}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة فئة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>اسم الفئة (عربي) *</Label>
              <Input value={categoryForm.name_ar} onChange={(e) => setCategoryForm({ ...categoryForm, name_ar: e.target.value })} className="mt-1" />
            </div>
            <div>
              <Label>اسم الفئة (فرنسي)</Label>
              <Input value={categoryForm.name_fr} onChange={(e) => setCategoryForm({ ...categoryForm, name_fr: e.target.value })} className="mt-1" dir="ltr" />
            </div>
            <Button onClick={handleSaveCategory} className="w-full gap-2">
              <Save className="w-4 h-4" /> إضافة الفئة
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyStore;
