import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, User, CheckCircle, XCircle, ArrowUp, Plus, MessageCircle, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const Complaints = () => {
  const [filter, setFilter] = useState<"all" | "open" | "review" | "resolved">("all");
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);

  const complaints = [
    { id: 1, client: "عبدالله أحمد", driver: "أحمد الفاسي", category: "تأخر", desc: "السائق تأخر 15 دقيقة عن الموعد المحدد بدون إشعار مسبق", status: "مفتوح", time: "اليوم 14:30", priority: "عالي", trip: "R-001", agentNotes: "" },
    { id: 2, client: "فاطمة محمد", driver: "خالد المنصوري", category: "سلوك", desc: "السائق كان غير مهذب في التعامل ورفض تشغيل التكييف", status: "قيد المراجعة", time: "أمس 10:15", priority: "عالي", trip: "R-002", agentNotes: "تم التواصل مع السائق" },
    { id: 3, client: "نورة السعيد", driver: "سعيد بنعمر", category: "مسار خاطئ", desc: "السائق أخذ مساراً أطول من المعتاد مما رفع سعر الرحلة", status: "محلول", time: "12/03", priority: "متوسط", trip: "R-003", agentNotes: "تم تعويض العميل 15 DH" },
    { id: 4, client: "محمد البكري", driver: "يوسف العربي", category: "فوترة", desc: "تم خصم مبلغ مزدوج من المحفظة", status: "مفتوح", time: "اليوم 09:00", priority: "عالي", trip: "R-004", agentNotes: "" },
    { id: 5, client: "عائشة المنصوري", driver: "أحمد الفاسي", category: "نظافة", desc: "السيارة لم تكن نظيفة", status: "قيد المراجعة", time: "أمس 16:00", priority: "منخفض", trip: "R-005", agentNotes: "تم تحذير السائق" },
  ];

  const categories = ["تأخر", "سلوك", "مسار خاطئ", "فوترة", "نظافة", "أخرى"];

  const filtered = filter === "all" ? complaints :
    filter === "open" ? complaints.filter(c => c.status === "مفتوح") :
    filter === "review" ? complaints.filter(c => c.status === "قيد المراجعة") :
    complaints.filter(c => c.status === "محلول");

  const selectedComplaint = complaints.find(c => c.id === selected);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button size="sm" onClick={() => setShowNew(!showNew)} className="gradient-primary text-primary-foreground rounded-lg">
          <Plus className="w-4 h-4 ml-1" /> شكوى جديدة
        </Button>
        <h1 className="text-xl font-bold text-foreground">إدارة الشكاوى</h1>
      </div>

      {/* New Complaint Form */}
      {showNew && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
          className="gradient-card rounded-xl p-4 border border-border mb-4 space-y-3">
          <h3 className="text-foreground font-bold text-sm">تسجيل شكوى جديدة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input placeholder="اسم العميل أو رقمه" className="bg-secondary border-border rounded-lg text-right text-sm" />
            <Input placeholder="اسم السائق (اختياري)" className="bg-secondary border-border rounded-lg text-right text-sm" />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button key={cat} className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:border-primary hover:text-primary transition-all">{cat}</button>
            ))}
          </div>
          <Textarea placeholder="تفاصيل الشكوى..." className="bg-secondary border-border rounded-lg text-right min-h-[60px] text-sm" />
          <div className="flex gap-2">
            <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg" onClick={() => { setShowNew(false); toast({ title: "✅ تم تسجيل الشكوى" }); }}>حفظ</Button>
            <Button size="sm" variant="outline" className="border-border rounded-lg" onClick={() => setShowNew(false)}>إلغاء</Button>
          </div>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-auto">
        {([["all", "الكل", complaints.length], ["open", "مفتوح", complaints.filter(c => c.status === "مفتوح").length], ["review", "قيد المراجعة", complaints.filter(c => c.status === "قيد المراجعة").length], ["resolved", "محلول", complaints.filter(c => c.status === "محلول").length]] as const).map(([key, label, count]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              filter === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}>
            {label} ({count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2">
          {filtered.map(c => (
            <button key={c.id} onClick={() => setSelected(c.id)}
              className={`w-full gradient-card rounded-xl p-3 border text-right transition-all ${
                selected === c.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"
              }`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex gap-1">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.status === "مفتوح" ? "bg-warning/10 text-warning" : c.status === "قيد المراجعة" ? "bg-info/10 text-info" : "bg-success/10 text-success"}`}>{c.status}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.priority === "عالي" ? "bg-destructive/10 text-destructive" : c.priority === "متوسط" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>{c.priority}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{c.client}</p>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{c.desc}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{c.category} • {c.time}</p>
            </button>
          ))}
        </div>

        {selectedComplaint ? (
          <div className="lg:col-span-2 space-y-4">
            <div className="gradient-card rounded-xl p-5 border border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-success border-success/30 rounded-lg text-xs">
                    <CheckCircle className="w-3 h-3 ml-1" /> حل
                  </Button>
                  <Button size="sm" variant="outline" className="text-warning border-warning/30 rounded-lg text-xs">
                    <ArrowUp className="w-3 h-3 ml-1" /> تصعيد
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 rounded-lg text-xs">
                    <XCircle className="w-3 h-3 ml-1" /> رفض
                  </Button>
                </div>
                <h3 className="text-foreground font-bold">شكوى #{selectedComplaint.id}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { label: "العميل", value: selectedComplaint.client },
                  { label: "السائق", value: selectedComplaint.driver },
                  { label: "التصنيف", value: selectedComplaint.category },
                  { label: "الرحلة", value: selectedComplaint.trip },
                  { label: "الأولوية", value: selectedComplaint.priority },
                  { label: "التاريخ", value: selectedComplaint.time },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.value}</span>
                    <span className="text-foreground text-xs font-medium">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="bg-secondary/30 rounded-lg p-4 mb-4">
                <h4 className="text-xs font-bold text-foreground mb-1">التفاصيل</h4>
                <p className="text-sm text-muted-foreground">{selectedComplaint.desc}</p>
              </div>

              <div>
                <h4 className="text-xs font-bold text-foreground mb-2">ملاحظات الموظف</h4>
                <Textarea
                  defaultValue={selectedComplaint.agentNotes}
                  placeholder="أضف ملاحظاتك هنا..."
                  className="bg-secondary/50 border-border rounded-lg text-right min-h-[60px] text-sm"
                />
                <Button size="sm" className="mt-2 gradient-primary text-primary-foreground rounded-lg text-xs">
                  <MessageCircle className="w-3 h-3 ml-1" /> حفظ الملاحظات
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 gradient-card rounded-2xl p-12 border border-border text-center">
            <AlertTriangle className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-foreground font-bold">اختر شكوى لعرض التفاصيل</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Complaints;
