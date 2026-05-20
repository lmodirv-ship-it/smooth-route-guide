/**
 * Admin Blog management — /admin/blog
 * Full CRUD for blog_posts. Lists every post (incl. drafts) with direct link
 * to the public page /blog/:id.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, ExternalLink, Copy, FileText } from "lucide-react";
import { toast } from "sonner";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category: string | null;
  language: string | null;
  published: boolean;
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

const empty: Partial<Post> = {
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  image_url: "",
  category: "",
  language: "ar",
  published: false,
  meta_title: "",
  meta_description: "",
};

const AdminBlog = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Post>>(empty);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("فشل التحميل: " + error.message);
    setPosts((data as Post[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (p: Post) => {
    setForm(p);
    setOpen(true);
  };

  const save = async () => {
    if (!form.title?.trim()) {
      toast.error("العنوان مطلوب");
      return;
    }
    setSaving(true);
    const payload: any = {
      slug:
        form.slug?.trim() ||
        form.title!
          .toLowerCase()
          .replace(/[^a-z0-9\u0600-\u06FF]+/gi, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 80),
      title: form.title,
      excerpt: form.excerpt || null,
      content: form.content || null,
      image_url: form.image_url || null,
      category: form.category || null,
      language: form.language || "ar",
      published: !!form.published,
      published_at: form.published ? form.published_at || new Date().toISOString() : null,
      meta_title: form.meta_title || null,
      meta_description: form.meta_description || null,
    };

    const { error } = form.id
      ? await supabase.from("blog_posts").update(payload).eq("id", form.id)
      : await supabase.from("blog_posts").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("فشل الحفظ: " + error.message);
      return;
    }
    toast.success(form.id ? "تم التحديث" : "تم إنشاء المقال");
    setOpen(false);
    load();
  };

  const remove = async (p: Post) => {
    if (!confirm(`حذف "${p.title}"؟`)) return;
    const { error } = await supabase.from("blog_posts").delete().eq("id", p.id);
    if (error) {
      toast.error("فشل الحذف: " + error.message);
      return;
    }
    toast.success("تم الحذف");
    load();
  };

  const copyLink = (p: Post) => {
    const url = `${window.location.origin}/blog/${p.slug || p.id}`;
    navigator.clipboard.writeText(url);
    toast.success("تم نسخ الرابط");
  };

  return (
    <div className="p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">إدارة المدونة</h1>
            <p className="text-sm text-muted-foreground">{posts.length} مقال</p>
          </div>
        </div>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> مقال جديد
        </Button>
      </div>

      {loading ? (
        <Card className="p-12 text-center text-muted-foreground">جارٍ التحميل...</Card>
      ) : posts.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          لا توجد مقالات بعد. اضغط "مقال جديد" للبدء.
        </Card>
      ) : (
        <div className="grid gap-3">
          {posts.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant={p.published ? "default" : "secondary"}>
                      {p.published ? "منشور" : "مسودة"}
                    </Badge>
                    {p.language && (
                      <Badge variant="outline" className="uppercase text-xs">
                        {p.language}
                      </Badge>
                    )}
                    {p.category && (
                      <Badge variant="outline" className="text-xs">
                        {p.category}
                      </Badge>
                    )}
                  </div>
                  <div className="font-semibold">{p.title}</div>
                  <code className="text-xs text-muted-foreground break-all" dir="ltr">
                    /blog/{p.slug || p.id}
                  </code>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/blog/${p.slug || p.id}`} target="_blank">
                    <Button size="sm" variant="outline" className="gap-1">
                      <ExternalLink className="w-4 h-4" /> فتح
                    </Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => copyLink(p)} title="نسخ الرابط">
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(p)} className="gap-1">
                    <Pencil className="w-4 h-4" /> تعديل
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => remove(p)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل المقال" : "مقال جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>العنوان *</Label>
              <Input
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Slug (اختياري)</Label>
                <Input
                  value={form.slug || ""}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="auto"
                  dir="ltr"
                />
              </div>
              <div>
                <Label>اللغة</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={form.language || "ar"}
                  onChange={(e) => setForm({ ...form, language: e.target.value })}
                >
                  <option value="ar">العربية</option>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                  <option value="es">Español</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>التصنيف</Label>
                <Input
                  value={form.category || ""}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
              <div>
                <Label>رابط الصورة</Label>
                <Input
                  dir="ltr"
                  value={form.image_url || ""}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label>المقدمة</Label>
              <Textarea
                rows={2}
                value={form.excerpt || ""}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
            </div>
            <div>
              <Label>المحتوى</Label>
              <Textarea
                rows={10}
                value={form.content || ""}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
            </div>
            <div>
              <Label>عنوان SEO</Label>
              <Input
                value={form.meta_title || ""}
                onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
              />
            </div>
            <div>
              <Label>وصف SEO</Label>
              <Textarea
                rows={2}
                value={form.meta_description || ""}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch
                checked={!!form.published}
                onCheckedChange={(v) => setForm({ ...form, published: v })}
              />
              <Label>منشور</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                إلغاء
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBlog;
