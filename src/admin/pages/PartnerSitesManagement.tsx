/**
 * PartnerSitesManagement — إدارة المواقع الشريكة المعروضة في "Our Partner Sites" بالصفحة الرئيسية.
 * يدعم: إضافة، تعديل، حذف، إخفاء، إعادة ترتيب، صورة معاينة مخصصة (وإلا يُولَّد screenshot تلقائياً عبر thum.io).
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Eye, EyeOff, ExternalLink, Star, GripVertical } from "lucide-react";
import { screenshotUrl } from "@/lib/screenshotUrl";

type PartnerSite = {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  description_en: string;
  url: string;
  tags: string[];
  category: string;
  status: "live" | "coming" | "hidden";
  is_featured: boolean;
  is_visible: boolean;
  sort_order: number;
  custom_screenshot_url: string | null;
  icon_name: string;
  gradient: string;
  rating: number;
  users_label: string;
};

const EMPTY: Partial<PartnerSite> = {
  slug: "",
  name_ar: "",
  name_en: "",
  description_ar: "",
  description_en: "",
  url: "https://",
  tags: [],
  category: "services",
  status: "live",
  is_featured: false,
  is_visible: true,
  sort_order: 0,
  custom_screenshot_url: "",
  icon_name: "Globe",
  gradient: "from-orange-400 via-red-500 to-rose-600",
  rating: 4.8,
  users_label: "1K+",
};

export default function PartnerSitesManagement() {
  const [sites, setSites] = useState<PartnerSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<PartnerSite> | null>(null);
  const [tagsInput, setTagsInput] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("partner_sites")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error("فشل تحميل المواقع: " + error.message);
    else setSites((data as PartnerSite[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel("partner_sites_admin")
      .on("postgres_changes", { event: "*", schema: "public", table: "partner_sites" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const openNew = () => {
    setEditing({ ...EMPTY, sort_order: sites.length + 1 });
    setTagsInput("");
  };

  const openEdit = (s: PartnerSite) => {
    setEditing(s);
    setTagsInput((s.tags || []).join(", "));
  };

  const save = async () => {
    if (!editing) return;
    const payload: any = {
      ...editing,
      tags: tagsInput.split(",").map(t => t.trim()).filter(Boolean),
      custom_screenshot_url: editing.custom_screenshot_url || null,
    };

    if (!payload.slug || !payload.name_ar || !payload.url) {
      toast.error("الحقول المطلوبة: المعرّف (slug)، الاسم بالعربية، الرابط");
      return;
    }

    const { id, ...data } = payload;
    const op = id
      ? supabase.from("partner_sites").update(data).eq("id", id)
      : supabase.from("partner_sites").insert(data);

    const { error } = await op;
    if (error) toast.error("خطأ: " + error.message);
    else {
      toast.success(id ? "تم التحديث" : "تمت الإضافة");
      setEditing(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف هذا الموقع نهائياً؟")) return;
    const { error } = await supabase.from("partner_sites").delete().eq("id", id);
    if (error) toast.error("خطأ: " + error.message);
    else toast.success("تم الحذف");
  };

  const toggleVisible = async (s: PartnerSite) => {
    const { error } = await supabase
      .from("partner_sites")
      .update({ is_visible: !s.is_visible })
      .eq("id", s.id);
    if (error) toast.error(error.message);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">🌐 إدارة المواقع الشريكة</h1>
          <p className="text-sm text-muted-foreground mt-1">
            تظهر هذه المواقع في قسم "Our Partner Sites" بالصفحة الرئيسية. الصور تُولَّد تلقائياً عبر thum.io.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> إضافة موقع
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sites.map((s) => {
            const preview = s.custom_screenshot_url || screenshotUrl(s.url, 600, 380);
            return (
              <Card key={s.id} className={`overflow-hidden ${!s.is_visible ? "opacity-50" : ""}`}>
                <div className="relative aspect-[16/10] bg-secondary/40 overflow-hidden">
                  <img src={preview} alt={s.name_en} loading="lazy" className="w-full h-full object-cover" />
                  {s.is_featured && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1">
                      <Star className="w-3 h-3" /> مميز
                    </span>
                  )}
                  <span className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    s.status === "live" ? "bg-success text-white" : s.status === "coming" ? "bg-warning text-white" : "bg-muted text-foreground"
                  }`}>
                    {s.status}
                  </span>
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">{s.name_ar}</h3>
                      <p className="text-xs text-muted-foreground truncate">{s.name_en}</p>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-1" dir="ltr">
                        <ExternalLink className="w-3 h-3" />
                        {s.url.replace(/^https?:\/\//, "")}
                      </a>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-secondary">#{s.sort_order}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{t}</span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button size="sm" variant="ghost" onClick={() => toggleVisible(s)}>
                      {s.is_visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => remove(s.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit/Create dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "تعديل موقع" : "إضافة موقع جديد"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Slug (معرّف فريد) *</Label>
                  <Input value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="hn-driver" />
                </div>
                <div>
                  <Label>الترتيب</Label>
                  <Input type="number" value={editing.sort_order || 0} onChange={(e) => setEditing({ ...editing, sort_order: +e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الاسم (عربي) *</Label>
                  <Input value={editing.name_ar || ""} onChange={(e) => setEditing({ ...editing, name_ar: e.target.value })} />
                </div>
                <div>
                  <Label>الاسم (إنجليزي)</Label>
                  <Input value={editing.name_en || ""} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>الرابط الرسمي *</Label>
                <Input value={editing.url || ""} onChange={(e) => setEditing({ ...editing, url: e.target.value })} placeholder="https://www.example.com" dir="ltr" />
              </div>

              <div>
                <Label>الوصف (عربي)</Label>
                <Textarea rows={2} value={editing.description_ar || ""} onChange={(e) => setEditing({ ...editing, description_ar: e.target.value })} />
              </div>

              <div>
                <Label>الوصف (إنجليزي)</Label>
                <Textarea rows={2} value={editing.description_en || ""} onChange={(e) => setEditing({ ...editing, description_en: e.target.value })} />
              </div>

              <div>
                <Label>الوسوم (مفصولة بفاصلة)</Label>
                <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="React, AI, Supabase" />
              </div>

              <div>
                <Label>صورة معاينة مخصصة (اختياري)</Label>
                <Input value={editing.custom_screenshot_url || ""} onChange={(e) => setEditing({ ...editing, custom_screenshot_url: e.target.value })} placeholder="اتركه فارغاً لاستخدام screenshot تلقائي" dir="ltr" />
                <p className="text-[11px] text-muted-foreground mt-1">إذا تُرك فارغاً، سيُولَّد screenshot تلقائياً عبر thum.io من الرابط أعلاه.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>الحالة</Label>
                  <Select value={editing.status || "live"} onValueChange={(v: any) => setEditing({ ...editing, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">منشور</SelectItem>
                      <SelectItem value="coming">قريباً</SelectItem>
                      <SelectItem value="hidden">مخفي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>التقييم</Label>
                  <Input type="number" step="0.1" min="0" max="5" value={editing.rating || 4.8} onChange={(e) => setEditing({ ...editing, rating: +e.target.value })} />
                </div>
                <div>
                  <Label>المستخدمون</Label>
                  <Input value={editing.users_label || ""} onChange={(e) => setEditing({ ...editing, users_label: e.target.value })} placeholder="10K+" />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={!!editing.is_visible} onCheckedChange={(v) => setEditing({ ...editing, is_visible: v })} />
                  ظاهر للزوار
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={!!editing.is_featured} onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })} />
                  مميز
                </label>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
            <Button onClick={save}>حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
