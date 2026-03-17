import { useState } from "react";
import { motion } from "framer-motion";
import {
  Users, Car, DollarSign, TrendingUp, BarChart3, Bell,
  Search, Filter, ChevronLeft, Shield, Eye, Settings,
  Headphones, MapPin, AlertTriangle, CheckCircle, Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hn-driver-logo.png";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("overview");

  const stats = [
    { icon: Users, label: "المستخدمين", value: "١٢,٤٥٦", change: "+٢٣%", color: "text-info", glow: "glow-ring-blue" },
    { icon: Car, label: "السائقين", value: "٣,٢١٠", change: "+١٥%", color: "text-primary", glow: "glow-ring-orange" },
    { icon: DollarSign, label: "الإيرادات", value: "٤٥٠K ر.س", change: "+٣٢%", color: "text-success", glow: "" },
    { icon: TrendingUp, label: "الرحلات اليوم", value: "٨٥٦", change: "+١٨%", color: "text-warning", glow: "" },
  ];

  const recentDrivers = [
    { name: "محمد السعيد", status: "نشط", rating: 4.9, trips: 234, joined: "٢٠٢٥/١٢" },
    { name: "أحمد الحربي", status: "معلق", rating: 4.5, trips: 156, joined: "٢٠٢٦/٠١" },
    { name: "خالد العمري", status: "نشط", rating: 4.8, trips: 312, joined: "٢٠٢٥/١٠" },
    { name: "فهد القحطاني", status: "محظور", rating: 3.2, trips: 45, joined: "٢٠٢٦/٠٢" },
  ];

  const alerts = [
    { type: "warning", title: "٥ سائقين بوثائق منتهية", time: "منذ ساعة" },
    { type: "error", title: "شكوى عميل - رحلة #٢٣٤٥", time: "منذ ٣٠ دقيقة" },
    { type: "success", title: "تم تفعيل ١٢ سائق جديد", time: "منذ ٢ ساعة" },
  ];

  const sidebar = [
    { id: "overview", icon: BarChart3, label: "نظرة عامة" },
    { id: "drivers", icon: Car, label: "السائقين" },
    { id: "users", icon: Users, label: "المستخدمين" },
    { id: "trips", icon: MapPin, label: "الرحلات" },
    { id: "earnings", icon: DollarSign, label: "المالية" },
    { id: "support", icon: Headphones, label: "الدعم" },
    { id: "settings", icon: Settings, label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen gradient-dark flex">
      {/* Sidebar */}
      <div className="w-64 glass-strong border-l border-border hidden md:flex flex-col">
        <div className="p-4 flex items-center gap-2 border-b border-border">
          <img src={logo} alt="HN" className="w-8 h-8" />
          <span className="font-bold font-display text-gradient-primary">لوحة التحكم</span>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {sidebar.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-right transition-colors ${
                activeSection === item.id
                  ? "gradient-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="glass-strong border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button className="p-2 relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="absolute top-0 right-0 w-2 h-2 rounded-full bg-destructive" />
            </button>
            <div className="icon-circle-orange w-8 h-8">
              <Shield className="w-4 h-4 text-primary" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Input placeholder="بحث..." className="bg-secondary/80 border-border h-9 rounded-lg pr-9 text-right text-sm" />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <h2 className="font-bold text-foreground">
              {sidebar.find(s => s.id === activeSection)?.label}
            </h2>
          </div>
        </div>

        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="gradient-card rounded-xl p-4 border border-border"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-success bg-success/10 px-2 py-0.5 rounded-full">{stat.change}</span>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-secondary ${stat.glow}`}>
                    <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Drivers Table */}
            <div className="lg:col-span-2 gradient-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <Button size="sm" variant="outline" className="text-xs gap-1">
                  <Filter className="w-3 h-3" /> فلترة
                </Button>
                <h3 className="font-bold text-foreground">آخر السائقين</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-right">
                      <th className="p-3 text-xs text-muted-foreground font-medium">إجراء</th>
                      <th className="p-3 text-xs text-muted-foreground font-medium">الحالة</th>
                      <th className="p-3 text-xs text-muted-foreground font-medium">الرحلات</th>
                      <th className="p-3 text-xs text-muted-foreground font-medium">التقييم</th>
                      <th className="p-3 text-xs text-muted-foreground font-medium">الاسم</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDrivers.map((d, i) => (
                      <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                        <td className="p-3">
                          <button className="text-info text-xs hover:underline flex items-center gap-1">
                            <Eye className="w-3 h-3" /> عرض
                          </button>
                        </td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            d.status === "نشط" ? "bg-success/10 text-success" :
                            d.status === "معلق" ? "bg-warning/10 text-warning" :
                            "bg-destructive/10 text-destructive"
                          }`}>{d.status}</span>
                        </td>
                        <td className="p-3 text-sm text-foreground">{d.trips}</td>
                        <td className="p-3 text-sm text-warning">{d.rating}</td>
                        <td className="p-3 text-sm text-foreground font-medium">{d.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Alerts */}
            <div className="gradient-card rounded-xl border border-border">
              <div className="p-4 border-b border-border">
                <h3 className="font-bold text-foreground text-right">التنبيهات</h3>
              </div>
              <div className="p-4 space-y-3">
                {alerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className="flex-1 text-right">
                      <p className="text-sm text-foreground">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                    </div>
                    {alert.type === "warning" && <AlertTriangle className="w-5 h-5 text-warning shrink-0" />}
                    {alert.type === "error" && <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />}
                    {alert.type === "success" && <CheckCircle className="w-5 h-5 text-success shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
