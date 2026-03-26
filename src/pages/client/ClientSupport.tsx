import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Phone, MessageCircle, Bot, HelpCircle, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";

const ClientSupport = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const faqs = [
    { q: t.customer.faq1q, a: t.customer.faq1a },
    { q: t.customer.faq2q, a: t.customer.faq2a },
    { q: t.customer.faq3q, a: t.customer.faq3a },
    { q: t.customer.faq4q, a: t.customer.faq4a },
  ];

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) { toast({ title: t.customer.fillFields, variant: "destructive" }); return; }
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast({ title: t.customer.loginRequiredMsg, variant: "destructive" }); setSending(false); return; }
    await supabase.from("complaints").insert({
      user_id: user.id,
      category: "support",
      description: `${subject}: ${message}`,
      status: "open",
      priority: "medium",
    });
    toast({ title: t.customer.messageSentMsg });
    setSubject(""); setMessage(""); setSending(false);
  };

  return (
    <div className="min-h-screen gradient-dark pb-24" dir={dir}>
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">{t.customer.supportTitle}</span>
        <HelpCircle className="w-5 h-5 text-primary" />
      </div>

      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Phone, label: t.customer.callUsLabel, color: "text-success", bg: "bg-success/10" },
            { icon: MessageCircle, label: t.customer.chatLabelC, color: "text-info", bg: "bg-info/10" },
            { icon: Bot, label: t.customer.assistantLabel, color: "text-primary", bg: "bg-primary/10", path: "/assistant" },
          ].map((c, i) => (
            <button key={i} onClick={() => c.path && navigate(c.path)}
              className="gradient-card rounded-xl p-4 border border-border flex flex-col items-center gap-2 hover:border-primary/20">
              <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center`}><c.icon className={`w-6 h-6 ${c.color}`} /></div>
              <span className="text-xs text-foreground">{c.label}</span>
            </button>
          ))}
        </div>

        <h3 className="text-foreground font-bold mb-3">{t.customer.faqTitle}</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="gradient-card rounded-xl border border-border overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-4 flex items-center justify-between">
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm text-foreground">{faq.q}</span>
              </button>
              {openFaq === i && <div className="px-4 pb-4"><p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{faq.a}</p></div>}
            </div>
          ))}
        </div>

        <div className="gradient-card rounded-xl p-4 border border-border mt-6 space-y-3">
          <h3 className="text-foreground font-bold text-sm">{t.customer.sendComplaintTitle}</h3>
          <Input placeholder={t.customer.subjectPlaceholder} value={subject} onChange={e => setSubject(e.target.value)} className="bg-secondary border-border rounded-xl" />
          <Textarea placeholder={t.customer.messagePlaceholder} value={message} onChange={e => setMessage(e.target.value)} className="bg-secondary border-border rounded-xl min-h-[100px]" />
          <Button onClick={handleSend} disabled={sending} className="w-full gradient-primary text-primary-foreground rounded-xl">
            <Send className="w-4 h-4 ml-2" /> {t.driver.sendBtn}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ClientSupport;
