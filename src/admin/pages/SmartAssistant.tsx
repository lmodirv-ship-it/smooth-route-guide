import { useState, useRef, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Bot, Send, Loader2, Paperclip, X, Image, Film, Download, History, FolderOpen, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { sanitizePlainText } from "@/lib/inputSecurity";
import { useI18n } from "@/i18n/context";

type AiMsg = { role: "user" | "assistant"; content: string | any[] };

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ai-agent`;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadFileToStorage(file: File): Promise<string | null> {
  const ext = file.name.split(".").pop() || "bin";
  const path = `uploads/${Date.now()}_${crypto.randomUUID().slice(0, 8)}.${ext}`;
  const { error } = await supabase.storage.from("smart-assistant-files").upload(path, file);
  if (error) { console.error("Upload error:", error); return null; }
  const { data } = supabase.storage.from("smart-assistant-files").getPublicUrl(path);
  return data.publicUrl;
}

async function saveCommand(params: {
  adminId: string;
  commandText: string;
  targetPage?: string;
  attachedFileUrl?: string;
  attachedFileType?: string;
  aiResponse?: string;
  status: string;
}) {
  await supabase.from("smart_assistant_commands").insert({
    admin_id: params.adminId,
    command_text: params.commandText,
    target_page: params.targetPage || null,
    attached_file_url: params.attachedFileUrl || null,
    attached_file_type: params.attachedFileType || null,
    ai_response: params.aiResponse || null,
    status: params.status,
  } as any);
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
  const [iframeKey, setIframeKey] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showHistory, setShowHistory] = useState(false);
  const [commandHistory, setCommandHistory] = useState<any[]>([]);

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
    return () => {
      if (uploadedFileUrl && uploadedFileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(uploadedFileUrl);
      }
    };
  }, [uploadedFileUrl]);

  const loadHistory = async () => {
    const { data } = await supabase
      .from("smart_assistant_commands")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) as any;
    setCommandHistory(data || []);
    setShowHistory(true);
  };

  const exportHistory = async () => {
    const { data } = await supabase
      .from("smart_assistant_commands")
      .select("*")
      .order("created_at", { ascending: false }) as any;
    if (!data || data.length === 0) {
      toast.error("لا توجد أوامر للتصدير");
      return;
    }
    const exportData = {
      exported_at: new Date().toISOString(),
      total_commands: data.length,
      commands: data.map((cmd: any) => ({
        id: cmd.id,
        command: cmd.command_text,
        type: cmd.command_type,
        target_page: cmd.target_page,
        attached_file: cmd.attached_file_url,
        ai_response: cmd.ai_response,
        status: cmd.status,
        created_at: cmd.created_at,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `smart-assistant-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("✅ تم تصدير السجل بنجاح");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { toast.error("يرجى رفع صورة أو فيديو فقط"); return; }
    if (file.size > 20 * 1024 * 1024) { toast.error("حجم الملف كبير جداً (الحد الأقصى 20MB)"); return; }
    const objectUrl = URL.createObjectURL(file);
    setUploadedFile(file);
    setUploadedFileUrl(objectUrl);
    setUploadedFileType(isImage ? "image" : "video");
    setSiteUrl("");
    toast.success(`تم رفع ${isImage ? "الصورة" : "الفيديو"} بنجاح`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearUploadedFile = () => {
    if (uploadedFileUrl && uploadedFileUrl.startsWith("blob:")) URL.revokeObjectURL(uploadedFileUrl);
    setUploadedFile(null);
    setUploadedFileUrl("");
    setUploadedFileType("");
  };

  const sendMessage = async () => {
    const safeText = sanitizePlainText(input, 8000);
    if (!safeText || loading) return;
    if (!isActive) { toast.warning("⚠️ المساعد غير مفعّل — فعّل المساعد أولاً"); return; }

    // Upload file to storage if present
    let storedFileUrl: string | null = null;
    if (uploadedFile) {
      storedFileUrl = await uploadFileToStorage(uploadedFile);
    }

    let userContent: string | any[];
    let displayContent = safeText;

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
      // Build rich context about what's displayed in Page 1
      const page1Context = siteUrl
        ? `\n\n[📺 المحتوى المعروض في صفحة 1: ${siteUrl}]\n⚠️ أي طلب مني الآن يتعلق بهذا الموقع المعروض. استخدم أداة fetch_webpage لقراءة محتواه أولاً ثم نفّذ ما أطلبه عليه.`
        : uploadedFile
        ? `\n\n[📺 المحتوى المعروض في صفحة 1: ملف ${uploadedFileType === "image" ? "صورة" : "فيديو"} - ${uploadedFile.name}]\n⚠️ أي طلب مني الآن يتعلق بهذا الملف المعروض.`
        : "";
      const fileContext = uploadedFile && !siteUrl
        ? `\n[ملف مرفق: ${uploadedFile.name} (${uploadedFileType}) - فيديو لا يمكن تحليله مباشرة]`
        : "";
      const pageContext = previewUrl ? `\n[معاينة صفحة 2: ${previewUrl}]` : "";
      userContent = safeText + page1Context + fileContext + pageContext;
      if (uploadedFile) displayContent = `📎 ${uploadedFile.name}\n${safeText}`;
    }

    const userMsg: AiMsg = { role: "user", content: userContent };
    const displayMsg: AiMsg = { role: "user", content: displayContent };
    setMessages((prev) => [...prev, displayMsg]);
    setInput("");
    setLoading(true);

    // Get current user for logging
    const { data: { session } } = await supabase.auth.getSession();
    const adminId = session?.user?.id || "unknown";

    await callAdminAI({
      messages: [...messages, userMsg],
      onResult: async (reply) => {
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        setLoading(false);
        setIframeKey((k) => k + 1);
        toast.success("✅ تم تنفيذ الأمر بنجاح");

        // Save to database
        await saveCommand({
          adminId,
          commandText: safeText,
          targetPage: siteUrl || previewUrl || undefined,
          attachedFileUrl: storedFileUrl || undefined,
          attachedFileType: uploadedFileType || undefined,
          aiResponse: reply,
          status: "completed",
        });
      },
      onError: async (err) => {
        setMessages((prev) => [...prev, { role: "assistant", content: `❌ ${err}` }]);
        setLoading(false);
        toast.error("❌ فشل تنفيذ الأمر");

        await saveCommand({
          adminId,
          commandText: safeText,
          targetPage: siteUrl || previewUrl || undefined,
          attachedFileUrl: storedFileUrl || undefined,
          attachedFileType: uploadedFileType || undefined,
          aiResponse: err,
          status: "failed",
        });
      },
    });
  };

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
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white h-7 w-7" onClick={clearUploadedFile}>
                <X className="w-4 h-4" />
              </Button>
              {uploadedFileType === "image" ? (
                <img src={uploadedFileUrl} alt="ملف مرفوع" className="max-w-full max-h-full object-contain" style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center" }} />
              ) : (
                <video src={uploadedFileUrl} controls className="max-w-full max-h-full" style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center" }} />
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
            <Button variant="outline" size="icon" className="h-7 w-7 text-lg font-bold" onClick={() => setZoomLevel((z) => Math.max(0.01, z - 0.1))}>−</Button>
            <Input
              type="number" min={1} max={100000} value={Math.round(zoomLevel * 100)}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1 && v <= 100000) setZoomLevel(v / 100); }}
              className="w-20 h-7 text-center text-xs bg-background border-border [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" dir="ltr"
            />
            <Button variant="outline" size="icon" className="h-7 w-7 text-lg font-bold" onClick={() => setZoomLevel((z) => z + 0.1)}>+</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[220px] min-h-[180px]">
        {/* جدول المساعد الذكي */}
        <div className="rounded-xl border border-blue-300 flex flex-col bg-blue-100 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-blue-200 flex items-center gap-2 shrink-0">
            <Bot className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-blue-800">المساعد الذكي</span>
            <div className="mr-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-200" onClick={loadHistory} title="سجل الأوامر">
                <History className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-blue-600 hover:bg-blue-200" onClick={exportHistory} title="تصدير السجل">
                <Download className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div ref={chatRef} className="flex-1 overflow-auto p-3 space-y-2">
            {showHistory ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-800">📋 سجل الأوامر ({commandHistory.length})</span>
                  <Button variant="ghost" size="sm" className="h-5 text-[10px] text-blue-600" onClick={() => setShowHistory(false)}>رجوع للمحادثة</Button>
                </div>
                {commandHistory.map((cmd: any) => (
                  <div key={cmd.id} className="bg-white rounded-lg p-2 border border-blue-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={`text-[9px] ${cmd.status === "completed" ? "border-green-400 text-green-700" : "border-red-400 text-red-700"}`}>
                        {cmd.status === "completed" ? "✅ منفذ" : "❌ فشل"}
                      </Badge>
                      <span className="text-[9px] text-gray-400">{new Date(cmd.created_at).toLocaleString("ar-SA")}</span>
                    </div>
                    <p className="text-black font-medium">{cmd.command_text?.slice(0, 100)}</p>
                    {cmd.attached_file_url && <span className="text-blue-500 text-[9px]">📎 ملف مرفق</span>}
                    {cmd.target_page && <span className="text-gray-500 text-[9px] block">🌐 {cmd.target_page}</span>}
                  </div>
                ))}
                {commandHistory.length === 0 && <p className="text-center text-xs text-blue-400 py-4">لا توجد أوامر سابقة</p>}
              </div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className="text-center py-4">
                    <Bot className="w-8 h-8 mx-auto text-primary/40 mb-1" />
                    <p className="text-black/60 text-xs">مرحبًا! أنا المساعد الذكي للمدير</p>
                    <p className="text-black/40 text-[10px] mt-1">جميع الأوامر تُحفظ محلياً في قاعدة البيانات</p>
                  </div>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-xs ${msg.role === "user" ? "bg-black text-red-500" : "bg-gray-100 text-black"}`}>
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
              </>
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-[10px] text-green-400/50">Shift+Enter لسطر جديد</span>
              <div className="flex items-center gap-2">
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />
                <Button
                  variant="outline" size="sm"
                  className="gap-1.5 border-green-700 bg-green-900/50 text-green-300 hover:bg-green-800 hover:text-green-100"
                  onClick={() => fileInputRef.current?.click()} disabled={!isActive}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  رفع ملف
                </Button>
                <Button onClick={sendMessage} disabled={!input.trim() || loading || !isActive} size="sm" className="gap-2 bg-green-700 hover:bg-green-600 text-green-100">
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
