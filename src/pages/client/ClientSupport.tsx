import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Phone, MessageCircle, Bot, HelpCircle, ChevronDown, ChevronUp, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const ClientSupport = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "كيف أحجز رحلة؟", a: "من الصفحة الرئيسية، أدخل وجهتك ثم اختر السائق واضغط تأكيد الحجز." },
    { q: "كيف أشحن محفظتي؟", a: "اذهب للمحفظة → شحن المحفظة → اختر المبلغ أو أدخل مبلغ مخصص." },
    { q: "كيف ألغي رحلة؟", a: "من صفحة تتبع الرحلة، اضغط زر إلغاء الرحلة. قد يتم خصم رسوم في بعض الحالات." },
    { q: "ماذا أفعل إذا نسيت شيئاً في السيارة؟", a: "تواصل معنا عبر الدعم وسنساعدك في التواصل مع السائق." },
  ];

  return (
    <div className="min-h-screen gradient-dark pb-24" dir="rtl">
      <div className="glass-strong sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <button onClick={() => navigate(-1)}><ArrowRight className="w-5 h-5 text-muted-foreground" /></button>
        <span className="font-bold text-foreground">الدعم</span>
        <HelpCircle className="w-5 h-5 text-primary" />
      </div>

      <div className="px-4 mt-4">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { icon: Phone, label: "اتصل بنا", color: "text-success", bg: "bg-success/10" },
            { icon: MessageCircle, label: "محادثة", color: "text-info", bg: "bg-info/10" },
            { icon: Bot, label: "المساعد", color: "text-primary", bg: "bg-primary/10", path: "/assistant" },
          ].map((c, i) => (
            <button key={i} onClick={() => c.path && navigate(c.path)}
              className="gradient-card rounded-xl p-4 border border-border flex flex-col items-center gap-2 hover:border-primary/20">
              <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center`}>
                <c.icon className={`w-6 h-6 ${c.color}`} />
              </div>
              <span className="text-xs text-foreground">{c.label}</span>
            </button>
          ))}
        </div>

        <h3 className="text-foreground font-bold mb-3">الأسئلة الشائعة</h3>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="gradient-card rounded-xl border border-border overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full p-4 flex items-center justify-between">
                {openFaq === i ? <ChevronUp className="w-4 h-4 text-primary" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                <span className="text-sm text-foreground">{faq.q}</span>
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-muted-foreground bg-secondary/50 rounded-lg p-3">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="gradient-card rounded-xl p-4 border border-border mt-6 space-y-3">
          <h3 className="text-foreground font-bold text-sm">أرسل شكوى أو اقتراح</h3>
          <Input placeholder="الموضوع" className="bg-secondary border-border rounded-xl text-right" />
          <Textarea placeholder="اكتب رسالتك..." className="bg-secondary border-border rounded-xl text-right min-h-[100px]" />
          <Button className="w-full gradient-primary text-primary-foreground rounded-xl"><Send className="w-4 h-4 ml-2" /> إرسال</Button>
        </div>
      </div>
    </div>
  );
};

export default ClientSupport;
