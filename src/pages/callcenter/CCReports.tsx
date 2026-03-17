import { BarChart3, TrendingUp, Phone, Clock, Users, Star, CheckCircle, AlertTriangle } from "lucide-react";

const CCReports = () => {
  const weeklyData = [
    { day: "الإثنين", calls: 42, resolved: 38, missed: 2 },
    { day: "الثلاثاء", calls: 55, resolved: 50, missed: 3 },
    { day: "الأربعاء", calls: 38, resolved: 35, missed: 1 },
    { day: "الخميس", calls: 61, resolved: 55, missed: 4 },
    { day: "الجمعة", calls: 73, resolved: 68, missed: 2 },
    { day: "السبت", calls: 47, resolved: 44, missed: 1 },
    { day: "الأحد", calls: 29, resolved: 27, missed: 0 },
  ];
  const maxCalls = Math.max(...weeklyData.map(d => d.calls));

  const summaryStats = [
    { icon: Phone, label: "إجمالي المكالمات", value: "345", color: "text-primary" },
    { icon: CheckCircle, label: "تم الحل", value: "317", color: "text-success" },
    { icon: AlertTriangle, label: "الفائتة", value: "13", color: "text-destructive" },
    { icon: Clock, label: "متوسط المدة", value: "3:42", color: "text-warning" },
    { icon: Star, label: "رضا العملاء", value: "92%", color: "text-success" },
    { icon: TrendingUp, label: "نسبة الحل", value: "89%", color: "text-info" },
  ];

  const agentPerformance = [
    { name: "سارة", calls: 85, avgTime: "3:24", satisfaction: "96%", resolved: "93%", missed: 1 },
    { name: "أحمد", calls: 72, avgTime: "4:12", satisfaction: "88%", resolved: "85%", missed: 3 },
    { name: "يوسف", calls: 63, avgTime: "2:56", satisfaction: "94%", resolved: "91%", missed: 2 },
    { name: "ليلى", calls: 58, avgTime: "3:30", satisfaction: "92%", resolved: "89%", missed: 1 },
    { name: "كريم", calls: 67, avgTime: "3:55", satisfaction: "90%", resolved: "87%", missed: 4 },
  ];

  const topIssues = [
    { issue: "طلب رحلة", count: 145, pct: "42%" },
    { issue: "شكاوى السائقين", count: 58, pct: "17%" },
    { issue: "مشاكل الدفع", count: 42, pct: "12%" },
    { issue: "استفسارات عامة", count: 38, pct: "11%" },
    { issue: "إلغاء رحلات", count: 35, pct: "10%" },
    { issue: "أخرى", count: 27, pct: "8%" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">التقارير والإحصائيات</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {summaryStats.map((s, i) => (
          <div key={i} className="gradient-card rounded-xl p-4 border border-border text-center">
            <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} />
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Weekly Chart */}
        <div>
          <h2 className="text-foreground font-bold mb-3">المكالمات الأسبوعية</h2>
          <div className="gradient-card rounded-xl p-4 border border-border">
            <div className="flex items-end gap-2 h-36 mb-2">
              {weeklyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{d.calls}</span>
                  <div className="w-full rounded-t gradient-primary transition-all" style={{ height: `${(d.calls / maxCalls) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {weeklyData.map((d, i) => (
                <div key={i} className="flex-1 text-center">
                  <span className="text-[10px] text-muted-foreground">{d.day.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Issues */}
        <div>
          <h2 className="text-foreground font-bold mb-3">أكثر المواضيع شيوعاً</h2>
          <div className="gradient-card rounded-xl p-4 border border-border space-y-3">
            {topIssues.map((issue, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{issue.count} ({issue.pct})</span>
                  <span className="text-sm text-foreground">{issue.issue}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full gradient-primary rounded-full" style={{ width: issue.pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Performance */}
      <h2 className="text-foreground font-bold mb-3">أداء الوكلاء</h2>
      <div className="gradient-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <td className="p-3">الفائتة</td>
              <td className="p-3">نسبة الحل</td>
              <td className="p-3">الرضا</td>
              <td className="p-3">متوسط المدة</td>
              <td className="p-3">المكالمات</td>
              <td className="p-3 text-right">الوكيل</td>
            </tr>
          </thead>
          <tbody>
            {agentPerformance.map((a, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="p-3 text-destructive text-xs">{a.missed}</td>
                <td className="p-3 text-info text-xs">{a.resolved}</td>
                <td className="p-3 text-success text-xs">{a.satisfaction}</td>
                <td className="p-3 text-muted-foreground text-xs">{a.avgTime}</td>
                <td className="p-3 text-foreground font-medium text-xs">{a.calls}</td>
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
