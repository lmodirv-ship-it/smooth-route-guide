import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  BarChart3, Phone, Car, Users, Search, AlertTriangle, FileText,
  Headphones, BarChart, Shield, Bell, PhoneCall, PlusCircle, Clock,
  Menu, X, UtensilsCrossed, Download, MapPin, Map, Brain, MessageSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import VisitorCounter from "@/components/VisitorCounter";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";
import GlobalNotificationListener from "@/components/GlobalNotificationListener";
import FloatingChatButton from "@/components/FloatingChatButton";
import FloatingCommunityButton from "@/components/FloatingCommunityButton";
import logo from "@/assets/hn-driver-badge.png";
import SidebarNavButton from "@/admin/components/SidebarNavButton";
import GlobalContactFooter from "@/components/GlobalContactFooter";
import AgentFacePresence from "@/call-center/components/AgentFacePresence";
import CallCenterModal from "@/components/calls/CallCenterModal";
import { useCallCenter } from "@/hooks/useCallCenter";

// Context to share call center engine across pages
const CallCenterContext = createContext<ReturnType<typeof useCallCenter> | null>(null);
export const useCallCenterCtx = () => useContext(CallCenterContext);

const CallCenterLayout = () => {
  const { t, dir } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSmartAssistant, setIsSmartAssistant] = useState(false);

  const baseNavItems = [
    { path: "/call-center", icon: BarChart3, label: t.callCenter.dashboard },
    { path: "/call-center/delivery", icon: PlusCircle, label: t.callCenter.deliveryOrders },
    { path: "/call-center/drivers", icon: Car, label: t.callCenter.driversMenu },
    { path: "/call-center/incoming", icon: PhoneCall, label: t.callCenter.incomingCalls },
    { path: "/call-center/manual-booking", icon: PlusCircle, label: t.callCenter.manualBooking },
    { path: "/call-center/ride-assign", icon: Car, label: t.callCenter.rideAssign },
    { path: "/call-center/customers", icon: Users, label: t.callCenter.customers },
    { path: "/call-center/complaints", icon: AlertTriangle, label: t.callCenter.complaints },
    { path: "/call-center/tickets", icon: FileText, label: t.callCenter.tickets },
    { path: "/call-center/emergency", icon: AlertTriangle, label: t.callCenter.emergency },
    { path: "/call-center/restaurants", icon: UtensilsCrossed, label: t.callCenter.restaurantsMenu },
    { path: "/call-center/history", icon: Clock, label: t.callCenter.callHistory },
    { path: "/call-center/reports", icon: BarChart, label: t.callCenter.reports },
    { path: "/call-center/messaging", icon: MessageSquare, label: "المحادثات" },
    { path: "/call-center/community", icon: Users, label: "مجتمع HN" },
    { path: "/call-center/analytics", icon: BarChart, label: "تحليلات الزوار" },
  ];

  const adminOnlyNavItems = [
    { path: "/call-center/auto-import", icon: Download, label: t.callCenter.autoImport },
    { path: "/call-center/google-import", icon: MapPin, label: t.callCenter.googleImport },
  ];

  const operationalNavItems = [
    { path: "/call-center/map", icon: Map, label: t.callCenter.liveMap },
    { path: "/call-center/alerts", icon: Bell, label: t.callCenter.alertsPage },
    { path: "/call-center/knowledge", icon: Brain, label: t.callCenter.knowledge },
  ];

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("user_roles").select("role").eq("user_id", data.user.id).then(({ data: roles }) => {
        const userRoles = (roles || []).map(r => r.role);
        setIsAdmin(userRoles.includes("admin"));
        setIsSmartAssistant(userRoles.includes("smart_admin_assistant"));
      });
    });
  }, []);

  const navItems = [
    ...baseNavItems,
    ...((isAdmin || isSmartAssistant) ? operationalNavItems : []),
    ...(isAdmin ? adminOnlyNavItems : []),
  ];

  const isActive = (path: string) =>
    path === "/call-center" ? location.pathname === "/call-center" : location.pathname.startsWith(path);

  const SidebarContent = () => (
    <>
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <img src={logo} alt="HN" className="w-8 h-8 flex-shrink-0" />
        {!collapsed && (
          <span className="font-bold text-gradient-primary font-display text-sm">{t.callCenter.title}</span>
        )}
      </div>
      {!collapsed && (
        <div className="p-3 border-b border-border flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-info/20 flex items-center justify-center">
            <Headphones className="w-4 h-4 text-info" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{t.callCenter.agentInfo}</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <p className="text-[10px] text-success">{t.common.connected}</p>
            </div>
          </div>
        </div>
      )}
      <nav className="flex-1 p-2 space-y-1 overflow-auto">
        {navItems.map((item) => (
          <SidebarNavButton
            key={item.path}
            icon={item.icon}
            label={item.label}
            isActive={isActive(item.path)}
            collapsed={collapsed}
            onClick={() => { navigate(item.path); setMobileOpen(false); }}
          />
        ))}
      </nav>
      <div className="p-2 border-t border-border">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full text-xs text-muted-foreground hover:text-foreground py-2 rounded-lg hover:bg-secondary transition-colors"
        >
          {collapsed ? "»" : `${t.admin.collapseMenu} «`}
        </button>
      </div>
    </>
  );

  const callCenter = useCallCenter();

  // Agent status indicator
  const agentStatusColor = callCenter.agentStatus === "available" ? "bg-success" :
    callCenter.agentStatus === "in_call" ? "bg-primary animate-pulse" :
    callCenter.agentStatus === "busy" ? "bg-warning" :
    callCenter.agentStatus === "break" ? "bg-info" : "bg-muted-foreground";

  return (
    <CallCenterContext.Provider value={callCenter}>
    <>
    <GlobalNotificationListener />
    <div className="min-h-screen gradient-dark flex" dir={dir}>
      {/* Desktop Sidebar */}
      <aside
        className={`${collapsed ? "w-16" : "w-64"} glass-strong border-l border-border hidden lg:flex flex-col transition-all duration-300`}
      >
        <SidebarContent />
        {/* Agent Status Switcher */}
        {!collapsed && (
          <div className="p-2 border-t border-border">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <div className={`w-2 h-2 rounded-full ${agentStatusColor}`} />
              <select
                value={callCenter.agentStatus}
                onChange={e => callCenter.updateAgentStatus(e.target.value as any)}
                className="text-[10px] bg-transparent text-muted-foreground border-0 outline-none flex-1 cursor-pointer"
              >
                <option value="available">متاح</option>
                <option value="busy">مشغول</option>
                <option value="break">استراحة</option>
                <option value="offline">غير متصل</option>
              </select>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[100] lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-64 glass-strong border-l border-border flex flex-col z-10">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 overflow-auto flex flex-col">
        <header className="glass-strong border-b border-border px-4 py-2.5 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 hover:bg-secondary rounded-lg">
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="relative w-56">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t.callCenter.quickSearch}
                className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <GlobalLogoutButton />
            <VisitorCounter />
            <LanguageSwitcher />
            <div className="hidden md:flex items-center gap-1.5 bg-success/10 text-success px-3 py-1 rounded-full text-xs">
              <div className={`w-1.5 h-1.5 rounded-full ${agentStatusColor}`} />
              {callCenter.agentStatus === "available" ? t.common.connected :
               callCenter.agentStatus === "in_call" ? "في مكالمة" :
               callCenter.agentStatus === "busy" ? "مشغول" :
               callCenter.agentStatus === "break" ? "استراحة" : "غير متصل"}
            </div>
            <button className="p-2 relative hover:bg-secondary rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />
            </button>
            <div className="w-9 h-9 rounded-full bg-info/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-info" />
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6">
          <Outlet />
        </div>
      </div>
    </div>

    {/* Global Call Modal */}
    <CallCenterModal
      activeCall={callCenter.activeCall}
      isMuted={callCenter.isMuted}
      remoteStream={callCenter.remoteStream}
      onEndCall={callCenter.endCall}
      onToggleMute={callCenter.toggleMute}
      onAddNote={callCenter.addCallNote}
    />

    <AgentFacePresence />
    <FloatingChatButton />
    <FloatingCommunityButton communityPath="/call-center/community" />
    <GlobalContactFooter />
    </>
    </CallCenterContext.Provider>
  );
};

export default CallCenterLayout;
