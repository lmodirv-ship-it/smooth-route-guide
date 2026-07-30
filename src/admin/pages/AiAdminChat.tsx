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
import { Loader2, Send, Plus, RefreshCw, Sparkles, Palette, Sun, Moon, RotateCcw, Save, Trash2, Paperclip, Download, AlertTriangle, Package, PhoneCall, MessageSquareWarning } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChatPrefs, CHAT_FONTS, bubbleCss } from "@/hooks/useChatPrefs";
import type { ChatPrefs, ChatCustom, ChatPreset, BubbleCustom } from "@/hooks/useChatPrefs";

import { providerLogo } from "@/admin/data/aiProviders";
import { CHAT_SKINS, getSkin } from "@/admin/data/chatSkins";
import ToolActivity, { type ToolEvent } from "@/admin/components/ToolActivity";
import { streamLocalChat, pingLocal, localErrorHint } from "@/admin/lib/localChat";


const CATEGORY_LABEL: Record<string, string> = {
  llm: "نماذج نصية", image: "نماذج صور", video: "نماذج فيديو",
  tts: "تحويل نص إلى صوت", stt: "تفريغ صوتي", embedding: "تضمين",
};


type Msg = { role: "user" | "assistant"; content: string };

export default function AiAdminChat() {
  const db = supabase as any;
  const [models, setModels] = useState<Record<string, any>[]>([]);
  const [agents, setAgents] = useState<Record<string, any>[]>([]);
  const [localModels, setLocalModels] = useState<Record<string, any>[]>([]);
  const [localStatus, setLocalStatus] = useState<Record<string, boolean>>({});
  const [modelId, setModelId] = useState<string>("gateway");

  const [agentId, setAgentId] = useState<string>("none");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<ToolEvent[]>([]);
  const [quickCommands, setQuickCommands] = useState<{ id: string; label: string; prompt: string }[]>([]);
  const [pulse, setPulse] = useState<{ orders: number; stuck: number; complaints: number; alerts: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { prefs, commit, synced } = useChatPrefs();
  /** مسودّة للمعاينة الفورية قبل الحفظ */
  const [draft, setDraft] = useState<ChatPrefs>(prefs);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setDraft(prefs); }, [prefs, synced]); // eslint-disable-line react-hooks/exhaustive-deps

  const patchDraft = (patch: Partial<ChatPrefs>) => { setDirty(true); setDraft((d) => ({ ...d, ...patch })); };
  const patchBubble = (role: "user" | "assistant", patch: Partial<BubbleCustom>) => {
    setDirty(true);
    setDraft((d) => ({ ...d, custom: { ...d.custom, [role]: { ...(d.custom[role] ?? {}), ...patch } } }));
  };
  const patchCustom = (patch: Partial<ChatCustom>) => {
    setDirty(true);
    setDraft((d) => ({ ...d, custom: { ...d.custom, ...patch } }));
  };
  const saveTheme = () => { commit(draft); setDirty(false); toast({ title: "تم حفظ الثيم" }); };
  const cancelTheme = () => { setDraft(prefs); setDirty(false); };
  const resetColors = () => { setDirty(true); setDraft((d) => ({ ...d, custom: {} })); };

  const [presetName, setPresetName] = useState("");
  const savePreset = () => {
    const name = presetName.trim();
    if (!name) return;
    const preset: ChatPreset = {
      id: crypto.randomUUID(),
      name,
      skinId: draft.skinId,
      colorMode: draft.colorMode,
      custom: draft.custom,
    };
    const next = { ...draft, presets: [...(draft.presets ?? []), preset], activePresetId: preset.id };
    setDraft(next); setDirty(false); commit(next);
    setPresetName("");
    toast({ title: `تم حفظ الثيم «${name}»` });
  };
  const applyPreset = (id: string) => {
    const p = (draft.presets ?? []).find((x) => x.id === id);
    if (!p) return;
    const next: ChatPrefs = { ...draft, skinId: p.skinId, colorMode: p.colorMode, custom: p.custom, activePresetId: p.id };
    setDraft(next); setDirty(false); commit(next);
  };
  const deletePreset = (id: string) => {
    const next: ChatPrefs = {
      ...draft,
      presets: (draft.presets ?? []).filter((x) => x.id !== id),
      activePresetId: draft.activePresetId === id ? null : draft.activePresetId,
    };
    setDraft(next); setDirty(false); commit(next);
  };

  const skinId = draft.skinId;
  const setSkinId = (id: string) => patchDraft({ skinId: id });
  const skin = getSkin(skinId);
  const c = draft.custom;
  const isLight = draft.colorMode === "light";

  const surfaceStyle: React.CSSProperties = {
    background: c.bg || undefined,
    fontFamily: c.fontFamily || undefined,
    fontSize: c.fontSize ? `${c.fontSize}px` : undefined,
  };
  const bubbleStyle = (role: "user" | "assistant") => bubbleCss(c, role);
  const scrollRef = useRef<HTMLDivElement>(null);


  const loadCatalog = async () => {
    const [{ data: m }, { data: a }, { data: q }, { data: lm }] = await Promise.all([
      db.from("ai_models")
        .select("id, display_name, provider, model_id, category, is_free")
        .eq("is_enabled", true).order("category").order("priority"),
      db.from("ai_agents").select("id, name, role").eq("is_enabled", true).order("priority"),
      db.from("ai_quick_commands").select("id, label, prompt").eq("is_enabled", true).order("sort_order"),
      db.from("ai_local_models")
        .select("id, display_name, model_id, engine, endpoint_url, category, status")
        .eq("is_enabled", true).order("priority"),
    ]);
    setModels(m ?? []);
    setAgents(a ?? []);
    setQuickCommands(q ?? []);
    setLocalModels(lm ?? []);
    void checkLocal(lm ?? []);
  };

  /** فحص اتصال النماذج المحلية وتحديث حالتها في قاعدة البيانات. */
  const checkLocal = async (list: Record<string, any>[]) => {
    const results = await Promise.all(
      list.map(async (m) => ({ id: m.id, ...(await pingLocal(m.endpoint_url || "http://localhost:11434")) })),
    );
    setLocalStatus(Object.fromEntries(results.map((r) => [r.id, r.ok])));
    await Promise.all(results.map((r) =>
      db.from("ai_local_models")
        .update({ status: r.ok ? "connected" : "disconnected", last_check_at: new Date().toISOString() })
        .eq("id", r.id),
    ));
  };


  /** شريط المؤشرات الحيّة أعلى الدردشة. */
  const loadPulse = async () => {
    const today = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const fiveMin = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const [orders, stuck, complaints, alerts] = await Promise.all([
      db.from("delivery_orders").select("id", { count: "exact", head: true }).gte("created_at", today),
      db.from("delivery_orders").select("id", { count: "exact", head: true })
        .is("driver_id", null).lt("created_at", fiveMin)
        .in("status", ["pending", "pending_call_center", "ready_for_driver"]),
      db.from("complaints").select("id", { count: "exact", head: true }).neq("status", "resolved"),
      db.from("alerts").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    ]);
    setPulse({
      orders: orders.count ?? 0,
      stuck: stuck.count ?? 0,
      complaints: complaints.count ?? 0,
      alerts: alerts.count ?? 0,
    });
  };

  useEffect(() => {
    loadCatalog();
    loadPulse();
    const t = setInterval(loadPulse, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


  const grouped = useMemo(() => {
    const map = new Map<string, Record<string, any>[]>();
    for (const m of models) {
      const k = m.category ?? "llm";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return Array.from(map.entries());
  }, [models]);

  const freeModels = useMemo(() => models.filter((m) => m.is_free), [models]);
  /** النموذج المحلي المختار حالياً (إن وُجد). */
  const activeLocal = useMemo(
    () => (modelId.startsWith("local:") ? localModels.find((m) => m.id === modelId.slice(6)) ?? null : null),
    [modelId, localModels],
  );



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

  /** تشغيل دورة رد على قائمة رسائل معطاة. */
  const run = async (next: Msg[], persistUser = true) => {
    const lastUser = [...next].reverse().find((m) => m.role === "user")?.content ?? "";
    setMessages(next);
    setActivity([]);
    setLoading(true);

    const id = await ensureChat(lastUser);
    if (id && persistUser) await db.from("ai_admin_chat_messages").insert({ chat_id: id, role: "user", content: lastUser });

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
          chat_id: id,
          tools_enabled: true,
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
            if (obj?.lovable) { setActivity((a) => [...a, obj.lovable as ToolEvent]); continue; }
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

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || loading) return;
    setInput("");
    await run([...messages, { role: "user" as const, content: text }]);
  };

  /** إعادة توليد آخر رد (يحذف رد المساعد الأخير ويعيد الطلب). */
  const regenerate = async () => {
    if (loading || !messages.length) return;
    let cut = [...messages];
    while (cut.length && cut[cut.length - 1].role === "assistant") cut.pop();
    if (!cut.length) return;
    await run(cut, false);
  };

  /** تصدير المحادثة الحالية كملف Markdown. */
  const exportChat = () => {
    if (!messages.length) return;
    const md = messages.map((m) => `## ${m.role === "user" ? "المسؤول" : "المساعد"}\n\n${m.content}`).join("\n\n---\n\n");
    const blob = new Blob(["\uFEFF" + md], { type: "text/markdown;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `hn-chat-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  /** رفع ملف نصي/CSV/JSON لتحليله داخل المحادثة. */
  const onPickFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 512 * 1024) {
      toast({ title: "الملف كبير", description: "الحد الأقصى 512 كيلوبايت للملفات النصية.", variant: "destructive" });
      return;
    }
    const text = await file.text();
    setInput((v) => `${v ? v + "\n\n" : ""}حلّل محتوى الملف «${file.name}»:\n\n\`\`\`\n${text.slice(0, 20000)}\n\`\`\``);
    toast({ title: "تم إرفاق الملف", description: file.name });
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

          {/* شكل الدردشة + التخصيص + الثيمات */}
          <Popover>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" className="h-9 gap-2" aria-label="ثيم الدردشة">
                <span className="relative h-5 w-5 rounded-full overflow-hidden border border-border">
                  <span className="absolute inset-0" style={{ background: c.bg || skin.preview[1] }} />
                  <span className="absolute inset-x-0.5 top-0.5 h-1.5 rounded-full" style={{ background: c.user?.bg || skin.preview[0] }} />
                </span>
                <Palette className="w-4 h-4" />
                <span className="text-sm">{skin.label}</span>
                {dirty && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[340px] max-h-[75vh] overflow-y-auto space-y-4 z-50">
              {/* ثيمات محفوظة */}
              <div className="space-y-2">
                <Label className="text-xs">ثيماتي</Label>
                {(draft.presets ?? []).length === 0 ? (
                  <p className="text-[11px] text-muted-foreground">لا توجد ثيمات محفوظة بعد — خصّص ثم احفظ باسم.</p>
                ) : (
                  <div className="space-y-1">
                    {(draft.presets ?? []).map((p) => (
                      <div key={p.id} className={`flex items-center gap-2 rounded-md px-2 py-1.5 border ${draft.activePresetId === p.id ? "border-primary bg-primary/5" : "border-border"}`}>
                        <button type="button" onClick={() => applyPreset(p.id)} className="flex items-center gap-2 flex-1 min-w-0 text-start">
                          <span className="relative h-4 w-4 rounded-full overflow-hidden border border-border flex-shrink-0">
                            <span className="absolute inset-0" style={{ background: p.custom.bg || getSkin(p.skinId).preview[1] }} />
                            <span className="absolute inset-x-0.5 top-0.5 h-1 rounded-full" style={{ background: p.custom.user?.bg || getSkin(p.skinId).preview[0] }} />
                          </span>
                          <span className="text-xs truncate">{p.name}</span>
                        </button>
                        <button type="button" onClick={() => deletePreset(p.id)} className="text-muted-foreground hover:text-destructive" title="حذف">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input value={presetName} onChange={(e) => setPresetName(e.target.value)} placeholder="اسم الثيم الجديد" className="h-8 text-xs" />
                  <Button size="sm" className="h-8 gap-1" disabled={!presetName.trim()} onClick={savePreset}>
                    <Save className="w-3.5 h-3.5" /> حفظ
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label className="text-xs">شكل الواجهة</Label>
                <Select value={skinId} onValueChange={setSkinId}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent className="max-h-64 z-50">
                    {CHAT_SKINS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="flex items-center gap-2">
                          <span className="relative h-4 w-4 rounded-full overflow-hidden border border-border flex-shrink-0">
                            <span className="absolute inset-0" style={{ background: s.preview[1] }} />
                            <span className="absolute inset-x-0.5 top-0.5 h-1 rounded-full" style={{ background: s.preview[0] }} />
                          </span>
                          <span>{s.label}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">الوضع</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button size="sm" variant={isLight ? "outline" : "default"} onClick={() => patchDraft({ colorMode: "dark" })} className="gap-1">
                    <Moon className="w-3.5 h-3.5" /> ليلي
                  </Button>
                  <Button size="sm" variant={isLight ? "default" : "outline"} onClick={() => patchDraft({ colorMode: "light" })} className="gap-1">
                    <Sun className="w-3.5 h-3.5" /> نهاري
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">خلفية المحادثة</Label>
                <div className="flex items-center gap-1">
                  <input type="color" value={c.bg || "#111111"} onChange={(e) => patchCustom({ bg: e.target.value })}
                    className="h-8 w-full rounded-md border border-border bg-transparent cursor-pointer" aria-label="خلفية المحادثة" />
                  {c.bg && <button type="button" onClick={() => patchCustom({ bg: undefined })} className="text-[10px] text-muted-foreground hover:text-foreground" title="إلغاء">✕</button>}
                </div>
              </div>

              {/* تخصيص منفصل لكل نوع فقاعة */}
              <Tabs defaultValue="user">
                <TabsList className="grid grid-cols-2 w-full h-8">
                  <TabsTrigger value="user" className="text-xs">الرسائل الصادرة</TabsTrigger>
                  <TabsTrigger value="assistant" className="text-xs">الرسائل الواردة</TabsTrigger>
                </TabsList>
                {(["user", "assistant"] as const).map((role) => {
                  const b = c[role] ?? {};
                  return (
                    <TabsContent key={role} value={role} className="space-y-3 pt-3">
                      <div className="grid grid-cols-3 gap-2">
                        {([["bg", "الخلفية", "#1a1a1a"], ["text", "النص", "#ffffff"], ["border", "الحدود", "#666666"]] as const).map(([key, label, fallback]) => (
                          <div key={key} className="space-y-1">
                            <Label className="text-[11px] text-muted-foreground">{label}</Label>
                            <div className="flex items-center gap-1">
                              <input type="color" value={(b as any)[key] || fallback}
                                onChange={(e) => patchBubble(role, { [key]: e.target.value } as any)}
                                className="h-8 w-full rounded-md border border-border bg-transparent cursor-pointer" aria-label={label} />
                              {(b as any)[key] && (
                                <button type="button" onClick={() => patchBubble(role, { [key]: undefined } as any)}
                                  className="text-[10px] text-muted-foreground hover:text-foreground" title="إلغاء">✕</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] text-muted-foreground">سماكة الحدود ({b.borderWidth ?? 0}px)</Label>
                        <Slider value={[b.borderWidth ?? 0]} min={0} max={4} step={1}
                          onValueChange={([v]) => patchBubble(role, { borderWidth: v })} />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] text-muted-foreground">الاستدارة ({b.radius ?? 16}px)</Label>
                        <Slider value={[b.radius ?? 16]} min={0} max={32} step={2}
                          onValueChange={([v]) => patchBubble(role, { radius: v })} />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] text-muted-foreground">حجم الخط ({b.fontSize ?? c.fontSize ?? 14}px)</Label>
                        <Slider value={[b.fontSize ?? c.fontSize ?? 14]} min={12} max={20} step={1}
                          onValueChange={([v]) => patchBubble(role, { fontSize: v })} />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[11px] text-muted-foreground">نوع الخط</Label>
                        <Select value={b.fontFamily ?? "default"} onValueChange={(v) => patchBubble(role, { fontFamily: v === "default" ? undefined : v })}>
                          <SelectTrigger className="h-9"><SelectValue placeholder="خط المنصة" /></SelectTrigger>
                          <SelectContent className="z-50">
                            {CHAT_FONTS.map((f) => (
                              <SelectItem key={f.label} value={f.value || "default"}>
                                <span style={{ fontFamily: f.value || undefined }}>{f.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>

              <Separator />

              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" onClick={saveTheme} disabled={!dirty} className="gap-1">
                  <Save className="w-3.5 h-3.5" /> حفظ الثيم
                </Button>
                <Button size="sm" variant="outline" onClick={cancelTheme} disabled={!dirty} className="gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> تراجع
                </Button>
              </div>
              <Button size="sm" variant="ghost" className="w-full gap-2" onClick={resetColors}>
                <RotateCcw className="w-3.5 h-3.5" /> إعادة الألوان الافتراضية
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">
                {dirty ? "معاينة فورية — اضغط «حفظ الثيم» لتثبيته على كل أجهزتك." : "محفوظ في حسابك ويظهر على كل أجهزتك."}
              </p>
            </PopoverContent>
          </Popover>
        </div>


      </div>

      {pulse && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { icon: Package, label: "طلبات اليوم", value: pulse.orders, alert: false },
            { icon: PhoneCall, label: "طلبات عالقة", value: pulse.stuck, alert: pulse.stuck > 0 },
            { icon: MessageSquareWarning, label: "شكاوى مفتوحة", value: pulse.complaints, alert: pulse.complaints > 0 },
            { icon: AlertTriangle, label: "تنبيهات النظام", value: pulse.alerts, alert: pulse.alerts > 0 },
          ].map((k) => (
            <Card key={k.label} className={`p-3 flex items-center gap-3 ${k.alert ? "border-destructive/50" : ""}`}>
              <k.icon className={`w-4 h-4 ${k.alert ? "text-destructive" : "text-primary"}`} />
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{k.label}</p>
                <p className="text-lg font-bold leading-none">{k.value}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className={`p-0 overflow-hidden rounded-2xl transition-colors ${isLight ? "chat-light" : "dark"} ${skin.shell}`}>

        <div ref={scrollRef} style={surfaceStyle} className={`h-[55vh] overflow-y-auto p-4 space-y-3 ${skin.surface}`}>
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
              <div
                style={bubbleStyle(m.role)}
                className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed transition-colors ${
                  m.role === "user" ? skin.user : skin.assistant
                }`}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1">
                  <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {activity.length > 0 && <ToolActivity items={activity} />}
          {loading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex justify-start">
              <div style={bubbleStyle("assistant")} className={`px-3.5 py-3 ${skin.assistant}`}>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60 animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}
        </div>
        {quickCommands.length > 0 && (
          <div className={`px-3 pt-3 flex flex-wrap gap-1.5 ${skin.composer}`}>
            {quickCommands.map((q) => (
              <Button key={q.id} size="sm" variant="outline" disabled={loading}
                className="h-7 rounded-full text-[11px] px-3"
                onClick={() => send(q.prompt)}>
                {q.label}
              </Button>
            ))}
          </div>
        )}
        <div className={`p-3 flex gap-2 items-center ${skin.composer}`}>
          <input ref={fileRef} type="file" accept=".txt,.csv,.json,.md,.log" className="hidden"
            onChange={(e) => { onPickFile(e.target.files?.[0]); e.currentTarget.value = ""; }} />
          <Button size="icon" variant="ghost" className="rounded-xl shrink-0" title="إرفاق ملف للتحليل"
            disabled={loading} onClick={() => fileRef.current?.click()}>
            <Paperclip className="w-4 h-4" />
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="اكتب رسالتك…"
            className="rounded-xl"
            disabled={loading}
          />
          <Button size="icon" variant="ghost" className="rounded-xl shrink-0" title="إعادة توليد آخر رد"
            disabled={loading || !messages.length} onClick={() => regenerate()}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" className="rounded-xl shrink-0" title="تصدير المحادثة"
            disabled={!messages.length} onClick={exportChat}>
            <Download className="w-4 h-4" />
          </Button>
          <Button onClick={() => send()} disabled={loading || !input.trim()} className="rounded-xl px-4">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

      </Card>
    </div>
  );
}
