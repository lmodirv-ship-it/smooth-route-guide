import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2, DollarSign, Navigation, Loader2 } from "lucide-react";

type Zone = {
  id: string;
  name_ar: string;
  name_fr: string;
  city: string;
  center_lat: number;
  center_lng: number;
  radius_km: number;
  delivery_fee: number;
  is_active: boolean;
  created_at: string;
};

const emptyForm = {
  name_ar: "",
  name_fr: "",
  city: "Tanger",
  center_lat: 35.7595,
  center_lng: -5.834,
  radius_km: 3,
  delivery_fee: 10,
  is_active: true,
};

const ZonesManagement = () => {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchZones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("zones")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("خطأ في تحميل المناطق");
    else setZones(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchZones(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (z: Zone) => {
    setEditingId(z.id);
    setForm({
      name_ar: z.name_ar,
      name_fr: z.name_fr,
      city: z.city,
      center_lat: z.center_lat,
      center_lng: z.center_lng,
      radius_km: z.radius_km,
      delivery_fee: z.delivery_fee,
      is_active: z.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name_ar.trim()) { toast.error("اسم المنطقة بالعربية مطلوب"); return; }
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from("zones").update(form).eq("id", editingId);
      if (error) toast.error("خطأ في التحديث");
      else toast.success("تم تحديث المنطقة");
    } else {
      const { error } = await supabase.from("zones").insert(form);
      if (error) toast.error("خطأ في الإضافة");
      else toast.success("تمت إضافة المنطقة");
    }
    setSaving(false);
    setDialogOpen(false);
    fetchZones();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل تريد حذف هذه المنطقة؟")) return;
    const { error } = await supabase.from("zones").delete().eq("id", id);
    if (error) toast.error("خطأ في الحذف");
    else { toast.success("تم الحذف"); fetchZones(); }
  };

  const toggleActive = async (z: Zone) => {
    const { error } = await supabase.from("zones").update({ is_active: !z.is_active }).eq("id", z.id);
    if (error) toast.error("خطأ");
    else fetchZones();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-6 h-6 text-primary" />
            إدارة المناطق والأسعار
          </h1>
          <p className="text-sm text-muted-foreground mt-1">إضافة وتعديل مناطق التوصيل ورسوم التوصيل</p>
        </div>
        <Button onClick={openCreate} className="gradient-primary text-primary-foreground gap-2">
          <Plus className="w-4 h-4" /> إضافة منطقة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{zones.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي المناطق</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Navigation className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">{zones.filter(z => z.is_active).length}</p>
              <p className="text-xs text-muted-foreground">مناطق نشطة</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass-strong border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground">
                {zones.length > 0 ? (zones.reduce((s, z) => s + z.delivery_fee, 0) / zones.length).toFixed(0) : 0} DH
              </p>
              <p className="text-xs text-muted-foreground">متوسط رسوم التوصيل</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zones Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : zones.length === 0 ? (
        <Card className="glass-strong border-border">
          <CardContent className="py-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">لا توجد مناطق بعد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {zones.map(z => (
            <Card key={z.id} className="glass-strong border-border hover:border-primary/30 transition-colors">
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">{z.name_ar}</CardTitle>
                  <p className="text-sm text-muted-foreground">{z.name_fr}</p>
                </div>
                <Badge variant={z.is_active ? "default" : "secondary"} className={z.is_active ? "bg-green-500/20 text-green-400 border-green-500/30" : ""}>
                  {z.is_active ? "نشط" : "معطل"}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-secondary/50 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground text-xs">المدينة</p>
                    <p className="font-semibold text-foreground">{z.city}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground text-xs">النطاق</p>
                    <p className="font-semibold text-foreground">{z.radius_km} كم</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground text-xs">رسوم التوصيل</p>
                    <p className="font-bold text-primary">{z.delivery_fee} DH</p>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground text-xs">الإحداثيات</p>
                    <p className="font-semibold text-foreground text-xs">{Number(z.center_lat).toFixed(3)}, {Number(z.center_lng).toFixed(3)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <Switch checked={z.is_active} onCheckedChange={() => toggleActive(z)} />
                    <span className="text-xs text-muted-foreground">{z.is_active ? "نشط" : "معطل"}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(z)}>
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(z.id)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong border-border max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editingId ? "تعديل المنطقة" : "إضافة منطقة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الاسم بالعربية *</Label>
                <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} placeholder="مثال: مسنانة" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">الاسم بالفرنسية</Label>
                <Input value={form.name_fr} onChange={e => setForm(f => ({ ...f, name_fr: e.target.value }))} placeholder="ex: Mesnana" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">المدينة</Label>
              <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">خط العرض (Lat)</Label>
                <Input type="number" step="0.0001" value={form.center_lat} onChange={e => setForm(f => ({ ...f, center_lat: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">خط الطول (Lng)</Label>
                <Input type="number" step="0.0001" value={form.center_lng} onChange={e => setForm(f => ({ ...f, center_lng: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">النطاق (كم)</Label>
                <Input type="number" step="0.5" value={form.radius_km} onChange={e => setForm(f => ({ ...f, radius_km: parseFloat(e.target.value) || 1 }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">رسوم التوصيل (DH)</Label>
                <Input type="number" step="1" value={form.delivery_fee} onChange={e => setForm(f => ({ ...f, delivery_fee: parseFloat(e.target.value) || 0 }))} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label className="text-sm">منطقة نشطة</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full gradient-primary text-primary-foreground">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "تحديث" : "إضافة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ZonesManagement;
