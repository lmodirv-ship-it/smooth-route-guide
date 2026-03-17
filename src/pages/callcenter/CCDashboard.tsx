import { Phone, PhoneOff, Clock, Users, AlertTriangle, CheckCircle, TrendingUp } from "lucide-react";

const CCDashboard = () => {
  const stats = [
    { icon: Phone, label: "مكالمات اليوم", value: "47", color: "text-primary", bg: "bg-primary/10" },
    { icon: Clock, label: "متوسط الانتظار", value: "1:24", color: "text-warning", bg: "bg-warning/10" },
    { icon: CheckCircle, label: "تم الحل", value: "38", color: "text-success", bg: "bg-success/10" },
    { icon: AlertTriangle, label: "عاجل", value: "3", color: "text-destructive", bg: "bg-destructive/10" },
    { icon: Users, label: "الوكلاء المتصلين", value: "5", color: "text-info", bg: "bg-info/10" },
    { icon: TrendingUp, label: "نسبة الرضا", value: "92%", color: "text-success", bg: "bg-success/10" },
  ];

  const recentCalls = [
    { caller: "عبدالله أحمد", type: "شكوى", agent: "وكيل #01", duration: "4:32", status: "محلول" },
    { caller: "فاطمة محمد", type: "طلب رحلة", agent: "وكيل #02", duration: "2:15", status: "جاري" },
    { caller: "خالد العمري", type: "استفسار", agent: "وكيل #01", duration: "1:48", status: "محلول" },
    { caller: "نورة السعيد", type: "شكوى عاجلة", agent: "وكيل #03", duration: "6:12", status: "مصعّد" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">لوحة مركز الاتصال</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map((s, i) => (
          <div key={i} className="gradient-card rounded-xl p-4 border border-border text-center">
            <div className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center mx-auto mb-2`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-foreground font-bold mb-3">آخر المكالمات</h2>
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground">
            <td className="p-3">الحالة</td><td className="p-3">المدة</td><td className="p-3">الوكيل</td><td className="p-3">النوع</td><td className="p-3 text-right">المتصل</td>
          </tr></thead>
          <tbody>
            {recentCalls.map((c, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "محلول" ? "bg-success/10 text-success" : c.status === "جاري" ? "bg-info/10 text-info" : "bg-destructive/10 text-destructive"}`}>{c.status}</span></td>
                <td className="p-3 text-muted-foreground">{c.duration}</td>
                <td className="p-3 text-foreground">{c.agent}</td>
                <td className="p-3 text-foreground">{c.type}</td>
                <td className="p-3 text-right text-foreground font-medium">{c.caller}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CCDashboard;
