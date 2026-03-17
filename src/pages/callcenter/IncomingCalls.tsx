import { useState } from "react";
import { Phone, PhoneOff, Clock, User, Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";

const IncomingCalls = () => {
  const [activeCall, setActiveCall] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);

  const calls = [
    { id: 1, caller: "عبدالله أحمد", phone: "+212 6XX-XXX-001", type: "طلب رحلة", wait: "0:45", priority: "عادي" },
    { id: 2, caller: "فاطمة محمد", phone: "+212 6XX-XXX-002", type: "شكوى", wait: "2:12", priority: "عالي" },
    { id: 3, caller: "خالد العمري", phone: "+212 6XX-XXX-003", type: "استفسار", wait: "0:30", priority: "عادي" },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">المكالمات الواردة</h1>

      {activeCall && (
        <div className="gradient-primary rounded-2xl p-6 mb-4 glow-primary">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-primary-foreground/30 text-primary-foreground" onClick={() => setMuted(!muted)}>
                {muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button size="sm" className="bg-destructive text-destructive-foreground" onClick={() => setActiveCall(null)}>
                <PhoneOff className="w-4 h-4 ml-1" /> إنهاء
              </Button>
            </div>
            <div className="text-right text-primary-foreground">
              <p className="font-bold">{calls.find(c => c.id === activeCall)?.caller}</p>
              <div className="flex items-center gap-2 justify-end mt-1">
                <span className="text-sm opacity-70">مكالمة جارية</span>
                <div className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {calls.map((call) => (
          <div key={call.id} className={`gradient-card rounded-xl p-4 border ${activeCall === call.id ? "border-primary" : "border-border"} flex items-center justify-between`}>
            <div className="flex gap-2">
              <Button size="sm" className="gradient-primary text-primary-foreground rounded-lg" onClick={() => setActiveCall(call.id)}>
                <Phone className="w-4 h-4 ml-1" /> رد
              </Button>
              <Button size="sm" variant="outline" className="border-destructive text-destructive rounded-lg">
                <PhoneOff className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-foreground font-medium text-sm">{call.caller}</p>
                <p className="text-xs text-muted-foreground">{call.type}</p>
                <div className="flex items-center gap-2 justify-end mt-1">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${call.priority === "عالي" ? "bg-destructive/10 text-destructive" : "bg-info/10 text-info"}`}>{call.priority}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {call.wait}</span>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IncomingCalls;
