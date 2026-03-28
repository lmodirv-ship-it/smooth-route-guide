import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, MessageCircle, Phone, Mail, HelpCircle, ChevronDown, ChevronUp, Send, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/context";

const DriverSupport = () => {
  const navigate = useNavigate();
  const { t, dir } = useI18n();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"faq" | "contact">("faq");

  const faqs = [
    { q: t.driver.faq1q, a: t.driver.faq1a },
    { q: t.driver.faq2q, a: t.driver.faq2a },
    { q: t.driver.faq3q, a: t.driver.faq3a },
    { q: t.driver.faq4q, a: t.driver.faq4a },
    { q: t.driver.faq5q, a: t.driver.faq5a },
  ];

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
                { icon: Phone, label: t.driver.callLabel, color: "text-success", bg: "bg-success/10" },
                { icon: MessageCircle, label: t.driver.chatLabel, color: "text-info", bg: "bg-info/10" },
                { icon: Bot, label: t.customer.aiAssistant, color: "text-primary", bg: "bg-primary/10", path: "/assistant" },
              ].map((c, i) => (
                <button key={i} onClick={() => c.path && navigate(c.path)}
                  className="glass-card rounded-xl p-4 flex flex-col items-center gap-2 hover:border-primary/20 transition-colors">
                  <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center`}>
                    <c.icon className={`w-6 h-6 ${c.color}`} />
                  </div>
                  <span className="text-xs text-foreground">{c.label}</span>
                </button>
              ))}
            </div>

            <div className="glass-card rounded-xl p-4 space-y-3">
              <h3 className="text-foreground font-bold text-sm">{t.driver.sendMessageTitle}</h3>
              <Input placeholder={t.driver.subjectField} className="bg-secondary border-border rounded-xl" />
              <Textarea placeholder={t.driver.writeMessageHere} className="bg-secondary border-border rounded-xl min-h-[120px]" />
              <Button className="w-full gradient-primary text-primary-foreground rounded-xl">
                <Send className="w-4 h-4 ml-2" /> {t.driver.sendBtn}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverSupport;
