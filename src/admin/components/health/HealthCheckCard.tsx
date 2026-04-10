import { useState } from "react";
import { motion } from "framer-motion";
import {
  Database, Lock, Users, HardDrive, Zap, Wifi, FileText, Activity,
  AlertTriangle, CheckCircle, XCircle, Loader2, RefreshCw, Shield,
  CreditCard, Package, UserCheck, UserX, Copy, Wallet, Trash2, Cpu,
  Layers, Globe, Radio, Timer
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CheckStatus } from "./healthCheckDefinitions";

const iconMap: Record<string, React.ElementType> = {
  Database, Lock, Users, HardDrive, Zap, Wifi, FileText, Activity,
  AlertTriangle, Shield, CreditCard, Package, UserCheck, UserX, Copy, Wallet,
  Trash2, Cpu, Layers, Globe, Radio, Timer,
};

interface Props {
  nameAr: string;
  icon: string;
  status: CheckStatus;
  message: string;
  details?: string;
  fixable?: boolean;
  onFix?: () => Promise<void>;
}

export default function HealthCheckCard({ nameAr, icon, status, message, details, fixable, onFix }: Props) {
  const [fixing, setFixing] = useState(false);
  const Icon = iconMap[icon] || Shield;

  const handleFix = async () => {
    if (!onFix) return;
    setFixing(true);
    try { await onFix(); } finally { setFixing(false); }
  };

  const statusColor = {
    pass: "bg-green-500/10 text-green-500",
    warn: "bg-yellow-500/10 text-yellow-500",
    fail: "bg-red-500/10 text-red-500",
    running: "bg-primary/10 text-primary",
    idle: "bg-muted text-muted-foreground",
  }[status];

  return (
    <motion.div layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-xl p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${statusColor}`}>
        {status === "running" ? <Loader2 className="w-5 h-5 animate-spin" /> : <Icon className="w-5 h-5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{nameAr}</p>
        <p className="text-xs text-muted-foreground truncate">{message}</p>
        {details && status !== "idle" && (
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">{details}</p>
        )}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={status} />
        {fixable && (status === "fail" || status === "warn") && (
          <Button size="sm" variant="outline" onClick={handleFix} disabled={fixing} className="text-xs gap-1 h-7">
            {fixing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            إصلاح
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function StatusBadge({ status }: { status: CheckStatus }) {
  if (status === "idle") return <Badge variant="outline" className="text-[10px]">في الانتظار</Badge>;
  if (status === "running") return <Badge className="bg-primary/20 text-primary text-[10px]">جاري...</Badge>;
  if (status === "pass") return <Badge className="bg-green-500/20 text-green-600 text-[10px]">✓ ناجح</Badge>;
  if (status === "warn") return <Badge className="bg-yellow-500/20 text-yellow-600 text-[10px]">⚠ تحذير</Badge>;
  return <Badge className="bg-red-500/20 text-red-600 text-[10px]">✗ فشل</Badge>;
}
