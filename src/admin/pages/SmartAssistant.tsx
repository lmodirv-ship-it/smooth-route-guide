import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Bot, Send, Loader2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePlainText } from "@/lib/inputSecurity";
import { useI18n } from "@/i18n/context";
import { SocialMediaPreview } from "@/admin/components/SocialMediaPreview";

type AiMsg = { role: "user" | "assistant"; content: string };
type TaskLog = { id: string; title: string; status: "success" | "error" | "pending"; code?: string; timestamp: string; targetPage?: string };

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
  if (!resp.ok) { onError(`خطأ ${resp.status}`); return; }
  const data = await resp.json();
  onResult(data?.reply || data?.message || "لا يوجد رد");
}

const SmartAssistantPage = () => {
  const { dir } = useI18n();
  const {
    smartAssistantActive: isActive,
    smartPreviewUrl: previewUrl,
    smartSiteUrl: siteUrl,
    setSmartSiteUrl: setSiteUrl,
    setSmartPreviewUrl: setPreviewUrl,
    smartRefreshKey,
  } = useOutletContext<{
    smartAssistantActive: boolean;
    smartPreviewUrl: string;
    smartSiteUrl: string;
    setSmartSiteUrl: (v: string) => void;
    setSmartPreviewUrl: (v: string) => void;
    smartRefreshKey: number;
  }>();

  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [displayUrl, setDisplayUrl] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(0.48);
  const [pageOneTab, setPageOneTab] = useState<string>("sites");
  const [activeSiteIndex, setActiveSiteIndex] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (smartRefreshKey > 0) {
      setIframeKey((k) => k + 1);
    }
  }, [smartRefreshKey]);

  useEffect(() => {
    if (previewUrl) {
      setPageOneTab("preview");
    }
  }, [previewUrl]);

  const websiteList = [
    { name: "Facebook", url: "https://www.facebook.com", icon: "📘", color: "bg-blue-600" },
    { name: "Instagram", url: "https://www.instagram.com", icon: "📸", color: "bg-pink-500" },
    { name: "TikTok", url: "https://www.tiktok.com", icon: "🎵", color: "bg-foreground" },
    { name: "YouTube", url: "https://www.youtube.com", icon: "▶️", color: "bg-red-600" },
    { name: "X", url: "https://x.com", icon: "𝕏", color: "bg-foreground" },
    { name: "LinkedIn", url: "https://www.linkedin.com", icon: "💼", color: "bg-blue-700" },
    { name: "WhatsApp", url: "https://web.whatsapp.com", icon: "💬", color: "bg-green-600" },
    { name: "Google", url: "https://www.google.com", icon: "🔎", color: "bg-yellow-500" },
    { name: "Snapchat", url: "https://www.snapchat.com", icon: "👻", color: "bg-yellow-400" },
    { name: "Pinterest", url: "https://www.pinterest.com", icon: "📌", color: "bg-red-700" },
    { name: "Telegram", url: "https://web.telegram.org", icon: "✈️", color: "bg-blue-500" },
    { name: "Reddit", url: "https://www.reddit.com", icon: "🟠", color: "bg-orange-600" },
  ];


  const sendMessage = async () => {
    const safeText = sanitizePlainText(input, 8000);
    if (!safeText || loading) return;

    if (!isActive) {
      toast.warning("⚠️ المساعد غير مفعّل — فعّل المساعد أولاً لتنفيذ الأوامر");
      return;
    }

    const pageContext = previewUrl
      ? `\n\n[السياق: الصفحة المحملة حالياً هي: ${previewUrl}]\nقم بتحليل هذه الصفحة وتنفيذ التعليمات التالية عليها.`
      : "";
    const userMsg: AiMsg = { role: "user", content: safeText + pageContext };
    const displayMsg: AiMsg = { role: "user", content: safeText };
    setMessages((prev) => [...prev, displayMsg]);
    setInput("");
    setLoading(true);

    const newTask: TaskLog = {
      id: crypto.randomUUID(),
      title: safeText.slice(0, 60) + (safeText.length > 60 ? "..." : ""),
      status: "pending",
      timestamp: new Date().toLocaleTimeString("ar-SA"),
      targetPage: previewUrl || undefined,
    };
    setTaskLogs((prev) => [newTask, ...prev]);

    await callAdminAI({
      messages: [...messages, userMsg],
      onResult: (reply) => {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setTaskLogs((prev) => prev.map((t) =>
          t.id === newTask.id ? { ...t, status: "success" as const, code: reply } : t,
        ));
        setLoading(false);
        setIframeKey((k) => k + 1);
        toast.success("✅ تم تنفيذ الأمر بنجاح");
      },
      onError: (err) => {
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${err}` }]);
        setTaskLogs((prev) => prev.map((t) =>
          t.id === newTask.id ? { ...t, status: "error" as const, code: err } : t,
        ));
        setLoading(false);
        toast.error("❌ فشل تنفيذ الأمر");
      },
    });
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-3" dir={dir}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        <div className="gradient-card rounded-xl border border-border flex flex-col overflow-hidden order-2 lg:order-1">
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          </div>
        </div>

        <div className="gradient-card rounded-xl border border-border flex flex-col overflow-hidden order-1 lg:order-2">
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
          </div>

          <div className="bg-secondary/60 px-3 py-1.5 flex items-center justify-center gap-2 border-t border-border shrink-0">
            <Button variant="outline" size="icon" className="h-7 w-7 text-lg font-bold" onClick={() => setZoomLevel((z) => Math.max(0.01, z - 0.1))}>
              −
            </Button>
            <Input
              type="number"
              min={1}
              max={100000}
              value={Math.round(zoomLevel * 100)}
              onChange={(e) => {
                const v = parseInt(e.target.value);
                if (!isNaN(v) && v >= 1 && v <= 100000) setZoomLevel(v / 100);
              }}
              className="w-20 h-7 text-center text-xs bg-background border-border [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              dir="ltr"
            />
            <Button variant="outline" size="icon" className="h-7 w-7 text-lg font-bold" onClick={() => setZoomLevel((z) => z + 0.1)}>
              +
            </Button>
          </div>
        </div>
      </div>

      <div className="gradient-card rounded-xl border border-border flex flex-col h-[200px] min-h-[160px]">
        <div ref={chatRef} className="flex-1 overflow-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <Bot className="w-10 h-10 mx-auto text-primary/40 mb-2" />
              <p className="text-muted-foreground text-sm">مرحبًا! أنا المساعد الذكي للمدير. كيف يمكنني مساعدتك؟</p>
              <p className="text-muted-foreground/60 text-xs mt-1">يمكنني تعديل الصفحات، إنشاء المحتوى، وإعداد الحملات</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "gradient-primary text-primary-foreground"
                  : "bg-secondary/60 text-foreground"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-sm prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-secondary/60 rounded-xl px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">جاري المعالجة...</span>
              </div>
            </div>
          )}
        </div>
        <div className="p-3 border-t border-border">
          <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
            <Button type="submit" disabled={!input.trim() || loading || !isActive} size="sm" className="gap-2">
              <Send className="w-4 h-4" />
              إرسال
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isActive ? "اكتب طلبك هنا..." : "المساعد متوقف حالياً"}
              disabled={!isActive}
              className="flex-1 text-right bg-secondary/40 border-border"
              dir="rtl"
            />
          </form>
        </div>
      </div>
    </div>
  );
};

export default SmartAssistantPage;
