import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Edit, Plus, Trash2, Users, DollarSign, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Package {
  id: string;
  name_ar: string;
  name_fr: string;
  name_en: string;
  description_ar: string | null;
  description_fr: string | null;
  duration_days: number;
  price: number;
  original_price: number | null;
  is_active: boolean;
  is_featured: boolean;
  driver_type: string;
  sort_order: number;
}

interface Subscription {
  id: string;
  status: string;
  starts_at: string;
  expires_at: string;
  orders_used: number;
  amount_paid: number;
  driver_id: string;
  user_id: string;
}

const DriverPackages = () => {
  const [packages, setPackages] = useState<Package[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Package | null>(null);
  const [form, setForm] = useState({
    name_ar: "", name_fr: "", name_en: "",
    description_ar: "", description_fr: "",
    duration_days: 30, price: 0, original_price: 0,
    is_active: true, is_featured: false, driver_type: "both", sort_order: 0,
  });

  const fetchData = async () => {
    const [{ data: pkgs }, { data: subs }] = await Promise.all([
      supabase.from("driver_packages").select("*").order("sort_order"),
      supabase.from("driver_subscriptions").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setPackages((pkgs || []) as Package[]);
    setSubscriptions((subs || []) as Subscription[]);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.name_ar || form.price <= 0) {
      toast({ title: "خطأ", description: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    const payload = {
      ...form,
      original_price: form.original_price > 0 ? form.original_price : null,
    };

    if (editing) {
      await supabase.from("driver_packages").update(payload).eq("id", editing.id);
      toast({ title: "تم التحديث ✅" });
    } else {
      await supabase.from("driver_packages").insert(payload);
      toast({ title: "تم إضافة الباقة ✅" });
    }
    setShowForm(false);
    setEditing(null);
    fetchData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الباقة؟")) return;
    await supabase.from("driver_packages").delete().eq("id", id);
    toast({ title: "تم الحذف" });
    fetchData();
  };

  const toggleActive = async (pkg: Package) => {
    await supabase.from("driver_packages").update({ is_active: !pkg.is_active }).eq("id", pkg.id);
    fetchData();
  };

  const openEdit = (pkg: Package) => {
    setEditing(pkg);
    setForm({
      name_ar: pkg.name_ar, name_fr: pkg.name_fr, name_en: pkg.name_en,
      description_ar: pkg.description_ar || "", description_fr: pkg.description_fr || "",
      duration_days: pkg.duration_days, price: pkg.price,
      original_price: pkg.original_price || 0,
      is_active: pkg.is_active, is_featured: pkg.is_featured,
      driver_type: pkg.driver_type, sort_order: pkg.sort_order,
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      name_ar: "", name_fr: "", name_en: "",
      description_ar: "", description_fr: "",
      duration_days: 30, price: 0, original_price: 0,
      is_active: true, is_featured: false, driver_type: "both", sort_order: 0,
    });
    setShowForm(true);
  };

  const activeSubsCount = subscriptions.filter(s => s.status === "active" && new Date(s.expires_at) > new Date()).length;
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.amount_paid || 0), 0);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Crown className="w-7 h-7 text-yellow-500" />
            إدارة باقات السائقين
          </h1>
          <p className="text-muted-foreground text-sm mt-1">إنشاء وتعديل الباقات والاشتراكات الزمنية</p>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          باقة جديدة
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Crown className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{packages.length}</p>
            <p className="text-muted-foreground text-sm">باقة متاحة</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Users className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{activeSubsCount}</p>
            <p className="text-muted-foreground text-sm">اشتراك نشط</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <p className="text-2xl font-bold">{totalRevenue} DH</p>
            <p className="text-muted-foreground text-sm">إجمالي الإيرادات</p>
          </div>
        </div>
      </div>

      {/* Packages Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {packages.map((pkg) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative bg-card border rounded-xl p-5 ${
              pkg.is_featured ? "border-yellow-500/50 ring-1 ring-yellow-500/20" : "border-border"
            } ${!pkg.is_active ? "opacity-50" : ""}`}
          >
            {pkg.is_featured && (
              <div className="absolute -top-2.5 right-4 bg-yellow-500 text-black text-xs font-bold px-3 py-0.5 rounded-full">
                ⭐ مميزة
              </div>
            )}
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-bold text-lg">{pkg.name_ar}</h3>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => openEdit(pkg)}>
                  <Edit className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => handleDelete(pkg.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground text-sm mb-3">{pkg.description_ar || pkg.name_fr}</p>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-2xl font-bold text-primary">{pkg.price} DH</span>
              {pkg.original_price && pkg.original_price > pkg.price && (
                <span className="text-sm text-muted-foreground line-through">{pkg.original_price} DH</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4" />{pkg.duration_days} يوم</span>
              <span>{pkg.driver_type === "both" ? "الجميع" : pkg.driver_type === "ride" ? "ركاب" : "توصيل"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">نشطة</span>
              <Switch checked={pkg.is_active} onCheckedChange={() => toggleActive(pkg)} />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recent Subscriptions */}
      <div>
        <h2 className="font-bold text-lg mb-3">آخر الاشتراكات</h2>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="p-3 text-right">السائق</th>
                <th className="p-3 text-right">الحالة</th>
                <th className="p-3 text-right">ينتهي في</th>
                <th className="p-3 text-right">الطلبات</th>
                <th className="p-3 text-right">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.slice(0, 10).map((sub) => {
                const expired = new Date(sub.expires_at) < new Date();
                return (
                  <tr key={sub.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono text-xs">{sub.driver_id.slice(0, 8)}...</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${expired ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-500"}`}>
                        {expired ? "منتهي" : "نشط"}
                      </span>
                    </td>
                    <td className="p-3 text-xs">{new Date(sub.expires_at).toLocaleDateString("ar")}</td>
                    <td className="p-3">{sub.orders_used}</td>
                    <td className="p-3 font-bold">{sub.amount_paid} DH</td>
                  </tr>
                );
              })}
              {subscriptions.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">لا توجد اشتراكات بعد</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">الاسم (عربي) *</label>
                <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">الاسم (فرنسي)</label>
                <Input value={form.name_fr} onChange={e => setForm(f => ({ ...f, name_fr: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">الوصف (عربي)</label>
              <Input value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">المدة (أيام) *</label>
                <Input type="number" value={form.duration_days} onChange={e => setForm(f => ({ ...f, duration_days: +e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">السعر (DH) *</label>
                <Input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium">السعر الأصلي</label>
                <Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: +e.target.value }))} />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                نشطة
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={form.is_featured} onCheckedChange={v => setForm(f => ({ ...f, is_featured: v }))} />
                مميزة
              </label>
            </div>
            <Button onClick={handleSave} className="w-full">
              {editing ? "حفظ التعديلات" : "إضافة الباقة"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DriverPackages;
