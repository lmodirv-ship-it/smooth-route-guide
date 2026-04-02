import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, PhoneCall, HelpCircle, ChevronDown, ChevronUp, Send, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n/context";
import { supabase } from "@/integrations/supabase/client";
import { useInAppCall } from "@/hooks/useInAppCall";
import InAppCallDialog from "@/components/calls/InAppCallDialog";

const DriverSupport = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"faq" | "contact">("faq");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [callingAgent, setCallingAgent] = useState(false);
  const inAppCall = useInAppCall();

  const faqs = [
    { q: t.driver.faq1q, a: t.driver.faq1a },
    { q: t.driver.faq2q, a: t.driver.faq2a },
    { q: t.driver.faq3q, a: t.driver.faq3a },
    { q: t.driver.faq4q, a: t.driver.faq4a },
    { q: t.driver.faq5q, a: t.driver.faq5a },
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

  const handleSendMessage = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast({ title: "يرجى تسجيل الدخول", variant: "destructive" }); return; }

      await supabase.from("complaints").insert({
        user_id: user.id,
        category: "support",
        description: `${subject}: ${message}`,
        status: "open",
        priority: "medium",
      });

      toast({ title: "تم إرسال رسالتك ✅" });
      setSubject("");
      setMessage("");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen gradient-dark pb-6" dir={dir}>
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">{t.driver.supportHelpTitle}</span>
        <HelpCircle className="w-5 h-5 text-primary" />
      </div>

      <div className="px-4 mt-4">
        <div className="flex gap-2 mb-4">
          {([["faq", t.driver.faqTab], ["contact", t.driver.contactUsTab]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveTab(key as any)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
              {label}
            </button>
          ))}
        </div>

        {activeTab === "faq" && (
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className="glass-card rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-4 flex items-center justify-between">
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-primary flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
                  <span className="text-sm text-foreground font-medium">{faq.q}</span>
                </button>
                {openFaq === i && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} className="px-4 pb-4">
                    <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{faq.a}</p>
                  </motion.div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === "contact" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: PhoneCall, label: t.driver.callLabel, color: "text-success", bg: "bg-success/10", action: handleCallCenter },
                { icon: MessageCircle, label: t.driver.chatLabel, color: "text-info", bg: "bg-info/10" },
                { icon: Bot, label: t.customer.aiAssistant, color: "text-primary", bg: "bg-primary/10", path: "/assistant" },
              ].map((c, i) => (
                <button key={i} onClick={() => { if (c.action) c.action(); else if (c.path) navigate(c.path); }}
                  disabled={callingAgent || (c.action ? inAppCall.isInCall : false)}
                  className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary/20 transition-colors disabled:opacity-50">
                  <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center`}>
                    <c.icon className={`w-6 h-6 ${c.color}`} />
                  </div>
                  <span className="text-xs text-foreground">{c.label}</span>
                </button>
              ))}
            </div>

            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="text-foreground font-bold text-sm">{t.driver.sendMessageTitle}</h3>
              <Input placeholder={t.driver.subjectField} value={subject} onChange={e => setSubject(e.target.value)} className="bg-secondary border-border rounded-xl" />
              <Textarea placeholder={t.driver.writeMessageHere} value={message} onChange={e => setMessage(e.target.value)} className="bg-secondary border-border rounded-xl min-h-[120px]" />
              <Button onClick={handleSendMessage} disabled={sending} className="w-full gradient-primary text-primary-foreground rounded-xl">
                {sending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <Send className="w-4 h-4 ml-2" />}
                {t.driver.sendBtn}
              </Button>
            </div>
          </div>
        )}
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

export default DriverSupport;
