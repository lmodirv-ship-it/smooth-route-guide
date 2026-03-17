import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Bot, Send, ArrowRight, User, Loader2, Sparkles, Car, Headphones, Shield } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string };

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hn-assistant`;

const agentTypes = [
  { id: "client", label: "مساعد العميل", icon: User, color: "text-info", bg: "from-[hsl(205,78%,56%)] to-[hsl(220,80%,40%)]", desc: "حجز رحلات، تقدير الأسعار، الدعم" },
  { id: "driver", label: "مساعد السائق", icon: Car, color: "text-primary", bg: "from-[hsl(32,95%,55%)] to-[hsl(25,100%,45%)]", desc: "إدارة الرحلات، الأرباح، المساعدة" },
  { id: "admin", label: "مساعد الإدارة", icon: Shield, color: "text-success", bg: "from-[hsl(145,63%,42%)] to-[hsl(160,60%,35%)]", desc: "تحليل البيانات، التقارير، القرارات" },
];

const AgentHub = () => {
  const navigate = useNavigate();
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    let assistantSoFar = "";
    try {
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      if (!resp.ok || !resp.body) throw new Error("خطأ");
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
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch { buffer = line + "\n" + buffer; break; }
        }
      }
    } catch {
      setMessages(p => [...p, { role: "assistant", content: "❌ عذراً، حدث خطأ. حاول مجدداً." }]);
    }
    setLoading(false);
  };

  if (!activeAgent) {
    return (
      <div className="min-h-screen gradient-dark pb-6" dir="rtl">
        <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
          <span className="font-bold text-foreground">الذكاء الاصطناعي</span>
          <Sparkles className="w-5 h-5 text-primary" />
        </div>

        <div className="px-4 mt-6">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 glow-primary">
              <Bot className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">HN AI Hub</h1>
            <p className="text-muted-foreground text-sm mt-1">اختر المساعد الذكي المناسب</p>
          </div>

          <div className="space-y-3">
            {agentTypes.map((agent, i) => (
              <motion.button key={agent.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                onClick={() => { setActiveAgent(agent.id); setMessages([]); }}
                className="w-full gradient-card rounded-2xl p-5 border border-border hover:border-primary/30 transition-all text-right">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${agent.bg} flex items-center justify-center flex-shrink-0`}>
                    <agent.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-foreground font-bold">{agent.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{agent.desc}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          <div className="gradient-card rounded-xl p-4 border border-border mt-6">
            <h3 className="text-foreground font-bold text-sm mb-2">أين يُستخدم الذكاء الاصطناعي؟</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p>🟠 <strong className="text-foreground">تطبيق العميل:</strong> مساعد حجز ذكي يقترح الوجهات والأسعار</p>
              <p>🔵 <strong className="text-foreground">تطبيق السائق:</strong> تحسين المسارات ونصائح لزيادة الأرباح</p>
              <p>🟢 <strong className="text-foreground">لوحة الإدارة:</strong> تحليل البيانات واتخاذ القرارات الذكية</p>
              <p>🟡 <strong className="text-foreground">مركز الاتصال:</strong> اقتراح حلول تلقائية للشكاوى</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentAgent = agentTypes.find(a => a.id === activeAgent)!;

  return (
    <div className="min-h-screen gradient-dark flex flex-col" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => setActiveAgent(null)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <div className="flex items-center gap-2">
          <currentAgent.icon className={`w-5 h-5 ${currentAgent.color}`} />
          <span className="font-bold text-foreground text-sm">{currentAgent.label}</span>
        </div>
        <Bot className="w-5 h-5 text-primary" />
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center pt-12 space-y-3">
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${currentAgent.bg} flex items-center justify-center mx-auto`}>
              <currentAgent.icon className="w-8 h-8 text-white" />
            </div>
            <p className="text-foreground font-bold">{currentAgent.label}</p>
            <p className="text-xs text-muted-foreground">{currentAgent.desc}</p>
            <div className="space-y-2 pt-4 max-w-xs mx-auto">
              {(activeAgent === "client" ? ["كم سعر الرحلة إلى المطار؟", "أريد حجز رحلة", "ما هي طرق الدفع المتاحة؟"] :
                activeAgent === "driver" ? ["كيف أزيد أرباحي؟", "ما أفضل الأوقات للعمل؟", "كيف أحسّن تقييمي؟"] :
                ["ما حالة النظام؟", "اقترح أفضل سائق", "تقرير الأرباح اليوم"]).map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)} className="w-full text-right text-xs p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary text-foreground transition-colors">{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === "user" ? "bg-primary/20" : `bg-gradient-to-br ${currentAgent.bg}`}`}>
              {msg.role === "user" ? <User className="w-4 h-4 text-primary" /> : <currentAgent.icon className="w-4 h-4 text-white" />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${msg.role === "user" ? "gradient-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
              <div className="prose prose-sm prose-invert max-w-none text-inherit"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${currentAgent.bg} flex items-center justify-center`}>
              <currentAgent.icon className="w-4 h-4 text-white" />
            </div>
            <div className="bg-secondary rounded-xl px-3 py-2"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          </div>
        )}
      </div>

      <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="glass-strong border-t border-border p-3 flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="اكتب رسالتك..." className="flex-1 bg-secondary/80 border-border rounded-xl text-sm text-right" disabled={loading} />
        <Button type="submit" size="icon" disabled={!input.trim() || loading} className="gradient-primary rounded-xl"><Send className="w-4 h-4" /></Button>
      </form>
    </div>
  );
};

export default AgentHub;
