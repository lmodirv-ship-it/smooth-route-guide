import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, FileText, Car, Users, TrendingUp, MapPin,
  AlertTriangle, FileCheck, Headphones, Settings, Shield,
  Search, Bell, Activity, Bot, Send, X, Loader2, UtensilsCrossed, UserCog, Percent,
  ShieldCheck, ShieldOff, Globe, RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import logo from "@/assets/hn-driver-badge.png";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePlainText } from "@/lib/inputSecurity";
import { useI18n } from "@/i18n/context";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GlobalLogoutButton from "@/components/GlobalLogoutButton";

type AiMsg = { role: "user" | "assistant"; content: string };

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-agent`;

async function callAdminAI({ messages, onResult, onError }: {
  messages: AiMsg[]; onResult: (text: string) => void; onError: (e: string) => void;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const accessToken = session?.access_token || null;
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Error" }));
    onError(err.error || "Service error");
    return;
  }
  const data = await resp.json();
  onResult(data.reply || "Could not process the request");
}

const AdminLayout = () => {
  const { t, dir } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarNavVisible, setSidebarNavVisible] = useState(true);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [smartAssistantActive, setSmartAssistantActive] = useState(true);
  const [smartSiteUrl, setSmartSiteUrl] = useState("");
  const [smartPreviewUrl, setSmartPreviewUrl] = useState("");
  const [smartRefreshKey, setSmartRefreshKey] = useState(0);

  const isSmartAssistantRoute = location.pathname === "/admin/smart-assistant";

  const navItems = [
    { path: "/admin", icon: BarChart3, label: t.admin.dashboard },
    { path: "/admin/users", icon: UserCog, label: t.admin.registeredUsers },
    { path: "/admin/requests", icon: FileText, label: t.admin.rideRequests },
    { path: "/admin/drivers", icon: Car, label: t.admin.drivers },
    { path: "/admin/clients", icon: Users, label: t.admin.clients },
    { path: "/admin/earnings", icon: TrendingUp, label: t.admin.earningsMenu },
    { path: "/admin/map", icon: MapPin, label: t.admin.liveMap },
    { path: "/admin/alerts", icon: AlertTriangle, label: t.admin.alerts },
    { path: "/admin/documents", icon: FileCheck, label: t.admin.documentsMenu },
    { path: "/admin/delivery", icon: Send, label: t.admin.deliveryMenu },
    { path: "/admin/call-center", icon: Headphones, label: t.admin.callCenterMenu },
    { path: "/admin/restaurants", icon: UtensilsCrossed, label: t.admin.restaurantsMenu },
    { path: "/admin/zones", icon: MapPin, label: t.admin.zonesPricing },
    { path: "/admin/commission-rates", icon: Percent, label: "نسب الأرباح" },
    { path: "/admin/smart-assistant", icon: Bot, label: "المساعد الذكي" },
    { path: "/admin/settings", icon: Settings, label: t.admin.settingsMenu },
  ];

  useEffect(() => {
    aiScrollRef.current?.scrollTo({ top: aiScrollRef.current.scrollHeight, behavior: "smooth" });
  }, [aiMessages]);

  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase.from("ride_requests").select("id", { count: "exact", head: true }).eq("status", "pending");
      setPendingCount(count || 0);
    };
    fetchCount();
    const ch = supabase.channel("admin-nav-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, fetchCount)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const sendAiMessage = async (text: string) => {
    const safeText = sanitizePlainText(text, 8000);
    if (!safeText || aiLoading) return;
    const userMsg: AiMsg = { role: "user", content: safeText };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);
    await callAdminAI({
      messages: [...aiMessages, userMsg],
      onResult: (reply) => {
        setAiMessages(prev => [...prev, { role: "assistant", content: reply }]);
        setAiLoading(false);
      },
      onError: (err) => {
        setAiMessages(p => [...p, { role: "assistant", content: `❌ ${err}` }]);
        setAiLoading(false);
      },
    });
  };

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen gradient-dark flex" dir={dir}>
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? "w-16" : "w-64"} glass-strong border-l border-border hidden lg:flex flex-col transition-all duration-300`}>
        <button
          onClick={() => setSidebarNavVisible(v => !v)}
          className="p-4 flex items-center gap-3 border-b border-border w-full hover:bg-secondary/50 transition-colors cursor-pointer"
        >
          <img src={logo} alt="HN" className="w-9 h-9 flex-shrink-0" />
          {!sidebarCollapsed && (
            <>
              <span className="font-bold text-lg text-gradient-primary font-display">{t.admin.panelTitle}</span>
              <span className={`text-muted-foreground text-xs transition-transform ${sidebarNavVisible ? "rotate-180" : ""}`}>▼</span>
            </>
          )}
        </button>
        <AnimatePresence initial={false}>
        {sidebarNavVisible && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{t.admin.administrator}</p>
              <p className="text-xs text-muted-foreground">{t.admin.systemAdmin}</p>
            </div>
          </div>
        )}
        <nav className="flex-1 p-3 space-y-1 overflow-auto">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center ${sidebarCollapsed ? "justify-center" : "justify-between"} px-3 py-2.5 rounded-lg transition-all ${
                isActive(item.path) ? "gradient-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
              title={sidebarCollapsed ? item.label : undefined}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!sidebarCollapsed && <span className="text-sm">{item.label}</span>}
              </div>
              {!sidebarCollapsed && item.path === "/admin/requests" && pendingCount > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${isActive(item.path) ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/20 text-primary"}`}>
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
          </motion.div>
        )}
        </AnimatePresence>
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
        {/* Top Bar */}
        <header className="glass-strong border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            {isSmartAssistantRoute ? (
              <>
                <Button size="sm" className="gap-1.5 shrink-0 h-9" onClick={() => {
                  const raw = smartSiteUrl.trim();
                  if (!raw) return;
                  let url = raw.replace(/^wwww\./i, "www.");
                  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                  try {
                    const normalized = new URL(url).toString();
                    setSmartPreviewUrl(normalized);
                    setSmartSiteUrl(normalized);
                  } catch {}
                }}>
                  <Globe className="w-4 h-4" />
                  عرض
                </Button>
                <div className="relative w-80">
                  <Globe className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={smartSiteUrl}
                    onChange={e => setSmartSiteUrl(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter") {
                        const raw = smartSiteUrl.trim();
                        if (!raw) return;
                        let url = raw.replace(/^wwww\./i, "www.");
                        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
                        try {
                          const normalized = new URL(url).toString();
                          setSmartPreviewUrl(normalized);
                          setSmartSiteUrl(normalized);
                        } catch {}
                      }
                    }}
                    placeholder="أدخل رابط الموقع..."
                    className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm font-mono"
                    dir="ltr"
                  />
                </div>
              </>
            ) : (
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder={t.admin.searchPlaceholder} className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {isSmartAssistantRoute && (
              <>
                <span className="text-sm font-bold text-foreground">المساعد الذكي</span>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => setSmartAssistantActive(true)}
                  className="gap-1.5 h-8 bg-success hover:bg-success/90 text-white"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  قبول
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setSmartAssistantActive(false)}
                  className="gap-1.5 h-8"
                >
                  <ShieldOff className="w-3.5 h-3.5" />
                  رفض
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSmartRefreshKey(k => k + 1)}
                  className="gap-1.5 h-8"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualiser
                </Button>
                <Badge variant="outline" className={`text-xs ${smartAssistantActive ? "text-success border-success/30 bg-success/10" : "text-destructive border-destructive/30 bg-destructive/10"}`}>
                  <span className={`inline-block w-2 h-2 rounded-full mr-1 ${smartAssistantActive ? "bg-success animate-pulse" : "bg-destructive"}`} />
                  {smartAssistantActive ? "نشط" : "متوقف"}
                </Badge>
                <div className="w-px h-6 bg-border" />
              </>
            )}
            <GlobalLogoutButton />
            <LanguageSwitcher />
            <button className="p-2 relative hover:bg-secondary rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {pendingCount > 0 && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />}
            </button>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors"><Activity className="w-5 h-5 text-muted-foreground" /></button>
            <button onClick={() => setAiOpen(true)} className="p-2 hover:bg-secondary rounded-lg transition-colors" title={t.admin.aiAgent}>
              <Bot className="w-5 h-5 text-primary" />
            </button>
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Outlet context={{ smartAssistantActive, setSmartAssistantActive, smartPreviewUrl, smartSiteUrl, setSmartSiteUrl, setSmartPreviewUrl, smartRefreshKey }} />
        </div>
      </div>

      {/* AI Agent Panel */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
            className="fixed left-4 bottom-4 top-16 w-96 z-50 glass-strong rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl"
            dir={dir}
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <button onClick={() => setAiOpen(false)} className="p-1 hover:bg-secondary rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">🤖 {t.admin.aiAgent}</span>
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center"><Bot className="w-4 h-4 text-primary-foreground" /></div>
              </div>
            </div>
            <div ref={aiScrollRef} className="flex-1 overflow-auto p-3 space-y-3">
              {aiMessages.length === 0 && (
                <div className="text-center pt-8 space-y-3">
                  <Bot className="w-12 h-12 text-primary mx-auto" />
                  <p className="text-sm text-foreground font-semibold">{t.admin.aiAgentDesc}</p>
                   <p className="text-xs text-muted-foreground">{t.admin.aiFullAccess}</p>
                </div>
              )}
              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary/20" : "bg-info/20"}`}>
                    {msg.role === "user" ? <Shield className="w-3.5 h-3.5 text-primary" /> : <Bot className="w-3.5 h-3.5 text-info" />}
                  </div>
                  <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    <div className="prose prose-sm prose-invert max-w-none text-inherit"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  </div>
                </div>
              ))}
              {aiLoading && aiMessages[aiMessages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-info/20 flex items-center justify-center"><Bot className="w-3.5 h-3.5 text-info" /></div>
                  <div className="bg-secondary rounded-xl px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
                </div>
              )}
            </div>
            <form onSubmit={e => { e.preventDefault(); sendAiMessage(aiInput); }} className="p-3 border-t border-border flex gap-2">
              <Input value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder={t.admin.searchPlaceholder} className="flex-1 bg-secondary/80 border-border rounded-xl text-sm text-right" disabled={aiLoading} />
              <Button type="submit" size="icon" disabled={!aiInput.trim() || aiLoading} className="gradient-primary rounded-xl"><Send className="w-4 h-4" /></Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {!aiOpen && (
        <motion.button
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          onClick={() => setAiOpen(true)}
          className="fixed left-6 bottom-6 z-50 w-14 h-14 rounded-full gradient-primary glow-primary flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
        >
          <Bot className="w-6 h-6 text-primary-foreground" />
        </motion.button>
      )}
    </div>
  );
};

export default AdminLayout;
