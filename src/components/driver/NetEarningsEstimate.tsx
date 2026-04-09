/**
 * Net Earnings Estimate — shows driver what they'll earn after commission
 */
import { DollarSign, TrendingUp, Percent } from "lucide-react";

interface NetEarningsEstimateProps {
  totalPrice: number | null;
  deliveryFee: number | null;
  commissionRate?: number; // default 5%
  className?: string;
}

const NetEarningsEstimate = ({
  totalPrice,
  deliveryFee,
  commissionRate = 0.05,
  className = "",
}: NetEarningsEstimateProps) => {
  const earning = deliveryFee || totalPrice || 0;
  if (!earning) return null;

  const commission = Math.round(earning * commissionRate * 100) / 100;
  const netEarning = Math.round((earning - commission) * 100) / 100;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 ${className}`}>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-muted-foreground">صافي الربح:</span>
        <span className="text-sm font-black text-emerald-400">{netEarning} DH</span>
      </div>
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground/70">
        <Percent className="w-3 h-3" />
        <span>عمولة {commissionRate * 100}% = {commission} DH</span>
      </div>
    </div>
  );
};

export default NetEarningsEstimate;
