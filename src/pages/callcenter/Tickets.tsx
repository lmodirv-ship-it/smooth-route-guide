import { useState } from "react";
import { FileText, Clock, CheckCircle, AlertCircle, Plus, User, Car, MapPin, Link, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Tickets = () => {
  const [showNew, setShowNew] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "progress" | "closed">("all");

  const tickets = [
    { id: "T-001", subject: "مشكلة في الدفع", desc: "العميل يبلغ بخصم مزدوج من حسابه", client: "عبدالله أحمد", linkedTo: "رحلة R-042", status: "مفتوح", priority: "عالي", created: "اليوم 10:30", agent: "سارة", type: "عميل" },
    { id: "T-002", subject: "تطبيق لا يعمل", desc: "السائق لا يستطيع قبول الطلبات", client: "أحمد الفاسي", linkedTo: "سائق D-012", status: "جاري", priority: "متوسط", created: "أمس 14:00", agent: "أحمد", type: "سائق" },
    { id: "T-003", subject: "استرجاع مبلغ", desc: "طلب استرجاع 35 DH بسبب إلغاء من السائق", client: "خالد العمري", linkedTo: "رحلة R-038", status: "مغلق", priority: "منخفض", created: "12/03", agent: "سارة", type: "عميل" },
    { id: "T-004", subject: "حساب محظور", desc: "العميل يطلب إعادة تفعيل حسابه بعد الحظر", client: "نورة السعيد", linkedTo: "عميل C-055", status: "مفتوح", priority: "عالي", created: "اليوم 09:15", agent: "غير معين", type: "عميل" },
    { id: "T-005", subject: "وثائق منتهية", desc: "السائق لديه تأمين منتهي الصلاحية", client: "خالد المنصوري", linkedTo: "سائق D-008", status: "جاري", priority: "عالي", created: "اليوم 08:00", agent: "يوسف", type: "سائق" },
  ];

  const filtered = filter === "all" ? tickets :
    filter === "open" ? tickets.filter(t => t.status === "مفتوح") :
    filter === "progress" ? tickets.filter(t => t.status === "جاري") :
    tickets.filter(t => t.status === "مغلق");

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button size="sm" onClick={() => setShowNew(!showNew)} className="gradient-primary text-primary-foreground rounded-lg">
          <Plus className="w-4 h-4 ml-1" /> تذكرة جديدة
        </Button>
        <h1 className="text-xl font-bold text-foreground">نظام التذاكر</h1>
      </div>

      {showNew && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="gradient-card rounded-xl p-4 border border-border mb-4 space-y-3">
          <h3 className="text-foreground font-bold text-sm">إنشاء تذكرة جديدة</h3>
          <Input placeholder="الموضوع" className="bg-secondary border-border rounded-lg text-right text-sm" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input placeholder="ربط بعميل (اختياري)" className="bg-secondary border-border rounded-lg text-right text-sm" />
            <Input placeholder="ربط بسائق (اختياري)" className="bg-secondary border-border rounded-lg text-right text-sm" />
            <Input placeholder="ربط برحلة (اختياري)" className="bg-secondary border-border rounded-lg text-right text-sm" />
          </div>
          <div className="flex gap-2">
            <select className="flex-1 bg-secondary border border-border rounded-lg text-sm text-foreground p-2 text-right">
              <option>عالي</option><option>متوسط</option><option>منخفض</option>
            </select>
            <select className="flex-1 bg-secondary border border-border rounded-lg text-sm text-foreground p-2 text-right">
              <option>عميل</option><option>سائق</option><option>نظام</option>
            </select>
          </div>
          <Textarea placeholder="تفاصيل التذكرة..." className="bg-secondary border-border rounded-lg text-right min-h-[60px] text-sm" />
          <div className="flex gap-2">
            <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg" onClick={() => { setShowNew(false); toast({ title: "✅ تم إنشاء التذكرة" }); }}>إنشاء</Button>
            <Button size="sm" variant="outline" className="border-border rounded-lg" onClick={() => setShowNew(false)}>إلغاء</Button>
          </div>
        </motion.div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {([["all", "الكل"], ["open", "مفتوح"], ["progress", "جاري"], ["closed", "مغلق"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            }`}>{label}</button>
        ))}
      </div>

      {/* Tickets Table */}
      <div className="gradient-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <td className="p-3">الوكيل</td>
              <td className="p-3">الأولوية</td>
              <td className="p-3">الحالة</td>
              <td className="p-3">مرتبط بـ</td>
              <td className="p-3">العميل/السائق</td>
              <td className="p-3">التاريخ</td>
              <td className="p-3">الموضوع</td>
              <td className="p-3 text-right">#</td>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="p-3 text-muted-foreground text-xs">{t.agent}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.priority === "عالي" ? "bg-destructive/10 text-destructive" :
                    t.priority === "متوسط" ? "bg-warning/10 text-warning" :
                    "bg-info/10 text-info"
                  }`}>{t.priority}</span>
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === "مفتوح" ? "bg-warning/10 text-warning" :
                    t.status === "جاري" ? "bg-info/10 text-info" :
                    "bg-success/10 text-success"
                  }`}>{t.status}</span>
                </td>
                <td className="p-3 text-xs text-muted-foreground flex items-center gap-1">
                  <Link className="w-3 h-3" /> {t.linkedTo}
                </td>
                <td className="p-3 text-foreground text-xs">
                  <div className="flex items-center gap-1">
                    {t.type === "عميل" ? <User className="w-3 h-3 text-info" /> : <Car className="w-3 h-3 text-primary" />}
                    {t.client}
                  </div>
                </td>
                <td className="p-3 text-muted-foreground text-xs">{t.created}</td>
                <td className="p-3 text-foreground text-xs font-medium">{t.subject}</td>
                <td className="p-3 text-right text-muted-foreground font-mono text-xs">{t.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Tickets;
