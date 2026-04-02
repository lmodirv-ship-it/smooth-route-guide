/**
 * Admin Coupons Management Page
 * CRUD for discount coupons with usage tracking
 */
import { useState, useEffect } from "react";
import { Ticket, Plus, Trash2, Copy, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  min_order_amount: number;
  max_uses: number;
  current_uses: number;
  is_active: boolean;
  expires_at: string | null;
  applies_to: string;
  created_at: string;
}

const generateCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "HN";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
};

const CouponsManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    code: generateCode(),
    discount_type: "percentage",
    discount_value: 10,
    max_discount: 50,
    min_order_amount: 0,
    max_uses: 0,
    is_active: true,
    expires_at: "",
    applies_to: "all",
  });

  const fetchCoupons = async () => {
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    setCoupons(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSave = async () => {
    if (!form.code.trim() || form.discount_value <= 0) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        code: form.code.toUpperCase().trim(),
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        max_discount: form.discount_type === "percentage" ? form.max_discount : null,
        min_order_amount: form.min_order_amount,
        max_uses: form.max_uses,
        is_active: form.is_active,
        expires_at: form.expires_at || null,
        applies_to: form.applies_to,
        created_by: user?.id,
      };
      const { error } = await supabase.from("coupons").insert(payload) as any;
      if (error) throw error;
      toast({ title: "تم إنشاء الكوبون بنجاح ✅" });
      setShowDialog(false);
      setForm({ ...form, code: generateCode() });
      fetchCoupons();
    } catch (err: any) {
      toast({ title: err.message?.includes("unique") ? "كود الكوبون موجود مسبقاً" : "حدث خطأ", variant: "destructive" });
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from("coupons").update({ is_active: active } as any).eq("id", id);
    fetchCoupons();
  };

  const deleteCoupon = async (id: string) => {
    await supabase.from("coupons").delete().eq("id", id);
    fetchCoupons();
    toast({ title: "تم حذف الكوبون" });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: `تم نسخ الكود: ${code}` });
  };

  return (
    <div className="space-y-6 p-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Ticket className="w-6 h-6 text-primary" /> كوبونات الخصم
        </h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> كوبون جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" dir="rtl">
            <DialogHeader><DialogTitle>إنشاء كوبون خصم جديد</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>كود الكوبون</Label>
                <div className="flex gap-2">
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="font-mono tracking-widest" />
                  <Button variant="outline" size="icon" onClick={() => setForm({ ...form, code: generateCode() })}>🔄</Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>نوع الخصم</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">نسبة مئوية %</SelectItem>
                      <SelectItem value="fixed">مبلغ ثابت DH</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>قيمة الخصم</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })} />
                </div>
              </div>

              {form.discount_type === "percentage" && (
                <div>
                  <Label>الحد الأقصى للخصم (DH)</Label>
                  <Input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: +e.target.value })} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>الحد الأدنى للطلب (DH)</Label>
                  <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: +e.target.value })} />
                </div>
                <div>
                  <Label>عدد الاستخدامات (0 = لا محدود)</Label>
                  <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: +e.target.value })} />
                </div>
              </div>

              <div>
                <Label>ينطبق على</Label>
                <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="delivery">التوصيل فقط</SelectItem>
                    <SelectItem value="ride">الرحلات فقط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>تاريخ الانتهاء (اختياري)</Label>
                <Input type="datetime-local" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} />
              </div>

              <div className="flex items-center justify-between">
                <Label>مفعّل</Label>
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء الكوبون"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Ticket className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p className="text-lg">لا توجد كوبونات بعد</p>
          <p className="text-sm">أنشئ كوبون خصم لجذب المزيد من العملاء</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-secondary/50">
                <TableHead className="text-right">الكود</TableHead>
                <TableHead className="text-right">الخصم</TableHead>
                <TableHead className="text-right">ينطبق على</TableHead>
                <TableHead className="text-right">الاستخدامات</TableHead>
                <TableHead className="text-right">الانتهاء</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((c) => {
                const expired = c.expires_at && new Date(c.expires_at) < new Date();
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-primary/10 text-primary px-2 py-1 rounded font-mono font-bold text-sm tracking-wider">{c.code}</code>
                        <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-foreground"><Copy className="w-4 h-4" /></button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-bold text-foreground">
                        {c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} DH`}
                      </span>
                      {c.max_discount && c.discount_type === "percentage" && (
                        <span className="text-xs text-muted-foreground block">حد أقصى: {c.max_discount} DH</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {c.applies_to === "all" ? "الكل" : c.applies_to === "delivery" ? "توصيل" : "رحلات"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.current_uses} / {c.max_uses === 0 ? "∞" : c.max_uses}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.expires_at ? new Date(c.expires_at).toLocaleDateString("ar") : "—"}
                    </TableCell>
                    <TableCell>
                      {expired ? (
                        <Badge variant="destructive" className="text-xs">منتهي</Badge>
                      ) : c.is_active ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-xs">مفعّل</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">معطّل</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Switch checked={c.is_active} onCheckedChange={(v) => toggleActive(c.id, v)} />
                        <Button variant="ghost" size="icon" onClick={() => deleteCoupon(c.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default CouponsManagement;
