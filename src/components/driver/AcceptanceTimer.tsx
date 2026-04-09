/**
 * 30-second countdown timer for order acceptance
 * Shows a circular progress ring that counts down
 */
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

interface AcceptanceTimerProps {
  /** Total seconds for the countdown */
  seconds?: number;
  /** Called when timer reaches 0 */
  onExpire: () => void;
  /** Called when driver accepts */
  onAccept: () => void;
  /** Whether accept is in progress */
  accepting?: boolean;
  /** Order price to display */
  price?: string | number | null;
  /** Store name */
  storeName?: string | null;
}

const AcceptanceTimer = ({
  seconds = 30,
  onExpire,
  onAccept,
  accepting,
  price,
  storeName,
}: AcceptanceTimerProps) => {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onExpire]);

  const progress = remaining / seconds;
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference * (1 - progress);
  const isUrgent = remaining <= 10;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      className="flex flex-col items-center gap-3 p-4"
    >
      {/* Store name */}
      {storeName && (
        <p className="text-sm font-bold text-foreground">{storeName}</p>
      )}

      {/* Circular timer */}
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="6"
          />
          <circle
            cx="50" cy="50" r="40"
            fill="none"
            stroke={isUrgent ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-black ${isUrgent ? "text-destructive animate-pulse" : "text-foreground"}`}>
            {remaining}
          </span>
          <span className="text-[9px] text-muted-foreground">ثانية</span>
        </div>
      </div>

      {/* Price */}
      {price && (
        <p className="text-lg font-black text-primary">{price} DH</p>
      )}

      {/* Accept button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onAccept}
        disabled={accepting}
        className="w-full max-w-[200px] py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-base shadow-lg shadow-emerald-500/30 disabled:opacity-50"
      >
        {accepting ? "جارٍ القبول..." : "✅ قبول الطلب"}
      </motion.button>
    </motion.div>
  );
};

export default AcceptanceTimer;
