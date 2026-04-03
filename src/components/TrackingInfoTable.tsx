import { MapPin, Clock, Phone, PhoneCall, DollarSign, Hash, Store, CheckCircle, XCircle, Navigation } from "lucide-react";
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
}

const TrackingInfoTable = (props: TrackingInfoTableProps) => {
  const allOrders: TrackingOrderRow[] = [props, ...(props.extraOrders || [])];

  return (
    <div className="space-y-2">
      {allOrders.map((order, idx) => (
        <div key={order.id || idx} className="rounded-xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden">
          {/* ── Compact icon row: Distance | ETA | Price | Ref ── */}
          <div className="flex items-center justify-between px-2 py-2 gap-1">
            {/* Distance */}
            <div className="flex flex-col items-center min-w-[48px]">
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="text-[10px] font-bold text-foreground mt-0.5">{order.distanceKm?.toFixed(1) || "—"}</span>
              <span className="text-[8px] text-muted-foreground">كم</span>
            </div>

            {/* ETA */}
            <div className="flex flex-col items-center min-w-[48px]">
              <div className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <span className="text-[10px] font-bold text-foreground mt-0.5">{order.etaMinutes || "—"}</span>
              <span className="text-[8px] text-muted-foreground">دقيقة</span>
            </div>

            {/* Price */}
            <div className="flex flex-col items-center min-w-[48px]">
              <div className="w-7 h-7 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <span className="text-[10px] font-black text-primary mt-0.5">{order.price || "—"}</span>
              <span className="text-[8px] text-muted-foreground">DH</span>
            </div>

            {/* Reference */}
            <div className="flex flex-col items-center min-w-[48px]">
              <div className="w-7 h-7 rounded-full bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
                <Hash className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <span className="text-[9px] font-mono font-bold text-foreground mt-0.5 truncate max-w-[50px]">
                {order.referenceCode || "—"}
              </span>
              <span className="text-[8px] text-muted-foreground">{order.referenceLabel || "مرجع"}</span>
            </div>

            {/* Call buttons */}
            <div className="flex flex-col items-center gap-1 min-w-[36px]">
              {order.onCallClient && (
                <button
                  onClick={order.onCallClient}
                  disabled={order.callDisabled}
                  className="w-7 h-7 rounded-full bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 flex items-center justify-center transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                </button>
              )}
              {order.storePhone && order.onCallStore && (
                <button
                  onClick={order.onCallStore}
                  className="w-7 h-7 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                </button>
              )}
            </div>
          </div>

          {/* Route mini-row */}
          <div className="flex items-center gap-1.5 px-2 pb-2 text-[9px]">
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/10 truncate max-w-[45%]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 inline-block" />
              {order.pickupLabel}
            </span>
            <Navigation className="w-2.5 h-2.5 text-muted-foreground shrink-0" />
            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-destructive/10 border border-destructive/10 truncate max-w-[45%]">
              <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0 inline-block" />
              {order.destinationLabel}
            </span>
            {order.storeName && (
              <span className="text-muted-foreground truncate max-w-[60px]" title={order.storeName}>
                <Store className="w-2.5 h-2.5 inline text-emerald-400" /> {order.storeName}
              </span>
            )}
          </div>

          {/* Action buttons */}
          {(order.nextAction || order.onCancel) && (
            <div className="flex items-center gap-1.5 px-2 pb-2">
              {order.nextAction && order.onNextAction && (
                <Button
                  size="sm"
                  onClick={order.onNextAction}
                  disabled={order.updating}
                  className={`flex-1 h-9 text-xs rounded-xl bg-gradient-to-r ${order.nextAction.colors} text-white font-bold shadow-md gap-1`}
                >
                  {order.updating ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><CheckCircle className="w-3.5 h-3.5" />{order.nextAction.label}</>
                  )}
                </Button>
              )}
              {order.onCancel && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={order.onCancel}
                  disabled={order.updating}
                  className="h-9 px-3 text-xs rounded-xl border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" />إلغاء
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default TrackingInfoTable;
