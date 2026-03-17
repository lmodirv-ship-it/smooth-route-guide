import { useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { 
  BarChart3, Phone, Car, Users, Search, AlertTriangle, FileText, 
  Headphones, BarChart, Shield, Bell, PhoneCall
} from "lucide-react";
import { Input } from "@/components/ui/input";
import logo from "@/assets/hn-driver-logo.png";

const navItems = [
  { path: "/call-center", icon: BarChart3, label: "Dashboard" },
  { path: "/call-center/incoming", icon: PhoneCall, label: "المكالمات" },
  { path: "/call-center/ride-assign", icon: Car, label: "توزيع الرحلات" },
  { path: "/call-center/customers", icon: Users, label: "بحث العملاء" },
  { path: "/call-center/drivers", icon: Car, label: "بحث السائقين" },
  { path: "/call-center/complaints", icon: AlertTriangle, label: "الشكاوى" },
  { path: "/call-center/tickets", icon: FileText, label: "التذاكر" },
  { path: "/call-center/emergency", icon: AlertTriangle, label: "الطوارئ" },
  { path: "/call-center/reports", icon: BarChart, label: "التقارير" },
];

const CallCenterLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => path === "/call-center" ? location.pathname === "/call-center" : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen gradient-dark flex" dir="rtl">
      <aside className={`${collapsed ? "w-16" : "w-60"} glass-strong border-l border-border hidden lg:flex flex-col transition-all duration-300`}>
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <img src={logo} alt="HN" className="w-8 h-8 flex-shrink-0" />
          {!collapsed && <span className="font-bold text-gradient-primary font-display text-sm">مركز الاتصال</span>}
        </div>
        {!collapsed && (
          <div className="p-3 border-b border-border flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center">
              <Headphones className="w-4 h-4 text-info" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">Agent #01</p>
              <p className="text-[10px] text-success">متصل</p>
            </div>
          </div>
        )}
        <nav className="flex-1 p-2 space-y-1 overflow-auto">
          {navItems.map((item) => (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`w-full flex items-center ${collapsed ? "justify-center" : "justify-start"} gap-2 px-3 py-2 rounded-lg transition-all text-sm ${
                isActive(item.path) ? "gradient-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}>
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-border">
          <button onClick={() => setCollapsed(!collapsed)} className="w-full text-xs text-muted-foreground hover:text-foreground py-2">
            {collapsed ? "»" : "طي «"}
          </button>
        </div>
      </aside>

      <div className="flex-1 overflow-auto flex flex-col">
        <header className="glass-strong border-b border-border px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
          <div className="relative w-56">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="بحث..." className="bg-secondary/60 border-border h-8 rounded-lg pr-9 text-sm" />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-1.5 relative hover:bg-secondary rounded-lg"><Bell className="w-4 h-4 text-muted-foreground" /></button>
            <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-info" />
            </div>
          </div>
        </header>
        <div className="flex-1 p-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default CallCenterLayout;
