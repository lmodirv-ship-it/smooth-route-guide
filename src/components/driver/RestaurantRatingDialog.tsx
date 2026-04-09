/**
 * Restaurant Rating Dialog — driver rates restaurant after pickup
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Clock, CheckCircle, Store, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RestaurantRatingDialogProps {
  open: boolean;
  onClose: () => void;
  storeId: string;
  storeName: string;
  driverId: string;
  orderId: string;
}

const WAIT_OPTIONS = [
  { label: "< 5 دقائق", value: 3 },
  { label: "5-10 دقائق", value: 7 },
  { label: "10-20 دقيقة", value: 15 },
  { label: "20+ دقيقة", value: 25 },
];

const RestaurantRatingDialog = ({
  open, onClose, storeId, storeName, driverId, orderId,
}: RestaurantRatingDialogProps) => {
  const [score, setScore] = useState(0);
  const [waitTime, setWaitTime] = useState<number | null>(null);
  const [orderAccurate, setOrderAccurate] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    try {
      await supabase.from("restaurant_ratings").insert({
        store_id: storeId,
        driver_id: driverId,
        order_id: orderId,
        score,
        wait_time_minutes: waitTime,
        order_accuracy: orderAccurate,
        comment: comment || null,
      });
      toast({ title: "شكراً على تقييمك! ⭐" });
      onClose();
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    }
    setSubmitting(false);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: 300, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 300, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-card border-t border-border rounded-t-3xl p-5 safe-area-bottom"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Store className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-base font-bold text-foreground">تقييم المطعم</h3>
              <p className="text-xs text-muted-foreground">{storeName}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stars */}
        <div className="flex justify-center gap-2 mb-4">
          {[1, 2, 3, 4, 5].map((s) => (
            <motion.button
              key={s}
              whileTap={{ scale: 1.3 }}
              onClick={() => setScore(s)}
              className="transition-transform"
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  s <= score ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"
                }`}
              />
            </motion.button>
          ))}
        </div>

        {/* Wait time */}
        <div className="mb-3">
          <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            مدة الانتظار
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {WAIT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setWaitTime(opt.value)}
                className={`py-2 rounded-lg text-[10px] font-bold transition-all ${
                  waitTime === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Order accuracy */}
        <div className="mb-3">
          <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            دقة الطلب
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOrderAccurate(true)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                orderAccurate
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-muted text-foreground"
              }`}
            >
              ✅ صحيح
            </button>
            <button
              onClick={() => setOrderAccurate(false)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                !orderAccurate
                  ? "bg-destructive/20 text-destructive border border-destructive/30"
                  : "bg-muted text-foreground"
              }`}
            >
              ❌ خطأ في الطلب
            </button>
          </div>
        </div>

        {/* Comment */}
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="ملاحظة (اختياري)..."
          className="w-full px-4 py-2 rounded-xl bg-muted border border-border text-foreground text-sm mb-4 outline-none"
          maxLength={200}
        />

        <Button
          onClick={handleSubmit}
          disabled={submitting || score === 0}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl py-3 font-bold"
        >
          {submitting ? "جارٍ الإرسال..." : `إرسال التقييم ⭐`}
        </Button>
      </motion.div>
    </div>
  );
};

export default RestaurantRatingDialog;
