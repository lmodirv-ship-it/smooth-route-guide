import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Clock, DollarSign, Hash, Phone, PhoneCall,
  CheckCircle, XCircle, Navigation, Store, Sparkles, Route
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TrackingOrderRow {
  id?: string;
  distanceKm: number | null;
  etaMinutes: number | null;
  price: number | string | null;
  pickupLabel: string;
  destinationLabel: string;
  referenceCode?: string | null;
  referenceLabel?: string;
  storeName?: string | null;
  storePhone?: string | null;
  orderCode?: string | null;
  onCallClient?: () => void;
  onCallStore?: () => void;
  callDisabled?: boolean;
  nextAction?: { label: string; colors: string } | null;
  onNextAction?: () => void;
  onCancel?: () => void;
  updating?: boolean;
}

export interface TrackingInfoTableProps extends TrackingOrderRow {
  extraOrders?: TrackingOrderRow[];
  title?: string;
}

/* ─── Single order card ─── */
const OrderCard = ({ order, idx }: { order: TrackingOrderRow; idx: number }) => {
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (order.onNextAction) order.onNextAction();
    setConfirmed(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08, duration: 0.3 }}
      className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-md overflow-hidden shadow-lg"
    >
      {/* ─ Route ribbon ─ */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/40">
        <Route className="w-3.5 h-3.5 text-primary shrink-0" />
        <div className="flex items-center gap-1 text-[10px] min-w-0 flex-1">
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/15 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="truncate">{order.pickupLabel}</span>
          </span>
          <Navigation className="w-3 h-3 text-muted-foreground shrink-0 rotate-90" />
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-destructive/10 border border-destructive/15 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
            <span className="truncate">{order.destinationLabel}</span>
          </span>
        </div>
        {order.storeName && (
          <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground shrink-0">
            <Store className="w-3 h-3 text-emerald-400" />
            <span className="truncate max-w-[50px]">{order.storeName}</span>
          </span>
        )}
      </div>

      {/* ─ Metrics grid (scrollable on small screens) ─ */}
      <div className="overflow-x-auto scrollbar-hide">
        <div className="flex min-w-[320px] divide-x divide-border/30 rtl:divide-x-reverse">
        {/* Price */}
        <div className="flex flex-col items-center justify-center py-3 px-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center mb-1">
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-sm font-black text-primary leading-tight">{order.price || "—"}</span>
          <span className="text-[8px] text-muted-foreground mt-0.5">DH</span>
        </div>

        {/* ETA */}
        <div className="flex flex-col items-center justify-center py-3 px-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-1">
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <span className="text-sm font-bold text-foreground leading-tight">{order.etaMinutes || "—"}</span>
          <span className="text-[8px] text-muted-foreground mt-0.5">دقيقة</span>
        </div>

        {/* Distance */}
        <div className="flex flex-col items-center justify-center py-3 px-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center mb-1">
            <MapPin className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground leading-tight">{order.distanceKm?.toFixed(1) || "—"}</span>
          <span className="text-[8px] text-muted-foreground mt-0.5">كم</span>
        </div>

        {/* Reference */}
        <div className="flex flex-col items-center justify-center py-3 px-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-600/10 border border-violet-500/20 flex items-center justify-center mb-1">
            <Hash className="w-4 h-4 text-violet-400" />
          </div>
          <span className="text-[11px] font-mono font-bold text-foreground leading-tight truncate max-w-[50px]">
            {order.referenceCode || "—"}
          </span>
          <span className="text-[7px] text-muted-foreground mt-0.5">{order.referenceLabel || "مرجع"}</span>
        </div>
      </div>

      {/* ─ Action bar ─ */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/20 border-t border-border/40">
        {/* Call buttons */}
        <div className="flex items-center gap-1.5">
          {order.onCallClient && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={order.onCallClient}
              disabled={order.callDisabled}
              className="w-8 h-8 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/25 flex items-center justify-center transition-all"
              title="اتصال بالعميل"
            >
              <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
            </motion.button>
          )}
          {order.storePhone && order.onCallStore && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={order.onCallStore}
              className="w-8 h-8 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/25 flex items-center justify-center transition-all"
              title="اتصال بالمتجر"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
            </motion.button>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action button: Confirm ↔ Cancel */}
        <AnimatePresence mode="wait">
          {!confirmed ? (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={order.updating}
                className="h-9 px-4 text-xs rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white font-bold shadow-md shadow-emerald-500/20 gap-1.5"
              >
                {order.updating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>تأكيد</span>
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="cancel"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
            >
              <Button
                size="sm"
                variant="outline"
                onClick={() => order.onCancel?.()}
                disabled={order.updating}
                className="h-9 px-4 text-xs rounded-xl border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold shadow-md shadow-destructive/10 gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>إلغاء الرحلة</span>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

/* ─── Main component ─── */
const TrackingInfoTable = (props: TrackingInfoTableProps) => {
  const allOrders: TrackingOrderRow[] = [props, ...(props.extraOrders || [])];

  return (
    <div dir="rtl" className="w-full space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">{props.title || "الطلبات"}</h3>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold">
          {allOrders.length}
        </span>
      </div>

      {/* Order cards */}
      {allOrders.map((order, idx) => (
        <OrderCard key={order.id || idx} order={order} idx={idx} />
      ))}
    </div>
  );
};

export default TrackingInfoTable;
