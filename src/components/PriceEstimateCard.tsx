import { motion } from "framer-motion";
import { MapPin, Clock, Route, Banknote, Loader2, Car, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, type TripPriceEstimate } from "@/lib/pricing";

interface PriceEstimateCardProps {
  estimate: TripPriceEstimate | null;
  loading: boolean;
  error: string | null;
  onBook?: () => void;
  onCancel?: () => void;
  showDriverView?: boolean;
}

const PriceEstimateCard = ({ estimate, loading, error, onBook, onCancel, showDriverView = false }: PriceEstimateCardProps) => {
  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 gradient-card rounded-2xl p-6 border border-border"
      >
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
          <span className="text-muted-foreground">جاري حساب التكلفة...</span>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-4 mt-4 gradient-card rounded-2xl p-4 border border-destructive/30"
      >
        <p className="text-destructive text-center text-sm">{error}</p>
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="w-full mt-2 text-muted-foreground">
            إغلاق
          </Button>
        )}
      </motion.div>
    );
  }

  if (!estimate) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mt-4 gradient-card rounded-2xl p-5 border border-primary/20 glow-primary"
    >
      <h3 className="text-foreground font-bold text-center mb-4">
        {showDriverView ? "تفاصيل الرحلة" : "تقدير تكلفة الرحلة"}
      </h3>

      <div className="space-y-3">
        {/* D1: Driver → Customer */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {estimate.d1Km} كم • {estimate.d1DurationMin} دقيقة
          </span>
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm">
              {showDriverView ? "المسافة إلى العميل" : "وصول السائق"}
            </span>
            <Car className="w-4 h-4 text-info" />
          </div>
        </div>

        {/* D2: Customer → Destination */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {estimate.d2Km} كم • {estimate.d2DurationMin} دقيقة
          </span>
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm">مسافة الرحلة</span>
            <Navigation className="w-4 h-4 text-info" />
          </div>
        </div>

        {/* Total distance */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">{estimate.totalDistanceKm} كم</span>
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm">المسافة الإجمالية</span>
            <Route className="w-4 h-4 text-info" />
          </div>
        </div>

        <div className="border-t border-border my-2" />

        {/* Base fee */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {formatPrice(estimate.baseFee, estimate.currency)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm">رسوم أساسية</span>
            <Banknote className="w-4 h-4 text-warning" />
          </div>
        </div>

        {/* Distance fee */}
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-sm">
            {formatPrice(estimate.distanceFee, estimate.currency)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-foreground text-sm">رسوم المسافة ({estimate.totalDistanceKm} × 3)</span>
            <MapPin className="w-4 h-4 text-warning" />
          </div>
        </div>

        <div className="border-t border-border my-2" />

        {/* Total */}
        <div className="flex items-center justify-between">
          <span className="text-primary font-bold text-xl">
            {formatPrice(estimate.totalPrice, estimate.currency)}
          </span>
          <span className="text-foreground font-bold">السعر النهائي</span>
        </div>

        {/* Formula hint */}
        <p className="text-muted-foreground text-xs text-center mt-1" dir="ltr">
          5 + (({estimate.d1Km} + {estimate.d2Km}) × 3) = {formatPrice(estimate.totalPrice, estimate.currency)}
        </p>
      </div>

      <div className="flex gap-3 mt-5">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="flex-1 h-12 rounded-xl border-border text-muted-foreground"
          >
            إلغاء
          </Button>
        )}
        {onBook && (
          <Button
            onClick={onBook}
            className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground font-bold hover:opacity-90 glow-primary"
          >
            {showDriverView ? "قبول الرحلة" : "تأكيد الحجز"}
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default PriceEstimateCard;
