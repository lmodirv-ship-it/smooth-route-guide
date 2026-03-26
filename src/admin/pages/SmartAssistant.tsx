import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Bot, Send, Loader2, CheckCircle, Code, Power, XCircle, Globe, ExternalLink, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePlainText } from "@/lib/inputSecurity";
import { useI18n } from "@/i18n/context";

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
  const { t, dir } = useI18n();
  const { smartAssistantActive: isActive, smartPreviewUrl: previewUrl, smartSiteUrl: siteUrl, setSmartSiteUrl: setSiteUrl, setSmartPreviewUrl: setPreviewUrl } = useOutletContext<{
    smartAssistantActive: boolean;
    smartPreviewUrl: string;
    smartSiteUrl: string;
    setSmartSiteUrl: (v: string) => void;
    setSmartPreviewUrl: (v: string) => void;
  }>();
  const [messages, setMessages] = useState<AiMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [taskLogs, setTaskLogs] = useState<TaskLog[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskLog | null>(null);
  const [displayUrl, setDisplayUrl] = useState("");
  const [iframeError, setIframeError] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Auto-refresh preview every 5 seconds for live updates
  useEffect(() => {
    if (!previewUrl) return;
    const interval = setInterval(() => {
      setIframeKey(k => k + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [previewUrl]);



  const sendMessage = async () => {
    const safeText = sanitizePlainText(input, 8000);
    if (!safeText || loading) return;

    if (!isActive) {
      toast.warning("⚠️ المساعد غير مفعّل — فعّل المساعد أولاً لتنفيذ الأوامر");
      return;
    }

    // Include page context so AI knows which page to analyze
    const pageContext = previewUrl
      ? `\n\n[السياق: الصفحة المحملة حالياً هي: ${previewUrl}]\nقم بتحليل هذه الصفحة وتنفيذ التعليمات التالية عليها.`
      : "";
    const userMsg: AiMsg = { role: "user", content: safeText + pageContext };
    const displayMsg: AiMsg = { role: "user", content: safeText };
    setMessages(prev => [...prev, displayMsg]);
    setInput("");
    setLoading(true);

    const newTask: TaskLog = {
      id: crypto.randomUUID(),
      title: safeText.slice(0, 60) + (safeText.length > 60 ? "..." : ""),
      status: "pending",
      timestamp: new Date().toLocaleTimeString("ar-SA"),
      targetPage: previewUrl || undefined,
    };
    setTaskLogs(prev => [newTask, ...prev]);

    await callAdminAI({
      messages: [...messages, userMsg],
      onResult: (reply) => {
        setMessages(prev => [...prev, { role: "assistant", content: reply }]);
        setTaskLogs(prev => prev.map(t =>
          t.id === newTask.id ? { ...t, status: "success" as const, code: reply } : t
        ));
        setLoading(false);
        setIframeKey(k => k + 1); // refresh preview after success
        toast.success("✅ تم تنفيذ الأمر بنجاح");
      },
      onError: (err) => {
        setMessages(prev => [...prev, { role: "assistant", content: `❌ ${err}` }]);
        setTaskLogs(prev => prev.map(t =>
          t.id === newTask.id ? { ...t, status: "error" as const, code: err } : t
        ));
        setLoading(false);
        toast.error("❌ فشل تنفيذ الأمر");
      },
    });
  };

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-3" dir={dir}>


      {/* Main Content - Top Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0">
        {/* Right: Executed Tasks with Browser Preview */}
        <div className="gradient-card rounded-xl border border-border flex flex-col overflow-hidden order-2 lg:order-1">
          <div className="p-2.5 border-b border-border flex items-center justify-between">
            <Badge variant="outline" className="text-xs">{taskLogs.length}</Badge>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success" />
              ما تم تنفيذه
            </h3>
          </div>

          {/* Preview of the page - same as صفحة panel */}
          {previewUrl && (
            <div className="border-b border-border">
              <div className="bg-secondary/60 px-2 py-1 flex items-center gap-1.5 text-[10px]">
                <div className="flex gap-0.5">
                  <span className="w-2 h-2 rounded-full bg-destructive/60" />
                  <span className="w-2 h-2 rounded-full bg-warning/60" />
                  <span className="w-2 h-2 rounded-full bg-success/60" />
                </div>
                <span className="flex-1 text-muted-foreground truncate font-mono" dir="ltr">{previewUrl}</span>
              </div>
              <div className="w-full overflow-hidden bg-white" style={{ height: "200px" }}>
                <iframe
                  key={`mirror-${iframeKey}`}
                  src={previewUrl}
                  style={{ width: "1440px", height: "900px", transform: "scale(0.25)", transformOrigin: "top left" }}
                  className="bg-white pointer-events-none"
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="no-referrer"
                  title="معاينة ما تم تنفيذه"
                />
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 p-2.5">
            {taskLogs.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">لا توجد مهام بعد</div>
            )}
            {taskLogs.map(task => (
              <button
                key={task.id}
                onClick={() => {
                  setSelectedTask(task);
                  if (task.targetPage) {
                    setPreviewUrl(task.targetPage);
                    setSiteUrl(task.targetPage);
                    setIframeKey(k => k + 1);
                  }
                }}
                className={`w-full text-right p-3 rounded-lg mb-2 transition-colors border ${
                  selectedTask?.id === task.id
                    ? "bg-primary/10 border-primary/30"
                    : "bg-secondary/30 border-border/50 hover:bg-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">{task.timestamp}</span>
                  <div className="flex items-center gap-2">
                    {task.status === "success" && <CheckCircle className="w-3.5 h-3.5 text-success" />}
                    {task.status === "error" && <XCircle className="w-3.5 h-3.5 text-destructive" />}
                    {task.status === "pending" && <Loader2 className="w-3.5 h-3.5 text-warning animate-spin" />}
                  </div>
                </div>
                <p className="text-xs text-foreground truncate">{task.title}</p>
                {task.targetPage && (
                  <p className="text-[10px] text-muted-foreground truncate mt-1 font-mono" dir="ltr">
                    🌐 {task.targetPage}
                  </p>
                )}
              </button>
            ))}
          </ScrollArea>
        </div>

        {/* Left: Code Used + Site Preview */}
        <div className="gradient-card rounded-xl border border-border flex flex-col overflow-hidden order-1 lg:order-2 lg:col-span-2">
          <div className="p-2.5 border-b border-border flex items-center justify-end">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Code className="w-4 h-4 text-info" />
              صفحة
            </h3>
          </div>

          {/* Browser Preview inside Code panel */}
          {previewUrl && (
            <div className="border-b border-border">
              <div className="bg-secondary/60 px-3 py-1.5 flex items-center gap-2 text-xs">
                <div className="flex gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-warning/60" />
                  <span className="w-2.5 h-2.5 rounded-full bg-success/60" />
                </div>
                <span className="flex-1 text-muted-foreground truncate font-mono text-[11px]" dir="ltr">{displayUrl || previewUrl}</span>
                <a href={displayUrl || previewUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-[11px] flex items-center gap-1">
                  فتح <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="w-full overflow-auto bg-white" style={{ height: "calc(100% - 60px)", minHeight: "300px" }}>
                <iframe
                  ref={iframeRef}
                  key={`${previewUrl}-${iframeKey}`}
                  src={previewUrl}
                  style={{ width: "1440px", height: "900px", transform: "scale(0.65)", transformOrigin: "top left" }}
                  className="bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                  title="معاينة الموقع"
                  onError={() => setIframeError(true)}
                  onLoad={() => {
                    try {
                      const currentUrl = iframeRef.current?.contentWindow?.location?.href;
                      if (currentUrl && currentUrl !== "about:blank") {
                        setDisplayUrl(currentUrl);
                        setSiteUrl(currentUrl);
                      }
                    } catch {
                      // Cross-origin - can't read URL
                    }
                  }}
                />
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 p-3">
            {selectedTask ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className={
                    selectedTask.status === "success" ? "text-success border-success/30" :
                    selectedTask.status === "error" ? "text-destructive border-destructive/30" :
                    "text-warning border-warning/30"
                  }>
                    {selectedTask.status === "success" ? "تم بنجاح" : selectedTask.status === "error" ? "فشل" : "جاري..."}
                  </Badge>
                  <p className="text-xs font-medium text-foreground">{selectedTask.title}</p>
                </div>
                {selectedTask.targetPage && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground bg-secondary/40 rounded-md px-2 py-1">
                    <Globe className="w-3 h-3" />
                    <span className="font-mono" dir="ltr">{selectedTask.targetPage}</span>
                  </div>
                )}
                <div className="bg-secondary/50 rounded-lg p-3 text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed" dir="ltr">
                  <ReactMarkdown>{selectedTask.code || "لا يوجد كود"}</ReactMarkdown>
                </div>
              </div>
            ) : null}
          </ScrollArea>
        </div>
      </div>

      {/* Chat Area */}
      <div className="gradient-card rounded-xl border border-border flex flex-col h-[200px] min-h-[160px]">
        <div ref={chatRef} className="flex-1 overflow-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-6">
              <Bot className="w-10 h-10 mx-auto text-primary/40 mb-2" />
              <p className="text-muted-foreground text-sm">مرحبًا! أنا المساعد الذكي للمدير. كيف يمكنني مساعدتك؟</p>
              <p className="text-muted-foreground/60 text-xs mt-1">يمكنني إدارة العمولات، تحليل البيانات، وإرسال الإشعارات</p>
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
              onChange={e => setInput(e.target.value)}
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
