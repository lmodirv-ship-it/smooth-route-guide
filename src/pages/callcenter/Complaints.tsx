import { AlertTriangle, Clock, User, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const Complaints = () => {
  const complaints = [
    { id: 1, client: "عبدالله أحمد", driver: "أحمد الفاسي", type: "تأخر", desc: "السائق تأخر 15 دقيقة عن الموعد", status: "مفتوح", time: "اليوم 14:30", priority: "عالي" },
    { id: 2, client: "فاطمة محمد", driver: "خالد المنصوري", type: "سلوك", desc: "السائق كان غير مهذب", status: "قيد المراجعة", time: "أمس 10:15", priority: "عالي" },
    { id: 3, client: "نورة السعيد", driver: "سعيد بنعمر", type: "مسار خاطئ", desc: "السائق أخذ مساراً أطول", status: "محلول", time: "12/03", priority: "متوسط" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">الشكاوى</h1>
      <div className="space-y-3">
        {complaints.map(c => (
          <div key={c.id} className="gradient-card rounded-xl p-4 border border-border">
            <div className="flex items-start justify-between mb-3">
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "مفتوح" ? "bg-warning/10 text-warning" : c.status === "قيد المراجعة" ? "bg-info/10 text-info" : "bg-success/10 text-success"}`}>{c.status}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.priority === "عالي" ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"}`}>{c.priority}</span>
              </div>
              <div className="text-right">
                <p className="text-foreground font-medium text-sm">{c.client}</p>
                <p className="text-xs text-muted-foreground">ضد: {c.driver} • {c.type}</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3 bg-secondary/50 rounded-lg p-3">{c.desc}</p>
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-success border-success/30 rounded-lg text-xs"><CheckCircle className="w-3 h-3 ml-1" /> حل</Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive/30 rounded-lg text-xs"><AlertTriangle className="w-3 h-3 ml-1" /> تصعيد</Button>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {c.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Complaints;
