import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, PhoneCall, MessageCircle, Bot, HelpCircle, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/i18n/context";
import { useInAppCall } from "@/hooks/useInAppCall";
import InAppCallDialog from "@/components/calls/InAppCallDialog";

const ClientSupport = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [callingAgent, setCallingAgent] = useState(false);
  const inAppCall = useInAppCall();

  const faqs = [
    { q: t.customer.faq1q, a: t.customer.faq1a },
    { q: t.customer.faq2q, a: t.customer.faq2a },
    { q: t.customer.faq3q, a: t.customer.faq3a },
    { q: t.customer.faq4q, a: t.customer.faq4a },
  ];

  const handleCallCenter = async () => {
    setCallingAgent(true);
    try {
      const { data: agents } = await supabase
        .from("user_roles" as any)
        .select("user_id")
        .eq("role", "agent")
        .limit(5);

      if (!agents || agents.length === 0) {
        toast({ title: "لا يوجد وكلاء متاحون حالياً", variant: "destructive" });
        return;
      }

      const agentId = (agents[0] as any).user_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, user_code, avatar_url")
        .eq("id", agentId)
        .maybeSingle();

      await inAppCall.startCall({
        id: agentId,
        name: profile?.user_code || profile?.name || "مركز الاتصال",
        avatarUrl: profile?.avatar_url,
      });
    } catch {
      toast({ title: "تعذر الاتصال بمركز المساعدة", variant: "destructive" });
    } finally {
      setCallingAgent(false);
    }
  };

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
            { icon: PhoneCall, label: t.customer.callUsLabel, color: "text-success", bg: "bg-success/10", action: handleCallCenter },
            { icon: MessageCircle, label: t.customer.chatLabelC, color: "text-info", bg: "bg-info/10" },
            { icon: Bot, label: t.customer.assistantLabel, color: "text-primary", bg: "bg-primary/10", path: "/assistant" },
          ].map((c, i) => (
            <button key={i} onClick={() => { if (c.action) c.action(); else if (c.path) navigate(c.path); }}
              disabled={callingAgent || (c.action ? inAppCall.isInCall : false)}
              className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary/20 disabled:opacity-50">
              <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center`}><c.icon className={`w-6 h-6 ${c.color}`} /></div>
              <span className="text-xs text-foreground">{c.label}</span>
            </button>
          ))}
        </div>

        <h3 className="text-foreground font-bold mb-3">{t.customer.faqTitle}</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="glass-card rounded-xl overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-4 flex items-center justify-between">
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm text-foreground">{faq.q}</span>
              </button>
              {openFaq === i && <div className="px-4 pb-4"><p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{faq.a}</p></div>}
            </div>
          ))}
        </div>

        <div className="glass-card rounded-xl p-4 mt-6 space-y-3">
          <h3 className="text-foreground font-bold text-sm">{t.customer.sendComplaintTitle}</h3>
          <Input placeholder={t.customer.subjectPlaceholder} value={subject} onChange={e => setSubject(e.target.value)} className="bg-secondary border-border rounded-xl" />
          <Textarea placeholder={t.customer.messagePlaceholder} value={message} onChange={e => setMessage(e.target.value)} className="bg-secondary border-border rounded-xl min-h-[100px]" />
          <Button onClick={handleSend} disabled={sending} className="w-full gradient-primary text-primary-foreground rounded-xl">
            <Send className="w-4 h-4 ml-2" /> {t.driver.sendBtn}
          </Button>
        </div>
      </div>

      <InAppCallDialog
        incomingCall={inAppCall.incomingCall}
        activeCall={inAppCall.activeCall}
        localStream={inAppCall.localStream}
        remoteStream={inAppCall.remoteStream}
        isMuted={inAppCall.isMuted}
        isVideoEnabled={inAppCall.isVideoEnabled}
        callDuration={inAppCall.callDuration}
        connectionQuality={inAppCall.connectionQuality}
        busy={inAppCall.busy}
        onAccept={inAppCall.acceptCall}
        
        onEnd={inAppCall.endCall}
        onToggleMute={inAppCall.toggleMute}
        onToggleVideo={inAppCall.toggleVideo}
      />
    </div>
  );
};

export default ClientSupport;
