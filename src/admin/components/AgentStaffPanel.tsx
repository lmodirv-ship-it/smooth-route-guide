import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, Clock, Wifi, WifiOff } from "lucide-react";

interface AgentRow {
  userId: string;
  name: string;
  email: string;
  userCode: string;
  status: string;
  loginAt: string | null;
  todaySeconds: number;
}

const formatDuration = (seconds: number) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}س ${m}د`;
};

interface AgentStaffPanelProps {
  onAgentClick?: (userId: string) => void;
}

const AgentStaffPanel = ({ onAgentClick }: AgentStaffPanelProps = {}) => {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    // Get all agent sessions from today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Get users with agent role
    const { data: agentRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "agent");

    if (!agentRoles || agentRoles.length === 0) {
      setAgents([]);
      setLoading(false);
      return;
    }

    const agentUserIds = agentRoles.map(r => r.user_id);

    // Fetch profiles, sessions, and presence logs in parallel
    const [profilesRes, sessionsRes, presenceRes] = await Promise.all([
      supabase.from("profiles").select("id, name, email, user_code").in("id", agentUserIds),
      supabase.from("agent_sessions")
        .select("user_id, status, login_at, logout_at")
        .in("user_id", agentUserIds)
        .gte("login_at", todayStart.toISOString())
        .order("login_at", { ascending: false }),
      supabase.from("agent_presence_log")
        .select("user_id, duration_seconds, present_start, present_end")
        .in("user_id", agentUserIds)
        .gte("present_start", todayStart.toISOString()),
    ]);

    const profiles = profilesRes.data || [];
    const sessions = sessionsRes.data || [];
    const presenceLogs = presenceRes.data || [];

    // Calculate total presence seconds per user today
    const presenceMap = new Map<string, number>();
    for (const log of presenceLogs) {
      const current = presenceMap.get(log.user_id) || 0;
      const dur = log.duration_seconds || 
        (log.present_end ? 0 : Math.floor((Date.now() - new Date(log.present_start).getTime()) / 1000));
      presenceMap.set(log.user_id, current + dur);
    }

    // Get latest session per agent
    const latestSession = new Map<string, typeof sessions[0]>();
    for (const s of sessions) {
      if (!latestSession.has(s.user_id)) latestSession.set(s.user_id, s);
    }

    const result: AgentRow[] = profiles.map(p => {
      const session = latestSession.get(p.id);
      return {
        userId: p.id,
        name: p.name || "—",
        email: p.email || "—",
        userCode: p.user_code || "—",
        status: session?.status || "offline",
        loginAt: session?.login_at || null,
        todaySeconds: presenceMap.get(p.id) || 0,
      };
    });

    // Sort: online first, then by work hours desc
    result.sort((a, b) => {
      if (a.status === "online" && b.status !== "online") return -1;
      if (b.status === "online" && a.status !== "online") return 1;
      return b.todaySeconds - a.todaySeconds;
    });

    setAgents(result);
    setLoading(false);
  };

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const totalOnline = agents.filter(a => a.status === "online").length;

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  if (agents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
        لا يوجد موظفون في مركز الاتصال
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="gap-1">
          <Wifi className="w-3 h-3 text-emerald-500" />
          {totalOnline} متصل
        </Badge>
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-foreground">طاقم مركز الاتصال</h3>
          <Users className="w-5 h-5 text-primary" />
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden glass-card">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-right font-semibold">المرجع</TableHead>
              <TableHead className="text-right font-semibold">الاسم</TableHead>
              <TableHead className="text-right font-semibold">البريد</TableHead>
              <TableHead className="text-center font-semibold">الحالة</TableHead>
              <TableHead className="text-center font-semibold">آخر دخول</TableHead>
              <TableHead className="text-center font-semibold">ساعات العمل اليوم</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map(agent => (
              <TableRow key={agent.userId} className={`hover:bg-muted/20 transition-colors ${onAgentClick ? "cursor-pointer" : ""}`} onClick={() => onAgentClick?.(agent.userId)}>
                <TableCell className="text-right font-mono text-xs text-muted-foreground">{agent.userCode}</TableCell>
                <TableCell className="text-right font-medium">{agent.name}</TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">{agent.email}</TableCell>
                <TableCell className="text-center">
                  {agent.status === "online" ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1">
                      <Wifi className="w-3 h-3" /> متصل
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <WifiOff className="w-3 h-3" /> غير متصل
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center text-xs text-muted-foreground">
                  {agent.loginAt
                    ? new Date(agent.loginAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-primary" />
                    <span className="text-sm font-semibold text-foreground">{formatDuration(agent.todaySeconds)}</span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AgentStaffPanel;
