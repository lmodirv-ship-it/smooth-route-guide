import { FileText, Clock, CheckCircle, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const Tickets = () => {
  const tickets = [
    { id: "T-001", subject: "مشكلة في الدفع", client: "عبدالله", status: "مفتوح", priority: "عالي", created: "اليوم 10:30", agent: "وكيل #01" },
    { id: "T-002", subject: "تطبيق لا يعمل", client: "فاطمة", status: "جاري", priority: "متوسط", created: "أمس 14:00", agent: "وكيل #02" },
    { id: "T-003", subject: "استرجاع مبلغ", client: "خالد", status: "مغلق", priority: "منخفض", created: "12/03", agent: "وكيل #01" },
    { id: "T-004", subject: "حساب محظور", client: "نورة", status: "مفتوح", priority: "عالي", created: "اليوم 09:15", agent: "غير معين" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg"><Plus className="w-4 h-4 ml-1" /> تذكرة جديدة</Button>
        <h1 className="text-xl font-bold text-foreground">التذاكر</h1>
      </div>

      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground text-xs">
            <td className="p-3">الوكيل</td><td className="p-3">الأولوية</td><td className="p-3">الحالة</td><td className="p-3">التاريخ</td><td className="p-3">الموضوع</td><td className="p-3 text-right">#</td>
          </tr></thead>
          <tbody>
            {tickets.map(t => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                <td className="p-3 text-muted-foreground text-xs">{t.agent}</td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${t.priority === "عالي" ? "bg-destructive/10 text-destructive" : t.priority === "متوسط" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"}`}>{t.priority}</span></td>
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${t.status === "مفتوح" ? "bg-warning/10 text-warning" : t.status === "جاري" ? "bg-info/10 text-info" : "bg-success/10 text-success"}`}>{t.status}</span></td>
                <td className="p-3 text-muted-foreground text-xs">{t.created}</td>
                <td className="p-3 text-foreground">{t.subject}</td>
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
