import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Globe, Download, Eye, Check, Edit, Save, Loader2, 
  ChevronDown, ChevronUp, Trash2, Clock, Link2, 
  UtensilsCrossed, Package, FolderOpen, AlertCircle, MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type MenuItem = {
  name_ar: string;
  name_fr: string;
  description_ar: string;
  description_fr: string;
  price: number;
  image_url: string;
  is_available: boolean;
};

type MenuCategory = {
  name_ar: string;
  name_fr: string;
  items: MenuItem[];
};

type RestaurantData = {
  name: string;
  description: string;
  category: string;
  address: string;
  phone: string;
  rating: number;
  delivery_fee: number;
  delivery_time_min: number;
  delivery_time_max: number;
  image_url: string;
  is_open: boolean;
  categories: MenuCategory[];
};

type ImportLog = {
  id: string;
  source_url: string;
  source_type: string;
  city: string;
  restaurants_count: number;
  products_count: number;
  categories_count: number;
  status: string;
  error_message: string | null;
  created_at: string;
};

const AutoImport = () => {
  const [url, setUrl] = useState("");
  const [sourceType, setSourceType] = useState("website");
  const [city, setCity] = useState("Tanger");
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<RestaurantData[] | null>(null);
  const [editingRestaurant, setEditingRestaurant] = useState<number | null>(null);
  const [expandedRestaurant, setExpandedRestaurant] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    fetchImportLogs();
    fetchZones();
  }, []);

  const fetchZones = async () => {
    const { data } = await supabase.from("zones").select("*").eq("city", "Tanger").order("name_ar");
    if (data) setZones(data);
  };

  const fetchImportLogs = async () => {
    const { data } = await supabase
      .from("import_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setImportLogs(data as ImportLog[]);
  };

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error("أدخل رابط الموقع");
      return;
    }

    // Validate URL format on client side
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = 'https://' + normalizedUrl;
    }
    try {
      const parsed = new URL(normalizedUrl);
      // Must have a valid domain with a dot (e.g. example.com)
      if (!parsed.hostname.includes('.') || /\s/.test(parsed.hostname)) {
        throw new Error('invalid');
      }
    } catch {
      toast.error("رابط غير صالح. أدخل رابط موقع حقيقي مثل https://www.glovo.com");
      return;
    }

    setIsLoading(true);
    setExtractedData(null);

    try {
      const { data, error } = await supabase.functions.invoke("scrape-restaurant", {
        body: { url: url.trim(), city },
      });

      if (error) throw error;

      if (data?.success && data.data?.restaurants?.length > 0) {
        setExtractedData(data.data.restaurants);
        toast.success(`تم استخراج ${data.data.restaurants.length} مطعم بنجاح`);
      } else {
        toast.error(data?.error || "لم يتم العثور على بيانات مطاعم");
      }
    } catch (err: any) {
      console.error("Import error:", err);
      toast.error(err.message || "خطأ أثناء الاستيراد");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAll = async () => {
    if (!extractedData || extractedData.length === 0) return;

    setIsSaving(true);
    let totalProducts = 0;
    let totalCategories = 0;

    try {
      for (const restaurant of extractedData) {
        // Create store
        const { data: store, error: storeErr } = await supabase
          .from("stores")
          .insert({
            name: restaurant.name,
            description: restaurant.description,
            category: restaurant.category || "restaurant",
            address: restaurant.address,
            phone: restaurant.phone,
            rating: restaurant.rating || 4.5,
            delivery_fee: restaurant.delivery_fee || 10,
            delivery_time_min: restaurant.delivery_time_min || 20,
            delivery_time_max: restaurant.delivery_time_max || 40,
            image_url: restaurant.image_url || "",
            is_open: restaurant.is_open ?? true,
          })
          .select()
          .single();

        if (storeErr) {
          console.error("Store error:", storeErr);
          continue;
        }

        // Create categories & items
        for (let ci = 0; ci < (restaurant.categories || []).length; ci++) {
          const cat = restaurant.categories[ci];
          const { data: category, error: catErr } = await supabase
            .from("menu_categories")
            .insert({
              store_id: store.id,
              name_ar: cat.name_ar || "عام",
              name_fr: cat.name_fr || "General",
              sort_order: ci,
              is_active: true,
            })
            .select()
            .single();

          if (catErr) {
            console.error("Category error:", catErr);
            continue;
          }
          totalCategories++;

          for (let ii = 0; ii < (cat.items || []).length; ii++) {
            const item = cat.items[ii];
            await supabase.from("menu_items").insert({
              store_id: store.id,
              category_id: category.id,
              name_ar: item.name_ar || "",
              name_fr: item.name_fr || "",
              description_ar: item.description_ar || "",
              description_fr: item.description_fr || "",
              price: item.price || 0,
              image_url: item.image_url || "",
              is_available: item.is_available ?? true,
              sort_order: ii,
            });
            totalProducts++;
          }
        }
      }

      // Log the import
      await supabase.from("import_logs").insert({
        source_url: url,
        source_type: sourceType,
        city,
        restaurants_count: extractedData.length,
        products_count: totalProducts,
        categories_count: totalCategories,
        status: "completed",
        imported_by: (await supabase.auth.getUser()).data.user?.id,
      });

      toast.success(`✅ تم حفظ ${extractedData.length} مطعم و ${totalProducts} منتج بنجاح`);
      setExtractedData(null);
      setUrl("");
      fetchImportLogs();
    } catch (err: any) {
      console.error("Save error:", err);

      await supabase.from("import_logs").insert({
        source_url: url,
        source_type: sourceType,
        city,
        restaurants_count: 0,
        products_count: 0,
        categories_count: 0,
        status: "failed",
        error_message: err.message,
        imported_by: (await supabase.auth.getUser()).data.user?.id,
      });

      toast.error("خطأ أثناء الحفظ");
      fetchImportLogs();
    } finally {
      setIsSaving(false);
    }
  };

  const updateRestaurant = (index: number, field: string, value: any) => {
    if (!extractedData) return;
    const updated = [...extractedData];
    (updated[index] as any)[field] = value;
    setExtractedData(updated);
  };

  const updateItem = (ri: number, ci: number, ii: number, field: string, value: any) => {
    if (!extractedData) return;
    const updated = [...extractedData];
    (updated[ri].categories[ci].items[ii] as any)[field] = value;
    setExtractedData(updated);
  };

  const removeRestaurant = (index: number) => {
    if (!extractedData) return;
    setExtractedData(extractedData.filter((_, i) => i !== index));
  };

  const removeItem = (ri: number, ci: number, ii: number) => {
    if (!extractedData) return;
    const updated = [...extractedData];
    updated[ri].categories[ci].items = updated[ri].categories[ci].items.filter((_, i) => i !== ii);
    setExtractedData(updated);
  };

  const totalProducts = extractedData?.reduce(
    (sum, r) => sum + r.categories.reduce((s, c) => s + c.items.length, 0), 0
  ) || 0;

  const totalCategories = extractedData?.reduce(
    (sum, r) => sum + r.categories.length, 0
  ) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Download className="w-8 h-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground font-display">استيراد تلقائي للمطاعم</h1>
        </div>
        <p className="text-muted-foreground text-sm">استيراد المطاعم والمنتجات من المواقع الإلكترونية تلقائياً</p>
      </div>

      {/* Import Form */}
      <Card className="glass-strong border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* URL Input */}
          <div className="md:col-span-5 space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Link2 className="w-4 h-4 text-primary" /> رابط الموقع *
            </label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.glovo.com/ma/fr/tanger/restaurants"
              className="bg-secondary/60 border-border"
              dir="ltr"
            />
          </div>

          {/* Source Type */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-foreground">نوع المصدر</label>
            <Select value={sourceType} onValueChange={setSourceType}>
              <SelectTrigger className="bg-secondary/60 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="website">موقع ويب</SelectItem>
                <SelectItem value="glovo">Glovo</SelectItem>
                <SelectItem value="jumia">Jumia Food</SelectItem>
                <SelectItem value="other">أخرى</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4 text-info" /> المدينة
            </label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="bg-secondary/60 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Tanger">طنجة</SelectItem>
                <SelectItem value="Casablanca">الدار البيضاء</SelectItem>
                <SelectItem value="Rabat">الرباط</SelectItem>
                <SelectItem value="Marrakech">مراكش</SelectItem>
                <SelectItem value="Fes">فاس</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Import Button */}
          <div className="md:col-span-3 flex items-end">
            <Button
              onClick={handleImport}
              disabled={isLoading || !url.trim()}
              className="w-full gradient-primary text-primary-foreground font-bold py-6 text-base shadow-glow-primary"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin ml-2" />
                  جاري الاستخراج...
                </>
              ) : (
                <>
                  <Globe className="w-5 h-5 ml-2" />
                  استيراد تلقائي
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview Section */}
      {extractedData && extractedData.length > 0 && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="glass border-border p-4 text-center">
              <UtensilsCrossed className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{extractedData.length}</p>
              <p className="text-xs text-muted-foreground">مطعم</p>
            </Card>
            <Card className="glass border-border p-4 text-center">
              <FolderOpen className="w-6 h-6 text-info mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalCategories}</p>
              <p className="text-xs text-muted-foreground">فئة</p>
            </Card>
            <Card className="glass border-border p-4 text-center">
              <Package className="w-6 h-6 text-success mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalProducts}</p>
              <p className="text-xs text-muted-foreground">منتج</p>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            <Button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="gradient-primary text-primary-foreground px-8 py-3 font-bold shadow-glow-primary"
            >
              {isSaving ? (
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
              ) : (
                <Save className="w-5 h-5 ml-2" />
              )}
              حفظ الكل
            </Button>
            <Button
              variant="outline"
              onClick={() => setExtractedData(null)}
              className="border-border px-8 py-3"
            >
              إلغاء
            </Button>
          </div>

          {/* Restaurant Cards */}
          <div className="space-y-4">
            {extractedData.map((restaurant, ri) => (
              <Card key={ri} className="glass-strong border-border overflow-hidden">
                {/* Restaurant Header */}
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-secondary/30 transition-colors"
                  onClick={() => setExpandedRestaurant(expandedRestaurant === ri ? null : ri)}
                >
                  <div className="flex items-center gap-3">
                    {restaurant.image_url ? (
                      <img src={restaurant.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                        <UtensilsCrossed className="w-6 h-6 text-primary" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-foreground">{restaurant.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {restaurant.categories.length} فئة • {restaurant.categories.reduce((s, c) => s + c.items.length, 0)} منتج
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {restaurant.category}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingRestaurant(editingRestaurant === ri ? null : ri);
                        setExpandedRestaurant(ri);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRestaurant(ri);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    {expandedRestaurant === ri ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedRestaurant === ri && (
                  <div className="border-t border-border p-4 space-y-4">
                    {/* Edit Fields */}
                    {editingRestaurant === ri && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-secondary/20 rounded-lg">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">الاسم</label>
                          <Input
                            value={restaurant.name}
                            onChange={(e) => updateRestaurant(ri, "name", e.target.value)}
                            className="bg-secondary/60 border-border text-sm h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">العنوان</label>
                          <Input
                            value={restaurant.address}
                            onChange={(e) => updateRestaurant(ri, "address", e.target.value)}
                            className="bg-secondary/60 border-border text-sm h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">الهاتف</label>
                          <Input
                            value={restaurant.phone}
                            onChange={(e) => updateRestaurant(ri, "phone", e.target.value)}
                            className="bg-secondary/60 border-border text-sm h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">رسوم التوصيل (DH)</label>
                          <Input
                            type="number"
                            value={restaurant.delivery_fee}
                            onChange={(e) => updateRestaurant(ri, "delivery_fee", Number(e.target.value))}
                            className="bg-secondary/60 border-border text-sm h-9"
                          />
                        </div>
                      </div>
                    )}

                    {/* Categories & Items */}
                    {restaurant.categories.map((cat, ci) => (
                      <div key={ci} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4 text-info" />
                          <h4 className="font-semibold text-foreground text-sm">
                            {cat.name_ar} <span className="text-muted-foreground">({cat.name_fr})</span>
                          </h4>
                          <Badge variant="secondary" className="text-xs">{cat.items.length} منتج</Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mr-6">
                          {cat.items.map((item, ii) => (
                            <div
                              key={ii}
                              className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg border border-border/50"
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                {item.image_url ? (
                                  <img src={item.image_url} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  {editingRestaurant === ri ? (
                                    <div className="space-y-1">
                                      <Input
                                        value={item.name_ar}
                                        onChange={(e) => updateItem(ri, ci, ii, "name_ar", e.target.value)}
                                        className="bg-secondary/60 border-border text-xs h-7"
                                      />
                                      <Input
                                        type="number"
                                        value={item.price}
                                        onChange={(e) => updateItem(ri, ci, ii, "price", Number(e.target.value))}
                                        className="bg-secondary/60 border-border text-xs h-7 w-24"
                                      />
                                    </div>
                                  ) : (
                                    <>
                                      <p className="text-sm font-medium text-foreground truncate">{item.name_ar}</p>
                                      <p className="text-xs text-muted-foreground truncate">{item.name_fr}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="font-bold text-primary text-sm">DH {item.price}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(ri, ci, ii)}
                                  className="text-destructive hover:text-destructive h-7 w-7 p-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Import Logs */}
      <div>
        <Button
          variant="outline"
          onClick={() => setShowLogs(!showLogs)}
          className="border-border w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            سجل عمليات الاستيراد ({importLogs.length})
          </span>
          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        {showLogs && (
          <Card className="glass border-border mt-2 overflow-hidden">
            {importLogs.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">لا توجد عمليات استيراد سابقة</p>
            ) : (
              <div className="divide-y divide-border">
                {importLogs.map((log) => (
                  <div key={log.id} className="p-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={log.status === "completed" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {log.status === "completed" ? "✅ مكتمل" : "❌ فشل"}
                      </Badge>
                      <div>
                        <p className="text-foreground font-medium truncate max-w-[300px]" dir="ltr">
                          {log.source_url}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.restaurants_count} مطعم • {log.products_count} منتج • {log.categories_count} فئة
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString("ar-MA")}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default AutoImport;
