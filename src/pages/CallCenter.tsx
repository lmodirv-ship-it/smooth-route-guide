import { useState } from "react";
import { motion } from "framer-motion";
import {
  Phone, PhoneOff, Headphones, User, Clock, Search,
  MessageCircle, Star, MapPin, AlertCircle, CheckCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logo from "@/assets/hn-driver-logo.png";

const CallCenter = () => {
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);

  const tickets = [
    { id: 1, caller: "عبدالله أحمد", type: "شكوى", status: "مفتوح", priority: "عالي", time: "١٠:٣٠ ص", desc: "تأخر السائق عن الموعد" },
    { id: 2, caller: "فاطمة محمد", type: "استفسار", status: "قيد المعالجة", priority: "متوسط", time: "١١:١٥ ص", desc: "استفسار عن طريقة الدفع" },
    { id: 3, caller: "خالد العمري", type: "دعم فني", status: "مغلق", priority: "منخفض", time: "٩:٤٥ ص", desc: "مشكلة في تحديث التطبيق" },
    { id: 4, caller: "نورة السعيد", type: "شكوى", status: "مفتوح", priority: "عالي", time: "١٢:٠٠ م", desc: "سائق غير ملتزم بالمسار" },
  ];

  const agentStats = [
    { label: "المكالمات اليوم", value: "٢٣" },
    { label: "متوسط المدة", value: "٤:٣٠ د" },
    { label: "التقييم", value: "٤.٧" },
    { label: "الحل من أول اتصال", value: "٨٥%" },
  ];

  return (
    <div className="min-h-screen gradient-dark flex flex-col md:flex-row">
      {/* Sidebar - Ticket List */}
      <div className="w-full md:w-96 glass-strong border-l border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-3">
            <img src={logo} alt="HN" className="w-7 h-7" />
            <span className="font-bold font-display text-gradient-primary">مركز الاتصال</span>
          </div>
          <div className="relative">
            <Input placeholder="بحث..." className="bg-secondary/80 border-border h-9 rounded-lg pr-9 text-right text-sm" />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3 space-y-2">
          {tickets.map((ticket) => (
            <button
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket.id)}
              className={`w-full gradient-card rounded-xl p-3 border text-right transition-all ${
                selectedTicket === ticket.id ? "border-primary/50 glow-ring-orange" : "border-border hover:border-primary/20"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  ticket.priority === "عالي" ? "bg-destructive/10 text-destructive" :
                  ticket.priority === "متوسط" ? "bg-warning/10 text-warning" :
                  "bg-info/10 text-info"
                }`}>{ticket.priority}</span>
                <span className="font-medium text-foreground text-sm">{ticket.caller}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ticket.desc}</p>
              <div className="flex justify-between mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  ticket.status === "مفتوح" ? "bg-warning/10 text-warning" :
                  ticket.status === "قيد المعالجة" ? "bg-info/10 text-info" :
                  "bg-success/10 text-success"
                }`}>{ticket.status}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {ticket.time}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Agent Stats */}
        <div className="glass-strong border-b border-border px-6 py-3">
          <div className="grid grid-cols-4 gap-4">
            {agentStats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold text-foreground">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Ticket Detail */}
        <div className="flex-1 p-6">
          {selectedTicket ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {(() => {
                const ticket = tickets.find(t => t.id === selectedTicket)!;
                return (
                  <div className="max-w-2xl mx-auto">
                    <div className="gradient-card rounded-2xl p-6 border border-border mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => setActiveCall(activeCall ? null : ticket.caller)}
                            className={activeCall ? "bg-destructive" : "gradient-primary text-primary-foreground"}
                          >
                            {activeCall ? <PhoneOff className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                            {activeCall ? "إنهاء" : "اتصال"}
                          </Button>
                          <Button size="sm" variant="outline">
                            <MessageCircle className="w-4 h-4" /> رسالة
                          </Button>
                        </div>
                        <div className="text-right">
                          <h3 className="text-xl font-bold text-foreground">{ticket.caller}</h3>
                          <p className="text-sm text-muted-foreground">{ticket.type} - #{ticket.id}</p>
                        </div>
                      </div>

                      <div className="bg-secondary/50 rounded-xl p-4">
                        <h4 className="text-sm font-medium text-foreground mb-2 text-right">تفاصيل</h4>
                        <p className="text-sm text-muted-foreground text-right">{ticket.desc}</p>
                      </div>

                      {activeCall && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="mt-4 gradient-primary rounded-xl p-4 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-primary-foreground animate-pulse" />
                            <span className="text-primary-foreground text-sm font-medium">مكالمة جارية</span>
                          </div>
                          <span className="text-primary-foreground font-bold">٠٢:٣٤</span>
                        </motion.div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: CheckCircle, label: "حل", color: "text-success" },
                        { icon: AlertCircle, label: "تصعيد", color: "text-warning" },
                        { icon: User, label: "بيانات العميل", color: "text-info" },
                      ].map((action, i) => (
                        <button key={i} className="gradient-card rounded-xl p-4 border border-border flex flex-col items-center gap-2 hover:border-primary/30 transition-colors">
                          <action.icon className={`w-6 h-6 ${action.color}`} />
                          <span className="text-sm text-foreground">{action.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center">
              <div>
                <Headphones className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">اختر تذكرة لعرض التفاصيل</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CallCenter;
