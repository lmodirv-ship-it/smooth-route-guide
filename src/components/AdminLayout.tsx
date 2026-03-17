import { useState, useRef, useEffect } from "react";
import { useLocation, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3, FileText, Car, Users, TrendingUp, MapPin,
  AlertTriangle, FileCheck, Headphones, Settings, Shield,
  Search, Bell, Activity, Bot, Send, X, Loader2, UtensilsCrossed, UserCog
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import logo from "@/assets/hn-driver-logo.png";
import { supabase } from "@/lib/firestoreClient";

type AiMsg = { role: "user" | "assistant"; content: string };

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-agent`;

async function streamAdminAI({ messages, onDelta, onDone, onError }: {
  messages: AiMsg[]; onDelta: (t: string) => void; onDone: () => void; onError: (e: string) => void;
}) {
  const resp = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify({ messages }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "خطأ" }));
    onError(err.error || "خطأ في الخدمة");
    return;
  }
  if (!resp.body) { onError("لا توجد استجابة"); return; }
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { buffer = line + "\n" + buffer; break; }
    }
  }
  onDone();
}

const navItems = [
  { path: "/admin", icon: BarChart3, label: "Dashboard" },
  { path: "/admin/users", icon: UserCog, label: "Registered Users" },
  { path: "/admin/requests", icon: FileText, label: "Ride Requests" },
  { path: "/admin/drivers", icon: Car, label: "Drivers" },
  { path: "/admin/clients", icon: Users, label: "Clients" },
  { path: "/admin/earnings", icon: TrendingUp, label: "Earnings" },
  { path: "/admin/map", icon: MapPin, label: "Live Map" },
  { path: "/admin/alerts", icon: AlertTriangle, label: "Alerts" },
  { path: "/admin/documents", icon: FileCheck, label: "Documents" },
  { path: "/admin/delivery", icon: Send, label: "Delivery" },
  { path: "/admin/call-center", icon: Headphones, label: "Call Center" },
  { path: "/admin/restaurants", icon: UtensilsCrossed, label: "Restaurants" },
  { path: "/admin/settings", icon: Settings, label: "Settings" },
];

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [aiOpen, setAiOpen] = useState(false);
  const [aiMessages, setAiMessages] = useState<AiMsg[]>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);
  const [pendingCount, setPendingCount] = useState(0);

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
    if (!text.trim() || aiLoading) return;
    const userMsg: AiMsg = { role: "user", content: text.trim() };
    setAiMessages(prev => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);
    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setAiMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };
    await streamAdminAI({
      messages: [...aiMessages, userMsg],
      onDelta: upsert,
      onDone: () => setAiLoading(false),
      onError: (err) => { setAiMessages(p => [...p, { role: "assistant", content: `❌ ${err}` }]); setAiLoading(false); },
    });
  };

  const isActive = (path: string) => {
    if (path === "/admin") return location.pathname === "/admin";
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen gradient-dark flex" dir="rtl">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? "w-16" : "w-64"} glass-strong border-l border-border hidden lg:flex flex-col transition-all duration-300`}>
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <img src={logo} alt="HN" className="w-9 h-9 flex-shrink-0" />
          {!sidebarCollapsed && <span className="font-bold text-lg text-gradient-primary font-display">Admin Panel</span>}
        </div>
        {!sidebarCollapsed && (
          <div className="p-4 border-b border-border flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Administrator</p>
              <p className="text-xs text-muted-foreground">مسؤول النظام</p>
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
        <div className="p-3 border-t border-border">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-xs"
          >
            {sidebarCollapsed ? "»" : "طي القائمة «"}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Top Bar */}
        <header className="glass-strong border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="بحث..." className="bg-secondary/60 border-border h-9 rounded-lg pr-9 text-sm" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2 relative hover:bg-secondary rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground" />
              {pendingCount > 0 && <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive animate-pulse" />}
            </button>
            <button className="p-2 hover:bg-secondary rounded-lg transition-colors"><Activity className="w-5 h-5 text-muted-foreground" /></button>
            <button onClick={() => setAiOpen(true)} className="p-2 hover:bg-secondary rounded-lg transition-colors" title="AI Agent">
              <Bot className="w-5 h-5 text-primary" />
            </button>
            <div className="w-9 h-9 rounded-full gradient-primary flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary-foreground" />
            </div>
          </div>
        </header>

        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>

      {/* AI Agent Panel */}
      <AnimatePresence>
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 300 }}
            className="fixed left-4 bottom-4 top-16 w-96 z-50 glass-strong rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl"
            dir="rtl"
          >
            <div className="p-4 border-b border-border flex items-center justify-between">
              <button onClick={() => setAiOpen(false)} className="p-1 hover:bg-secondary rounded-lg"><X className="w-4 h-4 text-muted-foreground" /></button>
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground text-sm">🤖 AI Agent</span>
                <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center"><Bot className="w-4 h-4 text-primary-foreground" /></div>
              </div>
            </div>
            <div ref={aiScrollRef} className="flex-1 overflow-auto p-3 space-y-3">
              {aiMessages.length === 0 && (
                <div className="text-center pt-8 space-y-3">
                  <Bot className="w-12 h-12 text-primary mx-auto" />
                  <p className="text-sm text-foreground font-semibold">مساعد الأدمن الذكي</p>
                  <p className="text-xs text-muted-foreground">أحلل البيانات وأقترح أفضل القرارات</p>
                  <div className="space-y-2 pt-2">
                    {["ما حالة النظام الآن؟", "اقترح أفضل سائق للطلبات", "ما المشاكل الحالية؟"].map((q, i) => (
                      <button key={i} onClick={() => sendAiMessage(q)} className="w-full text-right text-xs p-2 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground transition-colors">{q}</button>
                    ))}
                  </div>
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
              <Input value={aiInput} onChange={e => setAiInput(e.target.value)} placeholder="اسأل المساعد..." className="flex-1 bg-secondary/80 border-border rounded-xl text-sm text-right" disabled={aiLoading} />
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
