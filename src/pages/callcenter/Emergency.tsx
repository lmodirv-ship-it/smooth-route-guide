import { AlertTriangle, Phone, MapPin, Clock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";

const Emergency = () => {
  const emergencies = [
    { id: 1, type: "حادث", client: "عبدالله أحمد", driver: "أحمد الفاسي", location: "طريق الدار البيضاء - الرباط كم 45", time: "منذ 5 دقائق", status: "نشط" },
    { id: 2, type: "تهديد", client: "فاطمة محمد", driver: "غير معروف", location: "حي الحسني", time: "منذ 12 دقيقة", status: "قيد المعالجة" },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-6 h-6 text-destructive" />
        <h1 className="text-xl font-bold text-destructive">حالات الطوارئ</h1>
      </div>

      {emergencies.length === 0 ? (
        <div className="gradient-card rounded-2xl p-12 border border-border text-center">
          <Shield className="w-16 h-16 text-success mx-auto mb-3" />
          <p className="text-foreground font-bold">لا توجد حالات طوارئ نشطة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {emergencies.map(e => (
            <div key={e.id} className="gradient-card rounded-xl p-4 border border-destructive/30 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-1 h-full bg-destructive" />
              <div className="flex items-start justify-between mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${e.status === "نشط" ? "bg-destructive/10 text-destructive animate-pulse" : "bg-warning/10 text-warning"}`}>{e.status}</span>
                <div className="text-right">
                  <p className="text-foreground font-bold">{e.type}</p>
                  <p className="text-xs text-muted-foreground">العميل: {e.client} • السائق: {e.driver}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                <MapPin className="w-3 h-3" /> {e.location}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <Button size="sm" className="bg-destructive text-destructive-foreground rounded-lg text-xs"><Phone className="w-3 h-3 ml-1" /> اتصال طوارئ</Button>
                  <Button size="sm" variant="outline" className="border-warning text-warning rounded-lg text-xs"><MapPin className="w-3 h-3 ml-1" /> تتبع</Button>
                </div>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> {e.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Emergency;
