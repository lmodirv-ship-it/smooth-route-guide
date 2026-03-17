import { motion } from "framer-motion";
import {
  Phone, PhoneIncoming, PhoneOff, Clock, Users, AlertTriangle,
  CheckCircle, TrendingUp, Car, Headphones, Activity, Zap, BarChart3
} from "lucide-react";

const CCDashboard = () => {
  const stats = [
    { icon: PhoneIncoming, label: "المكالمات الحالية", value: "7", change: "+3", color: "text-primary", bg: "bg-primary/10" },
    { icon: Clock, label: "الطلبات المعلقة", value: "12", change: "+5", color: "text-warning", bg: "bg-warning/10" },
    { icon: AlertTriangle, label: "الشكاوى النشطة", value: "4", change: "-1", color: "text-destructive", bg: "bg-destructive/10" },
    { icon: Car, label: "السائقون المتاحون", value: "23", change: "+2", color: "text-success", bg: "bg-success/10" },
    { icon: CheckCircle, label: "تم الحل اليوم", value: "38", change: "+12", color: "text-info", bg: "bg-info/10" },
    { icon: Users, label: "الوكلاء النشطون", value: "5/6", change: "", color: "text-foreground", bg: "bg-secondary" },
  ];

  const kpis = [
    { label: "متوسط وقت الرد", value: "12 ثانية", target: "< 15 ثانية", ok: true },
    { label: "متوسط مدة المكالمة", value: "3:42", target: "< 5:00", ok: true },
    { label: "نسبة الحل من أول اتصال", value: "87%", target: "> 80%", ok: true },
    { label: "رضا العملاء", value: "4.6/5", target: "> 4.5", ok: true },
    { label: "المكالمات المهملة", value: "3%", target: "< 5%", ok: true },
    { label: "وقت الانتظار الأقصى", value: "2:45", target: "< 2:00", ok: false },
  ];

  const recentActivity = [
    { time: "14:32", agent: "سارة", action: "رد على مكالمة", client: "عبدالله أحمد", type: "طلب رحلة", status: "محلول" },
    { time: "14:28", agent: "أحمد", action: "أنشأ تذكرة", client: "فاطمة محمد", type: "شكوى", status: "مفتوح" },
    { time: "14:25", agent: "سارة", action: "عيّن سائق", client: "خالد العمري", type: "حجز يدوي", status: "محلول" },
    { time: "14:20", agent: "يوسف", action: "صعّد حالة طوارئ", client: "نورة السعيد", type: "طوارئ", status: "جاري" },
    { time: "14:15", agent: "ليلى", action: "أغلق تذكرة", client: "محمد البكري", type: "استفسار", status: "مغلق" },
    { time: "14:10", agent: "سارة", action: "حل شكوى", client: "عائشة المنصوري", type: "شكوى", status: "محلول" },
  ];

  const agentStatus = [
    { name: "سارة", status: "في مكالمة", calls: 15, avgTime: "3:12", satisfaction: "96%" },
    { name: "أحمد", status: "متاح", calls: 12, avgTime: "4:05", satisfaction: "89%" },
    { name: "يوسف", status: "في مكالمة", calls: 10, avgTime: "2:48", satisfaction: "94%" },
    { name: "ليلى", status: "استراحة", calls: 8, avgTime: "3:30", satisfaction: "92%" },
    { name: "كريم", status: "متاح", calls: 11, avgTime: "3:55", satisfaction: "88%" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-success/10 text-success px-3 py-1 rounded-full text-xs">
            <Activity className="w-3 h-3" />
            مباشر
          </div>
        </div>
        <h1 className="text-xl font-bold text-foreground">لوحة مركز الاتصال</h1>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="gradient-card rounded-xl p-4 border border-border"
          >
            <div className="flex items-center justify-between mb-2">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              {s.change && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  s.change.startsWith("+") ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                }`}>{s.change}</span>
              )}
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* KPIs */}
        <div>
          <h2 className="text-foreground font-bold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            مؤشرات الأداء اليومية
          </h2>
          <div className="gradient-card rounded-xl border border-border divide-y divide-border">
            {kpis.map((kpi, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${kpi.ok ? "bg-success" : "bg-destructive animate-pulse"}`} />
                  <span className="text-xs text-muted-foreground">الهدف: {kpi.target}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${kpi.ok ? "text-foreground" : "text-destructive"}`}>{kpi.value}</span>
                  <span className="text-sm text-foreground">{kpi.label}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agent Status */}
        <div>
          <h2 className="text-foreground font-bold mb-3 flex items-center gap-2">
            <Headphones className="w-4 h-4 text-info" />
            حالة الوكلاء
          </h2>
          <div className="gradient-card rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs">
                  <td className="p-2.5">الرضا</td>
                  <td className="p-2.5">المتوسط</td>
                  <td className="p-2.5">المكالمات</td>
                  <td className="p-2.5">الحالة</td>
                  <td className="p-2.5 text-right">الوكيل</td>
                </tr>
              </thead>
              <tbody>
                {agentStatus.map((a, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="p-2.5 text-success text-xs">{a.satisfaction}</td>
                    <td className="p-2.5 text-muted-foreground text-xs">{a.avgTime}</td>
                    <td className="p-2.5 text-foreground text-xs">{a.calls}</td>
                    <td className="p-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        a.status === "في مكالمة" ? "bg-primary/10 text-primary" :
                        a.status === "متاح" ? "bg-success/10 text-success" :
                        "bg-warning/10 text-warning"
                      }`}>{a.status}</span>
                    </td>
                    <td className="p-2.5 text-right text-foreground font-medium text-xs">{a.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <h2 className="text-foreground font-bold mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        النشاط الأخير
      </h2>
      <div className="gradient-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <td className="p-3">الحالة</td>
              <td className="p-3">النوع</td>
              <td className="p-3">العميل</td>
              <td className="p-3">الإجراء</td>
              <td className="p-3">الوكيل</td>
              <td className="p-3 text-right">الوقت</td>
            </tr>
          </thead>
          <tbody>
            {recentActivity.map((a, i) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    a.status === "محلول" ? "bg-success/10 text-success" :
                    a.status === "مفتوح" ? "bg-warning/10 text-warning" :
                    a.status === "جاري" ? "bg-info/10 text-info" :
                    "bg-muted text-muted-foreground"
                  }`}>{a.status}</span>
                </td>
                <td className="p-3 text-muted-foreground text-xs">{a.type}</td>
                <td className="p-3 text-foreground text-xs">{a.client}</td>
                <td className="p-3 text-foreground text-xs">{a.action}</td>
                <td className="p-3 text-info text-xs">{a.agent}</td>
                <td className="p-3 text-right text-muted-foreground text-xs">{a.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CCDashboard;
