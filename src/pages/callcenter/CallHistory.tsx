import { useState } from "react";
import { Clock, Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, User, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

const CallHistory = () => {
  const [filter, setFilter] = useState<"all" | "answered" | "missed" | "outgoing">("all");
  const [query, setQuery] = useState("");

  const calls = [
    { id: 1, caller: "عبدالله أحمد", phone: "+212 661-001", type: "واردة", status: "تم الرد", duration: "4:32", agent: "سارة", time: "14:30", date: "اليوم", subject: "طلب رحلة" },
    { id: 2, caller: "فاطمة محمد", phone: "+212 662-002", type: "واردة", status: "تم الرد", duration: "6:15", agent: "أحمد", time: "13:45", date: "اليوم", subject: "شكوى" },
    { id: 3, caller: "خالد العمري", phone: "+212 663-003", type: "واردة", status: "فائتة", duration: "-", agent: "-", time: "12:20", date: "اليوم", subject: "-" },
    { id: 4, caller: "نورة السعيد", phone: "+212 664-004", type: "صادرة", status: "تم الرد", duration: "2:48", agent: "سارة", time: "11:30", date: "اليوم", subject: "متابعة شكوى" },
    { id: 5, caller: "محمد البكري", phone: "+212 665-005", type: "واردة", status: "تم الرد", duration: "1:15", agent: "يوسف", time: "10:00", date: "اليوم", subject: "استفسار" },
    { id: 6, caller: "عائشة المنصوري", phone: "+212 666-006", type: "واردة", status: "فائتة", duration: "-", agent: "-", time: "09:30", date: "اليوم", subject: "-" },
    { id: 7, caller: "سعيد بنعمر", phone: "+212 667-007", type: "صادرة", status: "تم الرد", duration: "3:20", agent: "أحمد", time: "18:00", date: "أمس", subject: "تأكيد موعد" },
    { id: 8, caller: "كريمة العلوي", phone: "+212 668-008", type: "واردة", status: "تم الرد", duration: "5:42", agent: "ليلى", time: "16:30", date: "أمس", subject: "مشكلة دفع" },
  ];

  const filtered = calls.filter(c => {
    if (filter === "answered" && c.status !== "تم الرد") return false;
    if (filter === "missed" && c.status !== "فائتة") return false;
    if (filter === "outgoing" && c.type !== "صادرة") return false;
    if (query && !c.caller.includes(query) && !c.phone.includes(query)) return false;
    return true;
  });

  const getIcon = (type: string, status: string) => {
    if (status === "فائتة") return <PhoneMissed className="w-4 h-4 text-destructive" />;
    if (type === "صادرة") return <PhoneOutgoing className="w-4 h-4 text-info" />;
    return <PhoneIncoming className="w-4 h-4 text-success" />;
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">سجل المكالمات</h1>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="ابحث بالاسم أو الرقم..." className="bg-secondary border-border rounded-xl pr-9 text-right" />
        </div>
        <div className="flex gap-2">
          {([["all", "الكل"], ["answered", "تم الرد"], ["missed", "فائتة"], ["outgoing", "صادرة"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                filter === key ? "gradient-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              }`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="gradient-card rounded-xl border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[600px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <td className="p-3">الموضوع</td>
              <td className="p-3">الوكيل</td>
              <td className="p-3">المدة</td>
              <td className="p-3">الحالة</td>
              <td className="p-3">الوقت</td>
              <td className="p-3">الهاتف</td>
              <td className="p-3 text-right">المتصل</td>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="p-3 text-muted-foreground text-xs">{c.subject}</td>
                <td className="p-3 text-foreground text-xs">{c.agent}</td>
                <td className="p-3 text-muted-foreground text-xs">{c.duration}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1.5">
                    {getIcon(c.type, c.status)}
                    <span className={`text-xs ${c.status === "فائتة" ? "text-destructive" : "text-foreground"}`}>{c.status}</span>
                  </div>
                </td>
                <td className="p-3 text-muted-foreground text-xs">{c.date} {c.time}</td>
                <td className="p-3 text-muted-foreground text-xs font-mono">{c.phone}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-foreground text-xs font-medium">{c.caller}</span>
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">لا توجد نتائج</div>
      )}
    </div>
  );
};

export default CallHistory;
