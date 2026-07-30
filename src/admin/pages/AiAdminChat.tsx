/**
 * AI with Admin — دردشة المسؤول مع النماذج والوكلاء المفعّلين فقط، مع حفظ المحادثات.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send, Plus, RefreshCw, Sparkles } from "lucide-react";
import { providerLogo } from "@/admin/data/aiProviders";
import { CHAT_SKINS, getSkin } from "@/admin/data/chatSkins";

const CATEGORY_LABEL: Record<string, string> = {
  llm: "نماذج نصية", image: "نماذج صور", video: "نماذج فيديو",
  tts: "تحويل نص إلى صوت", stt: "تفريغ صوتي", embedding: "تضمين",
};


type Msg = { role: "user" | "assistant"; content: string };

export default function AiAdminChat() {
  const db = supabase as any;
  const [models, setModels] = useState<Record<string, any>[]>([]);
  const [agents, setAgents] = useState<Record<string, any>[]>([]);
  const [modelId, setModelId] = useState<string>("gateway");
  const [agentId, setAgentId] = useState<string>("none");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [skinId, setSkinId] = useState<string>(() => localStorage.getItem("hn_admin_chat_skin") ?? "classic");
  const skin = getSkin(skinId);
  useEffect(() => { localStorage.setItem("hn_admin_chat_skin", skinId); }, [skinId]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadCatalog = async () => {
    const [{ data: m }, { data: a }] = await Promise.all([
      db.from("ai_models")
        .select("id, display_name, provider, model_id, category, is_free")
        .eq("is_enabled", true).order("category").order("priority"),
      db.from("ai_agents").select("id, name, role").eq("is_enabled", true).order("priority"),
    ]);
    setModels(m ?? []);
    setAgents(a ?? []);
  };

  useEffect(() => { loadCatalog(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => {
    const map = new Map<string, Record<string, any>[]>();
    for (const m of models) {
      const k = m.category ?? "llm";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return Array.from(map.entries());
  }, [models]);


  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const ensureChat = async (firstText: string) => {
    if (chatId) return chatId;
    const { data, error } = await db.from("ai_admin_chats")
      .insert({ title: firstText.slice(0, 60), model_ref: modelId, agent_id: agentId === "none" ? null : agentId })
      .select("id").single();
    if (error) { toast({ title: "تعذّر إنشاء المحادثة", description: error.message, variant: "destructive" }); return null; }
    setChatId(data.id);
    return data.id as string;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);

    const id = await ensureChat(text);
    if (id) await db.from("ai_admin_chat_messages").insert({ chat_id: id, role: "user", content: text });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-admin-chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          messages: next,
          model_row_id: modelId === "gateway" ? null : modelId,
          agent_id: agentId === "none" ? null : agentId,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.text();
        throw new Error(err.slice(0, 300));
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistant = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";
        for (const line of parts) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const json = l.slice(5).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const obj = JSON.parse(json);
            const delta = obj?.choices?.[0]?.delta?.content ?? "";
            if (delta) {
              assistant += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch { /* ignore partial chunk */ }
        }
      }

      if (id && assistant) {
        await db.from("ai_admin_chat_messages").insert({ chat_id: id, role: "assistant", content: assistant });
      }
    } catch (e: any) {
      toast({ title: "تعذّر الحصول على رد", description: e?.message ?? "", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">AI with Admin</h1>
          <p className="text-xs text-muted-foreground mt-1">
            تظهر هنا النماذج والوكلاء <span className="text-primary">المفعّلون فقط</span> — فعّل أي نموذج من صفحة «نماذج الذكاء الاصطناعي» ليظهر في القائمة.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{models.length} نموذج مُفعّل</Badge>
          <Badge variant="outline">{agents.length} وكيل</Badge>
          <Select value={modelId} onValueChange={setModelId}>
            <SelectTrigger className="h-9 w-[250px]"><SelectValue placeholder="النموذج" /></SelectTrigger>
            <SelectContent className="max-h-80">
              <SelectItem value="gateway">بوابة Lovable AI (افتراضي)</SelectItem>
              {grouped.map(([cat, list]) => (
                <SelectGroup key={cat}>
                  <SelectLabel className="text-[11px] text-muted-foreground">
                    {CATEGORY_LABEL[cat] ?? cat} ({list.length})
                  </SelectLabel>
                  {list.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="flex items-center gap-2">
                        <img src={providerLogo(m.provider)} alt="" width={16} height={16} loading="lazy" className="rounded" />
                        <span>{m.display_name}</span>
                        {m.is_free && <span className="text-[10px] text-primary">مجاني</span>}
                      </span>
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Select value={agentId} onValueChange={setAgentId}>
            <SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="الوكيل" /></SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="none">بدون وكيل</SelectItem>
              {agents.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}{a.role ? ` · ${a.role}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={loadCatalog} title="تحديث القوائم">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setChatId(null); setMessages([]); }}>
            <Plus className="w-4 h-4 me-1" /> محادثة جديدة
          </Button>

          {/* اختيار شكل واجهة الدردشة */}
          <Select value={skinId} onValueChange={setSkinId}>
            <SelectTrigger className="h-9 w-[180px]" aria-label="شكل الدردشة">
              <span className="flex items-center gap-2">
                <span className="relative h-5 w-5 rounded-full overflow-hidden border border-border">
                  <span className="absolute inset-0" style={{ background: skin.preview[1] }} />
                  <span className="absolute inset-x-0.5 top-0.5 h-1.5 rounded-full" style={{ background: skin.preview[0] }} />
                </span>
                <span className="text-sm">{skin.label}</span>
              </span>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectLabel className="text-[11px] text-muted-foreground">أشكال واجهة الدردشة</SelectLabel>
              {CHAT_SKINS.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <span className="flex items-center gap-2">
                    <span className="relative h-5 w-5 rounded-full overflow-hidden border border-border flex-shrink-0">
                      <span className="absolute inset-0" style={{ background: s.preview[1] }} />
                      <span className="absolute inset-x-0.5 top-0.5 h-1.5 rounded-full" style={{ background: s.preview[0] }} />
                    </span>
                    <span>{s.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

      </div>

      <Card className={`p-0 overflow-hidden rounded-2xl transition-colors ${skin.shell}`}>
        <div ref={scrollRef} className={`h-[55vh] overflow-y-auto p-4 space-y-3 ${skin.surface}`}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground">ابدأ الحوار</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                اكتب رسالتك في الأسفل — يمكنك تغيير شكل واجهة الدردشة من الأيقونات الملوّنة بالأعلى.
              </p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex animate-fade-in ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed transition-colors ${
                m.role === "user" ? skin.user : skin.assistant
              }`}>
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div className={`px-3.5 py-3 ${skin.assistant}`}>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>
        <div className={`p-3 flex gap-2 ${skin.composer}`}>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="اكتب رسالتك…"
            className="rounded-xl"
            disabled={loading}
          />
          <Button onClick={send} disabled={loading || !input.trim()} className="rounded-xl px-4">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
