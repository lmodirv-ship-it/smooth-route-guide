/**
 * BalanceBars: Visual balance indicator with 5 bars.
 * Each bar represents 10 DH out of 50 DH max.
 * Full bars are green, empty bars are red.
 */
const BalanceBars = ({ balance, max = 50 }: { balance: number; max?: number }) => {
  const bars = 5;
  const perBar = max / bars; // 10 DH per bar
  const filledBars = Math.min(bars, Math.max(0, Math.ceil(balance / perBar)));

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-[3px]">
        {Array.from({ length: bars }).map((_, i) => {
          const isFilled = i < filledBars;
          return (
            <div
              key={i}
              className={`w-[6px] h-5 rounded-sm transition-colors ${
                isFilled
                  ? "bg-emerald-500 shadow-[0_0_4px_hsl(var(--success)/0.4)]"
                  : "bg-destructive/60"
              }`}
            />
          );
        })}
      </div>
      <span className={`text-[11px] font-bold mr-1 ${
        filledBars >= 4 ? "text-emerald-500" :
        filledBars >= 2 ? "text-amber-500" :
        "text-destructive"
      }`}>
        {balance} DH
      </span>
    </div>
  );
};

export default BalanceBars;
