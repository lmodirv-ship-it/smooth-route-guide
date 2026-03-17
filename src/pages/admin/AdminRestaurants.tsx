import { useState, useEffect } from "react";
import { supabase } from "@/lib/firestoreClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Store, UtensilsCrossed, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CsvMenuImport from "@/components/admin/CsvMenuImport";

const AdminRestaurants = () => {
  const [stores, setStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [showStoreDialog, setShowStoreDialog] = useState(false);
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [editingStore, setEditingStore] = useState<any>(null);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [storeForm, setStoreForm] = useState({ name: "", description: "", address: "", phone: "", delivery_fee: 10, delivery_time_min: 20, delivery_time_max: 40, rating: 4.5 });
  const [itemForm, setItemForm] = useState({ name_ar: "", name_fr: "", description_ar: "", price: 0, category_id: "", is_available: true });

  const fetchAll = async () => {
    setLoading(true);
    const [s, c, m] = await Promise.all([
      supabase.from("stores").select("*").order("name"),
      supabase.from("menu_categories").select("*").order("sort_order"),
      supabase.from("menu_items").select("*").order("sort_order"),
    ]);
    console.info(`[admin-restaurants] fetched ${s.data?.length || 0} stores`);
    setStores(s.data || []);
    setCategories(c.data || []);
    setMenuItems(m.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const saveStore = async () => {
    try {
      if (editingStore) {
        await supabase.from("stores").update({ ...storeForm }).eq("id", editingStore.id);
        toast({ title: "تم تحديث المطعم ✅" });
      } else {
        await supabase.from("stores").insert({ ...storeForm, category: "restaurant", is_open: true, isActive: true });
        toast({ title: "تم إضافة المطعم ✅" });
      }
      setShowStoreDialog(false);
      setEditingStore(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const saveItem = async () => {
    try {
      if (editingItem) {
        await supabase.from("menu_items").update({ ...itemForm }).eq("id", editingItem.id);
        toast({ title: "تم تحديث المنتج ✅" });
      } else {
        await supabase.from("menu_items").insert({ ...itemForm, store_id: selectedStore });
        toast({ title: "تم إضافة المنتج ✅" });
      }
      setShowItemDialog(false);
      setEditingItem(null);
      fetchAll();
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
  };

  const toggleAvailability = async (item: any) => {
    await supabase.from("menu_items").update({ is_available: !item.is_available }).eq("id", item.id);
    fetchAll();
  };

  const openEditStore = (store: any) => {
    setEditingStore(store);
    setStoreForm({ name: store.name, description: store.description || "", address: store.address || "", phone: store.phone || "", delivery_fee: store.delivery_fee || 10, delivery_time_min: store.delivery_time_min || 20, delivery_time_max: store.delivery_time_max || 40, rating: store.rating || 4.5 });
    setShowStoreDialog(true);
  };

  const openAddStore = () => {
    setEditingStore(null);
    setStoreForm({ name: "", description: "", address: "", phone: "", delivery_fee: 10, delivery_time_min: 20, delivery_time_max: 40, rating: 4.5 });
    setShowStoreDialog(true);
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2"><Store className="w-6 h-6" /> إدارة المطاعم</h1>
        <Button onClick={openAddStore} className="gap-1"><Plus className="w-4 h-4" /> إضافة مطعم</Button>
      </div>

      <Tabs defaultValue="stores" dir="rtl">
        <TabsList><TabsTrigger value="stores">المطاعم</TabsTrigger><TabsTrigger value="menu">المنيو</TabsTrigger></TabsList>

        <TabsContent value="stores">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">العنوان</TableHead>
                    <TableHead className="text-right">التقييم</TableHead>
                    <TableHead className="text-right">رسوم التوصيل</TableHead>
                    <TableHead className="text-right">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stores.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-bold">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">{s.address}</TableCell>
                      <TableCell>⭐ {s.rating}</TableCell>
                      <TableCell>{s.delivery_fee} DH</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditStore(s)}><Pencil className="w-3 h-3" /></Button>
                          <Button size="sm" variant="outline" onClick={() => setSelectedStore(s.id)}>
                            <UtensilsCrossed className="w-3 h-3 mr-1" />المنيو
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
                  {selectedStore ? `منيو: ${stores.find((s) => s.id === selectedStore)?.name}` : "اختر مطعم أولاً"}
                </CardTitle>
                {selectedStore && <Button size="sm" onClick={openAddItem} className="gap-1"><Plus className="w-3 h-3" /> إضافة منتج</Button>}
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
                      <TableHead className="text-right">المنتج</TableHead>
                      <TableHead className="text-right">الفئة</TableHead>
                      <TableHead className="text-right">السعر</TableHead>
                      <TableHead className="text-right">متوفر</TableHead>
                      <TableHead className="text-right">إجراءات</TableHead>
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
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingStore ? "تعديل المطعم" : "إضافة مطعم"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم</Label><Input value={storeForm.name} onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })} /></div>
            <div><Label>الوصف</Label><Input value={storeForm.description} onChange={(e) => setStoreForm({ ...storeForm, description: e.target.value })} /></div>
            <div><Label>العنوان</Label><Input value={storeForm.address} onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })} /></div>
            <div><Label>الهاتف</Label><Input value={storeForm.phone} onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>رسوم التوصيل (DH)</Label><Input type="number" value={storeForm.delivery_fee} onChange={(e) => setStoreForm({ ...storeForm, delivery_fee: +e.target.value })} /></div>
              <div><Label>التقييم</Label><Input type="number" step="0.1" value={storeForm.rating} onChange={(e) => setStoreForm({ ...storeForm, rating: +e.target.value })} /></div>
            </div>
            <Button onClick={saveStore} className="w-full">{editingStore ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{editingItem ? "تعديل المنتج" : "إضافة منتج"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم (عربي)</Label><Input value={itemForm.name_ar} onChange={(e) => setItemForm({ ...itemForm, name_ar: e.target.value })} /></div>
            <div><Label>الاسم (فرنسي)</Label><Input value={itemForm.name_fr} onChange={(e) => setItemForm({ ...itemForm, name_fr: e.target.value })} /></div>
            <div><Label>الوصف</Label><Input value={itemForm.description_ar} onChange={(e) => setItemForm({ ...itemForm, description_ar: e.target.value })} /></div>
            <div><Label>السعر (DH)</Label><Input type="number" value={itemForm.price} onChange={(e) => setItemForm({ ...itemForm, price: +e.target.value })} /></div>
            <div>
              <Label>الفئة</Label>
              <select value={itemForm.category_id} onChange={(e) => setItemForm({ ...itemForm, category_id: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                {storeCats.map((c) => <option key={c.id} value={c.id}>{c.name_ar}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={itemForm.is_available} onCheckedChange={(v) => setItemForm({ ...itemForm, is_available: v })} />
              <Label>متوفر</Label>
            </div>
            <Button onClick={saveItem} className="w-full">{editingItem ? "تحديث" : "إضافة"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminRestaurants;
