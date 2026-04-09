/**
 * In-App Tipping Dialog — shown to customer after delivery
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const TIP_AMOUNTS = [5, 10, 15, 20];

interface TipDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: string;
  driverId: string;
  tipperId: string;
  driverName?: string;
}

const TipDialog = ({ open, onClose, orderId, driverId, tipperId, driverName }: TipDialogProps) => {
  const [amount, setAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const finalAmount = customAmount ? Number(customAmount) : amount;

  const handleSubmit = async () => {
    if (finalAmount <= 0) return;
    setSubmitting(true);
    try {
      await supabase.from("driver_tips").insert({
        order_id: orderId,
        driver_id: driverId,
        tipper_id: tipperId,
        amount: finalAmount,
        message: message || null,
      });

      // Add tip to driver's wallet
      const { data: driver } = await supabase.from("drivers").select("user_id").eq("id", driverId).single();
      if (driver) {
        await supabase.rpc("record_visit", { p_session_id: "tip-noop" }).then(() => {});
        // Direct wallet update
        const { data: wallet } = await supabase.from("wallet").select("balance").eq("user_id", driver.user_id).single();
        if (wallet) {
          await supabase.from("wallet").update({
            balance: (wallet.balance || 0) + finalAmount,
          }).eq("user_id", driver.user_id);
        }
      }

      setSubmitted(true);
      toast({ title: `شكراً! تم إرسال ${finalAmount} DH كإكرامية 💚` });
      setTimeout(onClose, 2000);
    } catch {
      toast({ title: "خطأ في الإرسال", variant: "destructive" });
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
        className="w-full max-w-md bg-card border-t border-border rounded-t-3xl p-6 safe-area-bottom"
      >
        {submitted ? (
          <motion.div
            initial={{ scale: 0.8 }} animate={{ scale: 1 }}
            className="text-center py-6"
          >
            <Heart className="w-16 h-16 text-pink-500 mx-auto mb-3 fill-pink-500" />
            <p className="text-xl font-bold text-foreground">شكراً لكرمك! 💚</p>
            <p className="text-sm text-muted-foreground mt-1">تم إرسال {finalAmount} DH للسائق</p>
          </motion.div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">إكرامية للسائق</h3>
                <p className="text-xs text-muted-foreground">{driverName || "السائق"} يستحق مكافأة؟</p>
              </div>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Amount buttons */}
            <div className="grid grid-cols-4 gap-2 mb-3">
              {TIP_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => { setAmount(amt); setCustomAmount(""); }}
                  className={`py-3 rounded-xl text-sm font-bold transition-all ${
                    amount === amt && !customAmount
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {amt} DH
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              placeholder="مبلغ مخصص..."
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm mb-3 outline-none focus:ring-2 focus:ring-primary/30"
            />

            {/* Optional message */}
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="رسالة (اختياري)..."
              className="w-full px-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm mb-4 outline-none focus:ring-2 focus:ring-primary/30"
              maxLength={100}
            />

            <div className="flex gap-2">
              <Button
                onClick={handleSubmit}
                disabled={submitting || finalAmount <= 0}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl py-3 font-bold"
              >
                {submitting ? "جارٍ الإرسال..." : `إرسال ${finalAmount} DH 💚`}
              </Button>
              <Button variant="outline" onClick={onClose} className="rounded-xl">
                لاحقاً
              </Button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default TipDialog;
