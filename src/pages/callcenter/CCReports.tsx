import { BarChart3, TrendingUp, Phone, Clock, Users, Star } from "lucide-react";

const CCReports = () => {
  const weeklyData = [
    { day: "الإثنين", calls: 42, resolved: 38 },
    { day: "الثلاثاء", calls: 55, resolved: 50 },
    { day: "الأربعاء", calls: 38, resolved: 35 },
    { day: "الخميس", calls: 61, resolved: 55 },
    { day: "الجمعة", calls: 73, resolved: 68 },
    { day: "السبت", calls: 47, resolved: 44 },
    { day: "الأحد", calls: 29, resolved: 27 },
  ];
  const maxCalls = Math.max(...weeklyData.map(d => d.calls));

  const agentPerformance = [
    { name: "وكيل #01", calls: 85, avgTime: "3:24", satisfaction: "94%", resolved: "91%" },
    { name: "وكيل #02", calls: 72, avgTime: "4:12", satisfaction: "88%", resolved: "85%" },
    { name: "وكيل #03", calls: 63, avgTime: "2:56", satisfaction: "96%", resolved: "93%" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">التقارير</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { icon: Phone, label: "إجمالي المكالمات", value: "345", color: "text-primary" },
          { icon: Clock, label: "متوسط المدة", value: "3:42", color: "text-warning" },
          { icon: Star, label: "رضا العملاء", value: "92%", color: "text-success" },
          { icon: TrendingUp, label: "نسبة الحل", value: "89%", color: "text-info" },
        ].map((s, i) => (
          <div key={i} className="gradient-card rounded-xl p-4 border border-border text-center">
            <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} />
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="text-foreground font-bold mb-3">المكالمات الأسبوعية</h2>
      <div className="gradient-card rounded-xl p-4 border border-border mb-6">
        <div className="flex items-end gap-2 h-32 mb-2">
          {weeklyData.map((d, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] text-muted-foreground">{d.calls}</span>
              <div className="w-full rounded-t gradient-primary" style={{ height: `${(d.calls / maxCalls) * 100}%` }} />
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          {weeklyData.map((d, i) => (<div key={i} className="flex-1 text-center"><span className="text-[10px] text-muted-foreground">{d.day.slice(0, 3)}</span></div>))}
        </div>
      </div>

      <h2 className="text-foreground font-bold mb-3">أداء الوكلاء</h2>
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border text-muted-foreground text-xs">
            <td className="p-3">نسبة الحل</td><td className="p-3">الرضا</td><td className="p-3">المتوسط</td><td className="p-3">المكالمات</td><td className="p-3 text-right">الوكيل</td>
          </tr></thead>
          <tbody>
            {agentPerformance.map((a, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="p-3 text-info">{a.resolved}</td>
                <td className="p-3 text-success">{a.satisfaction}</td>
                <td className="p-3 text-muted-foreground">{a.avgTime}</td>
                <td className="p-3 text-foreground">{a.calls}</td>
                <td className="p-3 text-right text-foreground font-medium">{a.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CCReports;
