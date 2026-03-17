import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import logo from "@/assets/hn-driver-logo.png";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/hn-assistant`;

async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (err: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Erreur réseau" }));
    onError(err.error || "Erreur du service");
    return;
  }

  if (!resp.body) { onError("Pas de réponse"); return; }

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
      } catch {
        buffer = line + "\n" + buffer;
        break;
      }
    }
  }
  onDone();
}

const quickActions = [
  "Je veux un taxi",
  "Quel est le prix du trajet ?",
  "Où est mon chauffeur ?",
  "J'ai une réclamation",
];

const AIAssistant = () => {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    await streamChat({
      messages: [...messages, userMsg],
      onDelta: upsert,
      onDone: () => setIsLoading(false),
      onError: (err) => {
        setMessages((p) => [...p, { role: "assistant", content: `❌ ${err}` }]);
        setIsLoading(false);
      },
    });
  };

  return (
    <div className="min-h-screen gradient-dark flex flex-col">
      {/* Header */}
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-border">
        <div className="w-8" />
        <div className="flex items-center gap-2">
          <img src={logo} alt="HN" className="w-8 h-8" />
          <span className="font-bold font-display text-gradient-primary text-lg">Assistant HN</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center pt-12 gap-4">
            <div className="icon-circle-orange w-16 h-16">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-foreground font-bold text-lg">مرحباً! كيف يمكنني مساعدتك؟</h2>
            <p className="text-muted-foreground text-sm text-center max-w-xs">
              أنا مساعدك الذكي في HN Driver. اسألني عن أي شيء يتعلق بالرحلات والخدمات.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {quickActions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q)}
                  className="gradient-card border border-border rounded-full px-4 py-2 text-sm text-foreground hover:border-primary/40 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-primary/20" : "bg-info/20"
              }`}>
                {msg.role === "user" ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-info" />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-secondary text-secondary-foreground rounded-tl-sm"
              }`}>
                <div className="prose prose-sm prose-invert max-w-none text-inherit">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-info/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-info" />
            </div>
            <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="glass-strong border-t border-border p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك..."
            className="flex-1 bg-secondary/80 border-border rounded-xl text-right"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="gradient-primary rounded-xl glow-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;
