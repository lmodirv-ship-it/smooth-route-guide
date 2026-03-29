import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Trash2, Save, Monitor } from "lucide-react";

interface Ad {
  id: string;
  slot_number: number;
  title: string;
  content_type: string;
  content_text: string | null;
  image_url: string | null;
  link_url: string | null;
  duration_seconds: number;
  is_active: boolean;
  sort_order: number;
}

const AdsManagement = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAds = useCallback(async () => {
    const { data } = await supabase.from("ads" as any).select("*").order("slot_number").order("sort_order");
    if (data) setAds(data as unknown as Ad[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadAds(); }, [loadAds]);

  const addAd = async () => {
    const { error } = await supabase.from("ads" as any).insert({
      slot_number: 1,
      title: "إعلان جديد",
      content_type: "text",
      content_text: "",
      image_url: "",
      link_url: "",
      duration_seconds: 5,
      is_active: true,
      sort_order: ads.length,
    } as any);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تمت الإضافة" }); loadAds(); }
  };

  const updateAd = async (id: string, updates: Partial<Ad>) => {
    const { error } = await supabase.from("ads" as any).update({ ...updates, updated_at: new Date().toISOString() } as any).eq("id", id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم الحفظ" }); loadAds(); }
  };

  const deleteAd = async (id: string) => {
    if (!confirm("حذف هذا الإعلان؟")) return;
    const { error } = await supabase.from("ads" as any).delete().eq("id", id);
    if (error) toast({ title: "خطأ", description: error.message, variant: "destructive" });
    else { toast({ title: "تم الحذف" }); loadAds(); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Monitor className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">إدارة الإعلانات</h1>
        </div>
        <Button onClick={addAd} className="gap-2">
          <Plus className="w-4 h-4" /> إضافة إعلان
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        4 شاشات إعلانية في أسفل الصفحة الرئيسية — يمكنك إضافة عدة إعلانات لكل شاشة مع التدوير التلقائي.
      </p>

      {/* Slot overview */}
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(slot => {
          const count = ads.filter(a => a.slot_number === slot).length;
          const active = ads.filter(a => a.slot_number === slot && a.is_active).length;
          return (
            <div key={slot} className="rounded-xl border border-border bg-card/50 p-4 text-center">
              <div className="text-xs text-muted-foreground mb-1">شاشة {slot}</div>
              <div className="text-lg font-bold text-foreground">{active}/{count}</div>
              <div className="text-xs text-muted-foreground">نشط</div>
            </div>
          );
        })}
      </div>

      {/* Ads list */}
      <div className="space-y-4">
        {ads.map(ad => (
          <AdRow key={ad.id} ad={ad} onUpdate={updateAd} onDelete={deleteAd} />
        ))}
        {ads.length === 0 && (
          <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
            لا توجد إعلانات بعد — اضغط "إضافة إعلان" للبدء
          </div>
        )}
      </div>
    </div>
  );
};

const AdRow = ({ ad, onUpdate, onDelete }: { ad: Ad; onUpdate: (id: string, u: Partial<Ad>) => void; onDelete: (id: string) => void }) => {
  const [title, setTitle] = useState(ad.title);
  const [contentText, setContentText] = useState(ad.content_text || "");
  const [imageUrl, setImageUrl] = useState(ad.image_url || "");
  const [linkUrl, setLinkUrl] = useState(ad.link_url || "");
  const [duration, setDuration] = useState(ad.duration_seconds);
  const [contentType, setContentType] = useState(ad.content_type);
  const [slotNumber, setSlotNumber] = useState(ad.slot_number);

  const save = () => onUpdate(ad.id, { title, content_text: contentText, image_url: imageUrl, link_url: linkUrl, duration_seconds: duration, content_type: contentType, slot_number: slotNumber });

  return (
    <div className="rounded-xl border border-border bg-card/60 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Switch checked={ad.is_active} onCheckedChange={v => onUpdate(ad.id, { is_active: v })} />
          <span className={`text-sm font-medium ${ad.is_active ? "text-green-400" : "text-muted-foreground"}`}>
            {ad.is_active ? "نشط" : "معطل"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={save} className="gap-1"><Save className="w-3 h-3" /> حفظ</Button>
          <Button size="sm" variant="destructive" onClick={() => onDelete(ad.id)}><Trash2 className="w-3 h-3" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">العنوان</label>
          <Input value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">الشاشة</label>
          <Select value={String(slotNumber)} onValueChange={v => setSlotNumber(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map(s => <SelectItem key={s} value={String(s)}>شاشة {s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">النوع</label>
          <Select value={contentType} onValueChange={v => setContentType(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="text">نص</SelectItem>
              <SelectItem value="image">صورة</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contentType === "image" ? (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">رابط الصورة</label>
            <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." dir="ltr" />
          </div>
        ) : (
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">النص</label>
            <Textarea value={contentText} onChange={e => setContentText(e.target.value)} rows={2} />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">رابط (اختياري)</label>
            <Input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." dir="ltr" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">المدة (ثوان)</label>
            <Input type="number" min={2} max={60} value={duration} onChange={e => setDuration(Number(e.target.value))} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdsManagement;
