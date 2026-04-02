/**
 * Reusable Rating Dialog — used by drivers to rate customers after delivery/ride
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface RatingDialogProps {
  open: boolean;
  onClose: () => void;
  /** The user being rated */
  targetUserId: string;
  /** The driver doing the rating */
  driverId: string;
  /** Link to order or trip */
  orderId?: string;
  tripId?: string;
  ratingType: "driver_to_customer" | "customer_to_driver";
  targetName?: string;
}

const RatingDialog = ({
  open,
  onClose,
  targetUserId,
  driverId,
  orderId,
  tripId,
  ratingType,
  targetName,
}: RatingDialogProps) => {
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (score === 0) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("ratings").insert({
        user_id: targetUserId,
        driver_id: driverId,
        score,
        comment: comment.trim() || null,
        rating_type: ratingType,
        order_id: orderId || null,
        trip_id: tripId || null,
        rated_by: user.id,
      } as any);

      setSubmitted(true);
      toast({ title: "تم إرسال التقييم بنجاح ⭐" });
      setTimeout(() => {
        onClose();
        setSubmitted(false);
        setScore(0);
        setComment("");
      }, 1500);
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {submitted ? (
            <div className="text-center py-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-5xl mb-3"
              >
                ⭐
              </motion.div>
              <p className="text-lg font-bold text-foreground">شكراً لتقييمك!</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-foreground">
                  {ratingType === "driver_to_customer" ? "قيّم الزبون" : "قيّم السائق"}
                </h3>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {targetName && (
                <p className="text-muted-foreground text-sm mb-3 text-center">
                  {targetName}
                </p>
              )}

              {/* Stars */}
              <div className="flex items-center justify-center gap-2 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setScore(star)}
                    className="transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      className={`w-10 h-10 ${
                        star <= score
                          ? "text-amber-400 fill-amber-400"
                          : "text-muted-foreground/30"
                      } transition-colors`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment */}
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="أضف تعليقاً (اختياري)..."
                className="w-full h-20 bg-secondary/60 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none mb-4"
                dir="rtl"
              />

              <Button
                disabled={score === 0 || submitting}
                onClick={handleSubmit}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold gap-2"
              >
                <Send className="w-4 h-4" /> إرسال التقييم
              </Button>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default RatingDialog;
