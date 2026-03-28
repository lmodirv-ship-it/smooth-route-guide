import { useCallback, useEffect, useMemo, useState } from "react";
import { TrendingUp, Phone, Clock, Star, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const dayNames = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const CCReports = () => {
  const [loading, setLoading] = useState(true);
  const [callLogs, setCallLogs] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Map<string, string>>(new Map());

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const [callsRes, complaintsRes] = await Promise.all([
      supabase.from("call_logs").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("complaints").select("*").order("created_at", { ascending: false }).limit(300),
    ]);

    const calls = callsRes.data || [];
    const complaintRows = complaintsRes.data || [];
    const agentIds = [...new Set(calls.map((call: any) => call.agent_id).filter(Boolean))];
    const { data: profiles } = agentIds.length ? await supabase.from("profiles").select("id, name").in("id", agentIds) : { data: [] };

    setProfilesMap(new Map((profiles || []).map((profile: any) => [profile.id, profile.name || "وكيل"])));
    setCallLogs(calls);
    setComplaints(complaintRows);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchReports();
    const channel = supabase
      .channel("cc-reports-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "call_logs" }, fetchReports)
      .on("postgres_changes", { event: "*", schema: "public", table: "complaints" }, fetchReports)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchReports]);

  const weeklyData = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const days = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() - (6 - index));
      return {
        key: date.toISOString().slice(0, 10),
        day: dayNames[date.getDay()],
        calls: 0,
        resolved: 0,
        missed: 0,
      };
    });

    const map = new Map(days.map((item) => [item.key, item]));
    callLogs.forEach((call) => {
      const dateKey = call.created_at ? new Date(call.created_at).toISOString().slice(0, 10) : null;
      if (!dateKey || !map.has(dateKey)) return;
      const current = map.get(dateKey)!;
      current.calls += 1;
      if (["answered", "resolved", "completed"].includes(call.status)) current.resolved += 1;
      if (["missed", "unanswered", "rejected"].includes(call.status)) current.missed += 1;
    });

    return days;
  }, [callLogs]);

  const maxCalls = Math.max(...weeklyData.map((item) => item.calls), 1);

  const summaryStats = useMemo(() => {
    const totalCalls = callLogs.length;
    const resolvedCalls = callLogs.filter((call) => ["answered", "resolved", "completed"].includes(call.status)).length;
    const missedCalls = callLogs.filter((call) => ["missed", "unanswered", "rejected"].includes(call.status)).length;
    const avgDuration = totalCalls ? callLogs.reduce((sum, call) => sum + Number(call.duration || 0), 0) / totalCalls : 0;
    const resolutionRate = totalCalls ? Math.round((resolvedCalls / totalCalls) * 100) : 0;
    const satisfaction = totalCalls ? Math.max(0, 100 - Math.round((complaints.length / totalCalls) * 100)) : 100;

    return [
      { icon: Phone, label: "إجمالي المكالمات", value: String(totalCalls), color: "text-primary" },
      { icon: CheckCircle, label: "تم الحل", value: String(resolvedCalls), color: "text-success" },
      { icon: AlertTriangle, label: "الفائتة", value: String(missedCalls), color: "text-destructive" },
      { icon: Clock, label: "متوسط المدة", value: formatDuration(avgDuration), color: "text-warning" },
      { icon: Star, label: "رضا العملاء", value: `${satisfaction}%`, color: "text-success" },
      { icon: TrendingUp, label: "نسبة الحل", value: `${resolutionRate}%`, color: "text-info" },
    ];
  }, [callLogs, complaints.length]);

  const agentPerformance = useMemo(() => {
    const grouped = new Map<string, any>();
    callLogs.forEach((call) => {
      if (!call.agent_id) return;
      if (!grouped.has(call.agent_id)) {
        grouped.set(call.agent_id, {
          id: call.agent_id,
          name: profilesMap.get(call.agent_id) || "وكيل",
          calls: 0,
          totalDuration: 0,
          resolved: 0,
          missed: 0,
        });
      }
      const current = grouped.get(call.agent_id);
      current.calls += 1;
      current.totalDuration += Number(call.duration || 0);
      if (["answered", "resolved", "completed"].includes(call.status)) current.resolved += 1;
      if (["missed", "unanswered", "rejected"].includes(call.status)) current.missed += 1;
    });

    return [...grouped.values()]
      .map((agent) => ({
        ...agent,
        avgTime: formatDuration(agent.calls ? agent.totalDuration / agent.calls : 0),
        satisfaction: `${Math.max(0, 100 - Math.round((agent.missed / Math.max(agent.calls, 1)) * 100))}%`,
        resolvedRate: `${agent.calls ? Math.round((agent.resolved / agent.calls) * 100) : 0}%`,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, 8);
  }, [callLogs, profilesMap]);

  const topIssues = useMemo(() => {
    const grouped = new Map<string, number>();
    callLogs.forEach((call) => {
      const reason = call.reason || "غير محدد";
      grouped.set(reason, (grouped.get(reason) || 0) + 1);
    });

    return [...grouped.entries()]
      .map(([issue, count]) => ({
        issue,
        count,
        pct: `${callLogs.length ? Math.round((count / callLogs.length) * 100) : 0}%`,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [callLogs]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-foreground mb-4">التقارير والإحصائيات</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {summaryStats.map((stat, index) => (
          <div key={index} className="glass-card rounded-xl p-4 text-center">
            <stat.icon className={`w-6 h-6 ${stat.color} mx-auto mb-2`} />
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold text-foreground mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div>
          <h2 className="text-foreground font-bold mb-3">المكالمات الأسبوعية</h2>
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-end gap-2 h-36 mb-2">
              {weeklyData.map((day, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">{day.calls}</span>
                  <div className="w-full rounded-t gradient-primary transition-all" style={{ height: `${(day.calls / maxCalls) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              {weeklyData.map((day, index) => (
                <div key={index} className="flex-1 text-center">
                  <span className="text-[10px] text-muted-foreground">{day.day.slice(0, 3)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-foreground font-bold mb-3">أكثر المواضيع شيوعاً</h2>
          <div className="glass-card rounded-xl p-4 space-y-3">
            {topIssues.map((issue, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{issue.count} ({issue.pct})</span>
                  <span className="text-sm text-foreground">{issue.issue}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full gradient-primary rounded-full" style={{ width: issue.pct }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <h2 className="text-foreground font-bold mb-3">أداء الوكلاء</h2>
      <div className="glass-card rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-border text-muted-foreground text-xs">
              <td className="p-3">الفائتة</td>
              <td className="p-3">نسبة الحل</td>
              <td className="p-3">الرضا</td>
              <td className="p-3">متوسط المدة</td>
              <td className="p-3">المكالمات</td>
              <td className="p-3 text-right">الوكيل</td>
            </tr>
          </thead>
          <tbody>
            {agentPerformance.map((agent) => (
              <tr key={agent.id} className="border-b border-border last:border-0">
                <td className="p-3 text-destructive text-xs">{agent.missed}</td>
                <td className="p-3 text-info text-xs">{agent.resolvedRate}</td>
                <td className="p-3 text-success text-xs">{agent.satisfaction}</td>
                <td className="p-3 text-muted-foreground text-xs">{agent.avgTime}</td>
                <td className="p-3 text-foreground font-medium text-xs">{agent.calls}</td>
                <td className="p-3 text-right text-foreground font-medium">{agent.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CCReports;
