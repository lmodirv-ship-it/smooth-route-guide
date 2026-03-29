import { useState } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Car, Send, Headphones, UtensilsCrossed,
  Bell, Search, BarChart3, Menu, X, MessageSquare, Globe,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import logo from "@/assets/hn-driver-badge.png";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import FloatingChatButton from "@/components/FloatingChatButton";
import { useI18n } from "@/i18n/context";
import SidebarNavButton from "@/admin/components/SidebarNavButton";
import GlobalContactFooter from "@/components/GlobalContactFooter";

const SupervisorLayout = () => {
  const { t, dir } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { path: "/supervisor", icon: BarChart3, label: t.admin.dashboard },
    { path: "/supervisor/drivers", icon: Car, label: t.admin.drivers },
    { path: "/supervisor/delivery", icon: Send, label: t.admin.deliveryDrivers },
    { path: "/supervisor/call-center", icon: Headphones, label: t.admin.callCenterMenu },
    { path: "/supervisor/restaurants", icon: UtensilsCrossed, label: t.admin.restaurantsMenu },
    { path: "/supervisor/city-activation", icon: Globe, label: "تنشيط المدن" },
    { path: "/supervisor/messaging", icon: MessageSquare, label: "المحادثات" },
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
            <SidebarNavButton
              key={item.path}
              icon={item.icon}
              label={item.label}
              isActive={isActive(item.path)}
              collapsed={sidebarCollapsed}
              onClick={() => navigate(item.path)}
            />
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

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-64 glass-strong border-l border-border flex flex-col z-10 overflow-auto">
            <div className="p-4 flex items-center justify-between border-b border-border">
              <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-secondary rounded-lg">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <div className="flex items-center gap-2">
                <img src={logo} alt="HN" className="w-8 h-8" />
                <span className="font-bold text-gradient-primary font-display text-sm">{t.admin.supervisorPanel}</span>
              </div>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-auto">
              {navItems.map((item) => (
                <SidebarNavButton
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  isActive={isActive(item.path)}
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                />
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 overflow-auto flex flex-col">
        <header className="glass-strong border-b border-border px-3 md:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 hover:bg-secondary rounded-lg">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="relative w-40 md:w-64 hidden sm:block">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder={t.admin.searchPlaceholder} className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 md:gap-3">
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

        <div className="flex-1 p-3 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
    <FloatingChatButton />
    <GlobalContactFooter />
    </>
  );
};

export default SupervisorLayout;
