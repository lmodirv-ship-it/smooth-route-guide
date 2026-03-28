import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone,
  PhoneOff,
  PhoneIncoming,
  Clock,
  User,
  Mic,
  MicOff,
  Pause,
  Play,
  MessageCircle,
  FileText,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const formatTimer = (value: number) => {
  const minutes = Math.floor(value / 60).toString().padStart(2, "0");
  const seconds = (value % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const formatWait = (value?: string) => {
  if (!value) return "00:00";
  const diffSeconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  return formatTimer(diffSeconds);
};

const IncomingCalls = () => {
  const [calls, setCalls] = useState<any[]>([]);
  const [activeCall, setActiveCall] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [ending, setEnding] = useState(false);

  const fetchCalls = useCallback(async () => {
    const { data } = await supabase.from("call_logs").select("*").order("created_at", { ascending: false }).limit(50);
    const nextCalls = data || [];
    setCalls(nextCalls);
    setActiveCall((current) => (current && nextCalls.some((call) => call.id === current) ? current : nextCalls[0]?.id || null));
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchCalls();
    const channel = supabase
      .channel("incoming-calls-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, fetchCalls)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCalls]);

  const currentCall = useMemo(() => calls.find((call) => call.id === activeCall) || null, [activeCall, calls]);

  useEffect(() => {
    setNotes(currentCall?.notes || "");
    setElapsedSeconds(Number(currentCall?.duration || 0));
    setMuted(false);
    setOnHold(false);
  }, [currentCall?.id]);

  useEffect(() => {
    if (!currentCall || onHold) return;
    const timer = window.setInterval(() => {
      setElapsedSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [currentCall, onHold]);

  const handleSelectCall = async (call: any) => {
    setActiveCall(call.id);
    if (call.status === "pending") {
      await supabase.from("call_logs").update({ status: "answered" }).eq("id", call.id);
      await fetchCalls();
    }
  };

  const handleEndCall = async () => {
    if (!currentCall) return;
    setEnding(true);
    await supabase.from("call_logs").update({
      status: "answered",
      duration: elapsedSeconds,
      notes: notes.trim(),
    }).eq("id", currentCall.id);
    toast({ title: "تم حفظ بيانات المكالمة" });
    setEnding(false);
    setActiveCall(null);
    await fetchCalls();
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">{calls.length} مكالمة واردة</span>
        </div>
        <h1 className="text-xl font-bold text-foreground">المكالمات الواردة</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 space-y-2">
          <h2 className="text-foreground font-bold text-sm mb-2">قائمة الانتظار</h2>
          {calls.map((call) => (
            <motion.div
              key={call.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`gradient-card rounded-xl p-3 border transition-all cursor-pointer ${activeCall === call.id ? "border-primary glow-ring-orange" : "border-border hover:border-primary/20"}`}
              onClick={() => void handleSelectCall(call)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  call.reason === "emergency" || call.status === "urgent" ? "bg-destructive/10 text-destructive animate-pulse" : call.status === "pending" ? "bg-warning/10 text-warning" : "bg-info/10 text-info"
                }`}>{call.status || "pending"}</span>
                <div className="flex items-center gap-2">
                  <PhoneIncoming className={`w-3.5 h-3.5 ${call.status === "pending" ? "text-primary" : "text-info"}`} />
                  <span className="text-foreground font-medium text-sm">{call.caller_name || "متصل"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground gap-2">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatWait(call.created_at)}</span>
                <span className="truncate">{call.reason || "استفسار"} • {call.caller_phone}</span>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {currentCall ? (
              <motion.div key={currentCall.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="rounded-2xl p-5 mb-4 gradient-primary glow-primary">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary-foreground animate-pulse" />
                      <span className="text-primary-foreground text-sm font-medium">مكالمة جارية • {formatTimer(elapsedSeconds)}</span>
                    </div>
                    <div className="text-right text-primary-foreground">
                      <p className="font-bold text-lg">{currentCall.caller_name || "متصل"}</p>
                      <p className="text-sm opacity-70">{currentCall.caller_phone}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-lg" onClick={() => setMuted(!muted)}>
                      {muted ? <MicOff className="w-4 h-4 ml-1" /> : <Mic className="w-4 h-4 ml-1" />}
                      {muted ? "إلغاء الكتم" : "كتم"}
                    </Button>
                    <Button size="sm" className="bg-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/30 rounded-lg" onClick={() => setOnHold(!onHold)}>
                      {onHold ? <Play className="w-4 h-4 ml-1" /> : <Pause className="w-4 h-4 ml-1" />}
                      {onHold ? "استئناف" : "انتظار"}
                    </Button>
                    <Button size="sm" className="bg-destructive text-destructive-foreground rounded-lg" onClick={() => void handleEndCall()} disabled={ending}>
                      <PhoneOff className="w-4 h-4 ml-1" /> إنهاء
                    </Button>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4 mb-4">
                  <h3 className="text-foreground font-bold text-sm mb-3">معلومات المتصل</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "الاسم", value: currentCall.caller_name || "—" },
                      { label: "الهاتف", value: currentCall.caller_phone || "—" },
                      { label: "نوع الطلب", value: currentCall.reason || "—" },
                      { label: "الحالة", value: currentCall.status || "—" },
                      { label: "النوع", value: currentCall.call_type || "incoming" },
                      { label: "المدة", value: formatTimer(elapsedSeconds) },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{item.value}</span>
                        <span className="text-xs text-foreground font-medium">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4 mb-4">
                  <h3 className="text-foreground font-bold text-sm mb-2">ملاحظات المكالمة</h3>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="اكتب ملاحظاتك هنا..."
                    className="bg-secondary/50 border-border rounded-lg text-right min-h-[80px] text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { icon: FileText, label: "إنشاء تذكرة", color: "text-info" },
                    { icon: MessageCircle, label: "إرسال رسالة", color: "text-success" },
                    { icon: Phone, label: "تحويل المكالمة", color: "text-warning" },
                    { icon: User, label: "بيانات العميل", color: "text-primary" },
                  ].map((action, index) => (
                    <button key={index} className="glass-card rounded-xl p-3 flex flex-col items-center gap-1.5 hover:border-primary/30 transition-colors">
                      <action.icon className={`w-5 h-5 ${action.color}`} />
                      <span className="text-xs text-foreground">{action.label}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl p-12 text-center">
                <PhoneIncoming className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-foreground font-bold">اختر مكالمة للرد عليها</p>
                <p className="text-sm text-muted-foreground mt-1">ستظهر بيانات المكالمات الحقيقية هنا.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default IncomingCalls;
