import { useCustomerSubscription, CustomerSub } from "@/hooks/useCustomerSubscription";
import { Battery, BatteryCharging, BatteryFull, Zap, Crown, CreditCard } from "lucide-react";
import { motion } from "framer-motion";

function daysLeft(expires: string) {
  return Math.max(0, Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000));
}

function batteryPercent(sub: CustomerSub) {
  if (sub.subscription_type === "credits") {
    return sub.credits_total > 0 ? (sub.credits_remaining / sub.credits_total) * 100 : 0;
  }
  const total = (new Date(sub.expires_at).getTime() - new Date(sub.starts_at).getTime()) / 86400000;
  const left = daysLeft(sub.expires_at);
  return total > 0 ? (left / total) * 100 : 0;
}

function batteryColor(pct: number) {
  if (pct > 60) return "from-emerald-400 to-emerald-500";
  if (pct > 30) return "from-amber-400 to-orange-500";
  return "from-red-400 to-red-500";
}

function glowColor(pct: number) {
  if (pct > 60) return "shadow-[0_0_12px_hsl(140,60%,50%,0.4)]";
  if (pct > 30) return "shadow-[0_0_12px_hsl(35,90%,50%,0.4)]";
  return "shadow-[0_0_12px_hsl(0,70%,50%,0.4)]";
}

const BatteryWidget = ({ sub, compact }: { sub: CustomerSub; compact?: boolean }) => {
  const pct = batteryPercent(sub);
  const days = daysLeft(sub.expires_at);
  const Icon = sub.subscription_type === "monthly" ? Crown : sub.subscription_type === "annual" ? BatteryFull : BatteryCharging;
  const label = sub.subscription_type === "credits"
    ? `${sub.credits_remaining}/${sub.credits_total}`
    : `${days} يوم`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center gap-1.5 glass-card rounded-xl px-2.5 py-1.5 border border-border/50 ${glowColor(pct)} ${compact ? "text-[10px]" : "text-xs"}`}
    >
      <Icon className={`w-3.5 h-3.5 ${pct > 60 ? "text-emerald-400" : pct > 30 ? "text-amber-400" : "text-red-400"}`} />
      {/* Battery bar */}
      <div className="relative w-8 h-3 rounded-sm border border-white/20 bg-black/30 overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-[2px] bg-white/30 rounded-r-sm" style={{ right: "-3px" }} />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full bg-gradient-to-l ${batteryColor(pct)} rounded-sm`}
        />
      </div>
      <span className="text-foreground font-bold whitespace-nowrap">{label}</span>
    </motion.div>
  );
};

const WalletWidget = ({ balance }: { balance: number }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    className="flex items-center gap-1.5 glass-card rounded-xl px-2.5 py-1.5 border border-border/50 shadow-[0_0_12px_hsl(205,80%,55%,0.3)] text-xs"
  >
    <CreditCard className="w-3.5 h-3.5 text-info" />
    <span className="text-foreground font-bold">{balance} DH</span>
  </motion.div>
);

const SubscriptionIndicator = () => {
  const { subs, walletBalance, loading } = useCustomerSubscription();

  if (loading) return null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <WalletWidget balance={walletBalance} />
      {subs.map((sub) => (
        <BatteryWidget key={sub.id} sub={sub} compact={subs.length > 1} />
      ))}
    </div>
  );
};

export default SubscriptionIndicator;
