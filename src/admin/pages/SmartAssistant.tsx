import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Bot, Send, Loader2, Globe, Paperclip, X, Image, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePlainText } from "@/lib/inputSecurity";
import { useI18n } from "@/i18n/context";

type AiMsg = { role: "user" | "assistant"; content: string | any[] };
type TaskLog = { id: string; title: string; status: "success" | "error" | "pending"; code?: string; timestamp: string; targetPage?: string };

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-agent`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

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
  const [iframeKey, setIframeKey] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);

  // File upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string>("");
  const [uploadedFileType, setUploadedFileType] = useState<"image" | "video" | "">("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (smartRefreshKey > 0) setIframeKey((k) => k + 1);
  }, [smartRefreshKey]);

  useEffect(() => {
    if (previewUrl) {
      // preview available
    }
  }, [previewUrl]);

  // When a file is uploaded, show it in Page 1
  useEffect(() => {
    return () => {
      if (uploadedFileUrl && uploadedFileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
    };
  }, [uploadedFileUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("يرجى رفع صورة أو فيديو فقط");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("حجم الملف كبير جداً (الحد الأقصى 20MB)");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadedFileUrl(objectUrl);
    setUploadedFileType(isImage ? "image" : "video");
    // Clear site URL so Page 1 shows the uploaded file
    setSiteUrl("");
    toast.success(`تم رفع ${isImage ? "الصورة" : "الفيديو"} بنجاح`);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearUploadedFile = () => {
    if (uploadedFileUrl && uploadedFileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(uploadedFileUrl);
    }
    setUploadedFile(null);
    setUploadedFileUrl("");
    setUploadedFileType("");
  };

  const sendMessage = async () => {
    const safeText = sanitizePlainText(input, 8000);
    if (!safeText || loading) return;

    if (!isActive) {
      toast.warning("⚠️ المساعد غير مفعّل — فعّل المساعد أولاً لتنفيذ الأوامر");
      return;
    }

    let userContent: string | any[];
    let displayContent = safeText;

    // If there's an uploaded image, include it as multimodal content
    if (uploadedFile && uploadedFileType === "image") {
      try {
        const base64 = await fileToBase64(uploadedFile);
        const siteContext = siteUrl ? `\n[السياق: الموقع المعروض: ${siteUrl}]` : "";
        const fileContext = `\n[ملف مرفق: ${uploadedFile.name} (${uploadedFileType})]`;

        userContent = [
          { type: "text", text: safeText + fileContext + siteContext },
          { type: "image_url", image_url: { url: base64, detail: "high" } },
        ];
        displayContent = `📎 ${uploadedFile.name}\n${safeText}`;
      } catch {
        toast.error("فشل في قراءة الملف");
        return;
      }
    } else {
      const currentSiteContext = siteUrl
        ? `\n\n[السياق: الموقع المعروض حالياً: ${siteUrl}]\nاستخدم أداة fetch_webpage لقراءة وتحليل محتوى هذا الموقع إذا طُلب منك ذلك.`
        : "";
      const fileContext = uploadedFile
        ? `\n[ملف مرفق: ${uploadedFile.name} (${uploadedFileType}) - فيديو لا يمكن تحليله مباشرة]`
        : "";
      const pageContext = previewUrl ? `\n[معاينة الصفحة: ${previewUrl}]` : "";
      userContent = safeText + fileContext + currentSiteContext + pageContext;
      if (uploadedFile) displayContent = `📎 ${uploadedFile.name}\n${safeText}`;
    }

    const userMsg: AiMsg = { role: "user", content: userContent };
    const displayMsg: AiMsg = { role: "user", content: displayContent };
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

  // Determine what to show in Page 1
  const showUploadedFileInPage1 = uploadedFileUrl && !siteUrl;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col gap-3" dir={dir}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 flex-1 min-h-0">
        {/* صفحة 2 - معاينة التغييرات */}
        <div className="gradient-card rounded-xl border border-border flex flex-col overflow-hidden order-2 lg:order-1">
          {previewUrl ? (
            <div className="flex-1 overflow-hidden bg-background relative">
              <iframe
                key={`preview-${previewUrl}-${iframeKey}`}
                src={previewUrl}
                style={{ width: `${100 / zoomLevel}%`, height: `${100 / zoomLevel}%`, transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
                className="bg-background absolute inset-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                title="معاينة التغييرات"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm bg-amber-800/40">
              <span className="text-amber-200/70">ستظهر هنا معاينة التغييرات المقترحة من المساعد الذكي</span>
            </div>
          )}
        </div>

        {/* صفحة 1 - عرض الموقع أو الملف المرفوع */}
        <div className="gradient-card rounded-xl border border-border flex flex-col overflow-hidden order-1 lg:order-2">
          {showUploadedFileInPage1 ? (
            <div className="flex-1 overflow-hidden bg-black relative flex items-center justify-center">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white h-7 w-7"
                onClick={clearUploadedFile}
              >
                <X className="w-4 h-4" />
              </Button>
              {uploadedFileType === "image" ? (
                <img
                  src={uploadedFileUrl}
                  alt="ملف مرفوع"
                  className="max-w-full max-h-full object-contain"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center" }}
                />
              ) : (
                <video
                  src={uploadedFileUrl}
                  controls
                  className="max-w-full max-h-full"
                  style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center" }}
                />
              )}
            </div>
          ) : siteUrl ? (
            <div className="flex-1 overflow-hidden bg-background relative">
              <iframe
                key={`site-${siteUrl}-${iframeKey}`}
                src={siteUrl}
                style={{ width: `${100 / zoomLevel}%`, height: `${100 / zoomLevel}%`, transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}
                className="bg-background absolute inset-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                title="عرض الموقع"
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm bg-gray-800">
              <span className="text-gray-400">اكتب رابط الموقع أو ارفع ملفاً من جدول المدير</span>
            </div>
          )}

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[220px] min-h-[180px]">
        {/* جدول المساعد الذكي */}
        <div className="rounded-xl border border-blue-300 flex flex-col bg-blue-100 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-blue-200 flex items-center gap-2 shrink-0">
            <Bot className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">المساعد الذكي</span>
          </div>
          <div ref={chatRef} className="flex-1 overflow-auto p-3 space-y-2">
            {messages.length === 0 && (
              <div className="text-center py-4">
                <Bot className="w-8 h-8 mx-auto text-primary/40 mb-1" />
                <p className="text-black/60 text-xs">مرحبًا! أنا المساعد الذكي للمدير</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${
                  msg.role === "user"
                    ? "bg-black text-red-500"
                    : "bg-gray-100 text-black"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none text-black [&_*]:text-black">
                      <ReactMarkdown>{typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}</ReactMarkdown>
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)}</span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-xs text-black/60">جاري المعالجة...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* جدول المدير */}
        <div className="rounded-xl border border-green-900 flex flex-col bg-green-950 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-green-800 flex items-center gap-2 shrink-0">
            <Send className="w-4 h-4 text-green-400" />
            <span className="text-xs font-semibold text-green-200">جدول المدير</span>
            {uploadedFile && (
              <Badge variant="outline" className="text-[10px] border-green-700 text-green-300 gap-1 mr-auto">
                {uploadedFileType === "image" ? <Image className="w-3 h-3" /> : <Film className="w-3 h-3" />}
                {uploadedFile.name.slice(0, 20)}
                <X className="w-3 h-3 cursor-pointer hover:text-red-400" onClick={clearUploadedFile} />
              </Badge>
            )}
          </div>
          <div className="flex-1 p-3 flex flex-col">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isActive ? "اكتب تعليماتك هنا للمساعد الذكي..." : "المساعد متوقف حالياً"}
              disabled={!isActive}
              className="flex-1 w-full resize-none rounded-lg border border-green-800 bg-green-900/50 p-3 text-sm text-green-100 placeholder:text-green-400/50 focus:outline-none focus:ring-2 focus:ring-green-500/30"
              dir="rtl"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-green-400/50">Shift+Enter لسطر جديد</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-green-700 bg-green-900/50 text-green-300 hover:bg-green-800 hover:text-green-100"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isActive}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  رفع ملف
                </Button>
                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading || !isActive}
                  size="sm"
                  className="gap-2 bg-green-700 hover:bg-green-600 text-green-100"
                >
                  <Send className="w-3.5 h-3.5" />
                  إرسال
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SmartAssistantPage;
