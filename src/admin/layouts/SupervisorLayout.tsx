import { useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Car, Send, Headphones, UtensilsCrossed,
  Bell, Search, BarChart3,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import logo from "@/assets/hn-driver-badge.png";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import { useI18n } from "@/i18n/context";

const SupervisorLayout = () => {
  const { t, dir } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const navItems = [
    { path: "/supervisor", icon: BarChart3, label: t.admin.dashboard },
    { path: "/supervisor/drivers", icon: Car, label: t.admin.drivers },
    { path: "/supervisor/delivery", icon: Send, label: t.admin.deliveryDrivers },
    { path: "/supervisor/call-center", icon: Headphones, label: t.admin.callCenterMenu },
    { path: "/supervisor/restaurants", icon: UtensilsCrossed, label: t.admin.restaurantsMenu },
  ];

  const isActive = (path: string) => {
    if (path === "/supervisor") return location.pathname === "/supervisor";
    return location.pathname.startsWith(path);
  };

  return (
    <>
    <GlobalNotificationListener />
    <div className="min-h-screen gradient-dark flex" dir={dir}>
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? "w-16" : "w-64"} glass-strong border-l border-border hidden lg:flex flex-col transition-all duration-300`}>
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <img src={logo} alt="HN" className="w-9 h-9 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="font-bold text-lg text-gradient-primary font-display">{t.admin.supervisorPanel}</span>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.admin.supervisorRole}</p>
              <p className="text-xs text-muted-foreground">{t.admin.operationsMonitoring}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "justify-start"} gap-3 px-3 py-2.5 rounded-lg transition-all ${
                isActive(item.path)
                  ? "gradient-primary text-primary-foreground shadow-lg"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-xs"
          >
            {sidebarCollapsed ? "»" : `${t.admin.collapseMenu} «`}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto flex flex-col">
        <header className="glass-strong border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder={t.admin.searchPlaceholder} className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
          </div>
          <div className="flex items-center gap-3">
            <GlobalLogoutButton />
            <LanguageSwitcher />
            <button className="p-2 relative hover:bg-secondary rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>
    </div>
    </>
  );
};

export default SupervisorLayout;
