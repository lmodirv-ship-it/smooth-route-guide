import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Phone, Calendar, User, Wifi, WifiOff, Loader2, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DayLog {
  date: string;
  totalSeconds: number;
  sessions: number;
  callsCount: number;
  actionsCount: number;
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}س ${m}د`;
};

const SupervisorAgentDetail = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [dayLogs, setDayLogs] = useState<DayLog[]>([]);
  const [latestStatus, setLatestStatus] = useState("offline");
  const [monthOffset, setMonthOffset] = useState(0);

  const currentMonth = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - monthOffset);
    return d;
  }, [monthOffset]);

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString("ar-MA", { month: "long", year: "numeric" });
  }, [currentMonth]);

  useEffect(() => {
    if (!agentId) return;
    const fetchData = async () => {
      setLoading(true);
      const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

      const [profileRes, presenceRes, sessionsRes, callsRes] = await Promise.all([
        supabase.from("profiles").select("id, name, email, user_code, phone").eq("id", agentId).single(),
        supabase.from("agent_presence_log")
          .select("present_start, present_end, duration_seconds")
          .eq("user_id", agentId)
          .gte("present_start", monthStart.toISOString())
          .lte("present_start", monthEnd.toISOString()),
        supabase.from("agent_sessions")
          .select("login_at, logout_at, status, actions_count")
          .eq("user_id", agentId)
          .gte("login_at", monthStart.toISOString())
          .lte("login_at", monthEnd.toISOString())
          .order("login_at", { ascending: false }),
        supabase.from("call_logs")
          .select("created_at")
          .eq("agent_id", agentId)
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString()),
      ]);

      setProfile(profileRes.data);

      // Latest status
      const latestSession = (sessionsRes.data || [])[0];
      setLatestStatus(latestSession?.status || "offline");

      // Group presence by day
      const dayMap = new Map<string, { seconds: number; sessions: number; calls: number; actions: number }>();

      for (const log of presenceRes.data || []) {
        const day = new Date(log.present_start).toISOString().split("T")[0];
        const entry = dayMap.get(day) || { seconds: 0, sessions: 0, calls: 0, actions: 0 };
        const dur = log.duration_seconds || 
          (log.present_end ? 0 : Math.floor((Date.now() - new Date(log.present_start).getTime()) / 1000));
        entry.seconds += dur;
        dayMap.set(day, entry);
      }

      // Count sessions per day
      for (const s of sessionsRes.data || []) {
        const day = new Date(s.login_at).toISOString().split("T")[0];
        const entry = dayMap.get(day) || { seconds: 0, sessions: 0, calls: 0, actions: 0 };
        entry.sessions += 1;
        entry.actions += s.actions_count || 0;
        dayMap.set(day, entry);
      }

      // Count calls per day
      for (const c of callsRes.data || []) {
        const day = new Date(c.created_at).toISOString().split("T")[0];
        const entry = dayMap.get(day) || { seconds: 0, sessions: 0, calls: 0, actions: 0 };
        entry.calls += 1;
        dayMap.set(day, entry);
      }

      const logs: DayLog[] = Array.from(dayMap.entries())
        .map(([date, v]) => ({
          date,
          totalSeconds: v.seconds,
          sessions: v.sessions,
          callsCount: v.calls,
          actionsCount: v.actions,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));

      setDayLogs(logs);
      setLoading(false);
    };
    fetchData();
  }, [agentId, currentMonth]);

  const totalMonthSeconds = useMemo(() => dayLogs.reduce((s, d) => s + d.totalSeconds, 0), [dayLogs]);
  const totalMonthCalls = useMemo(() => dayLogs.reduce((s, d) => s + d.callsCount, 0), [dayLogs]);
  const totalMonthActions = useMemo(() => dayLogs.reduce((s, d) => s + d.actionsCount, 0), [dayLogs]);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (!profile) {
    return <div className="text-center py-20 text-muted-foreground">الموظف غير موجود</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5" dir="rtl">
      {/* Back button */}
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
        <ArrowRight className="w-4 h-4" />
        رجوع
      </Button>

      {/* Profile header */}
      <Card className="border-border">
        <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-foreground">{profile.name || "—"}</h2>
              <Badge variant="outline" className="font-mono text-xs">{profile.user_code}</Badge>
              {latestStatus === "online" ? (
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                  <Wifi className="w-3 h-3" /> متصل
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <WifiOff className="w-3 h-3" /> غير متصل
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">{profile.email}</p>
            {profile.phone && <p className="text-sm text-muted-foreground">{profile.phone}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Month stats */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(o => o + 1)}>→</Button>
          <span className="text-sm font-semibold text-foreground">{monthLabel}</span>
          <Button variant="outline" size="sm" onClick={() => setMonthOffset(o => Math.max(0, o - 1))} disabled={monthOffset === 0}>←</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "إجمالي ساعات العمل", value: formatDuration(totalMonthSeconds), icon: Clock, color: "text-primary", bg: "bg-primary/10" },
          { label: "أيام العمل", value: dayLogs.length, icon: Calendar, color: "text-blue-500", bg: "bg-blue-500/10" },
          { label: "المكالمات", value: totalMonthCalls, icon: Phone, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "الإجراءات", value: totalMonthActions, icon: Activity, color: "text-orange-500", bg: "bg-orange-500/10" },
        ].map(s => (
          <Card key={s.label} className="border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily breakdown */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">التفاصيل اليومية</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-right font-semibold">التاريخ</TableHead>
                <TableHead className="text-center font-semibold">ساعات العمل</TableHead>
                <TableHead className="text-center font-semibold">الجلسات</TableHead>
                <TableHead className="text-center font-semibold">المكالمات</TableHead>
                <TableHead className="text-center font-semibold">الإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dayLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                    لا توجد بيانات لهذا الشهر
                  </TableCell>
                </TableRow>
              ) : dayLogs.map(d => (
                <TableRow key={d.date} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="text-right font-medium">
                    {new Date(d.date).toLocaleDateString("ar-MA", { weekday: "short", day: "numeric", month: "short" })}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-3 h-3 text-primary" />
                      <span className="font-semibold text-sm">{formatDuration(d.totalSeconds)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">{d.sessions}</TableCell>
                  <TableCell className="text-center text-sm">{d.callsCount}</TableCell>
                  <TableCell className="text-center text-sm">{d.actionsCount}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SupervisorAgentDetail;
