import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, PhoneOff, PhoneIncoming, Clock, User, Mic, MicOff,
  Volume2, VolumeX, Pause, Play, MessageCircle, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const IncomingCalls = () => {
  const [activeCall, setActiveCall] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [callTimer, setCallTimer] = useState("00:00");
  const [notes, setNotes] = useState("");

  const calls = [
    { id: 1, caller: "عبدالله أحمد", phone: "+212 661-XXX-001", type: "طلب رحلة", wait: "0:45", priority: "عادي", location: "حي المعاريف" },
    { id: 2, caller: "فاطمة محمد", phone: "+212 662-XXX-002", type: "شكوى", wait: "2:12", priority: "عالي", location: "حي الحسني" },
    { id: 3, caller: "خالد العمري", phone: "+212 663-XXX-003", type: "استفسار", wait: "0:30", priority: "عادي", location: "غير معروف" },
    { id: 4, caller: "نورة السعيد", phone: "+212 664-XXX-004", type: "طوارئ", wait: "0:15", priority: "عاجل", location: "طريق الدار البيضاء" },
    { id: 5, caller: "محمد البكري", phone: "+212 665-XXX-005", type: "طلب رحلة", wait: "1:05", priority: "عادي", location: "محطة القطار" },
  ];

  const currentCall = calls.find(c => c.id === activeCall);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{calls.length} مكالمة واردة</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">المكالمات الواردة</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Call Queue */}
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-foreground font-bold text-sm mb-2">قائمة الانتظار</h2>
          {calls.map((call) => (
            <motion.div
              key={call.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`gradient-card rounded-xl p-3 border transition-all cursor-pointer ${
                activeCall === call.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"
              }`}
              onClick={() => setActiveCall(call.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  call.priority === "عاجل" ? "bg-destructive/10 text-destructive animate-pulse" :
                  call.priority === "عالي" ? "bg-warning/10 text-warning" :
                  "bg-info/10 text-info"
                }`}>{call.priority}</span>
                <div className="flex items-center gap-2">
                  <PhoneIncoming className={`w-3.5 h-3.5 ${call.priority === "عاجل" ? "text-destructive" : "text-primary"}`} />
                  <span className="text-foreground font-medium text-sm">{call.caller}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {call.wait}</span>
                <span>{call.type} • {call.phone}</span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call Detail / Active Call */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {currentCall ? (
              <motion.div key={currentCall.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Active Call Banner */}
                {activeCall && (
                  <div className={`rounded-2xl p-5 mb-4 ${activeCall ? "gradient-primary glow-primary" : "gradient-card border border-border"}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-primary-foreground animate-pulse" />
                        <span className="text-primary-foreground text-sm font-medium">مكالمة جارية • {callTimer}</span>
                      </div>
                      <div className="text-right text-primary-foreground">
                        <p className="font-bold text-lg">{currentCall.caller}</p>
                        <p className="text-sm opacity-70">{currentCall.phone}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-lg"
                        onClick={() => setMuted(!muted)}>
                        {muted ? <MicOff className="w-4 h-4 ml-1" /> : <Mic className="w-4 h-4 ml-1" />}
                        {muted ? "إلغاء الكتم" : "كتم"}
                      </Button>
                      <Button size="sm" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-lg"
                        onClick={() => setOnHold(!onHold)}>
                        {onHold ? <Play className="w-4 h-4 ml-1" /> : <Pause className="w-4 h-4 ml-1" />}
                        {onHold ? "استئناف" : "انتظار"}
                      </Button>
                      <Button size="sm" className="bg-destructive text-destructive-foreground rounded-lg"
                        onClick={() => setActiveCall(null)}>
                        <PhoneOff className="w-4 h-4 ml-1" /> إنهاء
                      </Button>
                    </div>
                  </div>
                )}

                {/* Call Info */}
                <div className="gradient-card rounded-xl p-4 border border-border mb-4">
                  <h3 className="text-foreground font-bold text-sm mb-3">معلومات المتصل</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "الاسم", value: currentCall.caller },
                      { label: "الهاتف", value: currentCall.phone },
                      { label: "نوع الطلب", value: currentCall.type },
                      { label: "الموقع", value: currentCall.location },
                      { label: "وقت الانتظار", value: currentCall.wait },
                      { label: "الأولوية", value: currentCall.priority },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.value}</span>
                        <span className="text-xs text-foreground font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div className="gradient-card rounded-xl p-4 border border-border mb-4">
                  <h3 className="text-foreground font-bold text-sm mb-2">ملاحظات المكالمة</h3>
                  <Textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="اكتب ملاحظاتك هنا..."
                    className="bg-secondary/50 border-border rounded-lg text-right min-h-[80px] text-sm"
                  />
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { icon: FileText, label: "إنشاء تذكرة", color: "text-info" },
                    { icon: MessageCircle, label: "إرسال رسالة", color: "text-success" },
                    { icon: Phone, label: "تحويل المكالمة", color: "text-warning" },
                    { icon: User, label: "بيانات العميل", color: "text-primary" },
                  ].map((action, i) => (
                    <button key={i} className="gradient-card rounded-xl p-3 border border-border flex flex-col items-center gap-1.5 hover:border-primary/30 transition-colors">
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                      <span className="text-xs text-foreground">{action.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="gradient-card rounded-2xl p-12 border border-border text-center">
                <PhoneIncoming className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-foreground font-bold">اختر مكالمة للرد عليها</p>
                <p className="text-sm text-muted-foreground mt-1">اضغط على أي مكالمة من القائمة لعرض التفاصيل</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default IncomingCalls;
