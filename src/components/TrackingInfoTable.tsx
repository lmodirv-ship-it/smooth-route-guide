import { MapPin, Clock, Phone, PhoneCall, DollarSign, Hash, Store, CheckCircle, XCircle } from "lucide-react";
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
  /** For multi-order support pass extra rows */
  extraOrders?: TrackingOrderRow[];
}

const TrackingInfoTable = (props: TrackingInfoTableProps) => {
  const allOrders: TrackingOrderRow[] = [props, ...(props.extraOrders || [])];

  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-border overflow-hidden bg-card/60 backdrop-blur-sm overflow-x-auto">
        <table className="w-full text-xs" dir="rtl">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-2 py-2 text-right text-muted-foreground font-semibold whitespace-nowrap">
                <div className="flex items-center gap-1"><MapPin className="w-3 h-3 text-primary" />المسار</div>
              </th>
              <th className="px-2 py-2 text-center text-muted-foreground font-semibold whitespace-nowrap">
                <div className="flex items-center justify-center gap-1"><MapPin className="w-3 h-3 text-primary" />كم</div>
              </th>
              <th className="px-2 py-2 text-center text-muted-foreground font-semibold whitespace-nowrap">
                <div className="flex items-center justify-center gap-1"><Clock className="w-3 h-3 text-blue-500" />الوقت</div>
              </th>
              <th className="px-2 py-2 text-center text-muted-foreground font-semibold whitespace-nowrap">
                <div className="flex items-center justify-center gap-1"><DollarSign className="w-3 h-3 text-amber-500" />السعر</div>
              </th>
              <th className="px-2 py-2 text-center text-muted-foreground font-semibold whitespace-nowrap">
                <div className="flex items-center justify-center gap-1"><Hash className="w-3 h-3 text-violet-400" />المرجع</div>
              </th>
              <th className="px-2 py-2 text-center text-muted-foreground font-semibold whitespace-nowrap">
                اتصال
              </th>
              <th className="px-2 py-2 text-center text-muted-foreground font-semibold whitespace-nowrap">
                إجراء
              </th>
            </tr>
          </thead>
          <tbody>
            {allOrders.map((order, idx) => (
              <tr key={order.id || idx} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                {/* Route */}
                <td className="px-2 py-2.5">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 inline-block" />
                      <span className="truncate max-w-[80px]">{order.pickupLabel}</span>
                    </span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0 inline-block" />
                      <span className="truncate max-w-[80px]">{order.destinationLabel}</span>
                    </span>
                  </div>
                </td>

                {/* Distance */}
                <td className="px-2 py-2.5 text-center">
                  <span className="text-foreground font-bold">{order.distanceKm?.toFixed(1) || "—"}</span>
                </td>

                {/* ETA */}
                <td className="px-2 py-2.5 text-center">
                  <span className="text-foreground font-bold">{order.etaMinutes || "—"}<span className="text-[9px] text-muted-foreground mr-0.5">د</span></span>
                </td>

                {/* Price */}
                <td className="px-2 py-2.5 text-center">
                  <span className="text-primary font-black">{order.price || "—"}<span className="text-[9px] text-muted-foreground mr-0.5">DH</span></span>
                </td>

                {/* Reference */}
                <td className="px-2 py-2.5 text-center">
                  <div className="flex flex-col items-center gap-0.5">
                    {order.referenceCode ? (
                      <span className="font-mono font-bold text-[10px] text-foreground bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                        {order.referenceCode}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                    {order.storeName && (
                      <span className="text-[9px] text-muted-foreground truncate max-w-[60px]" title={order.storeName}>
                        <Store className="w-2.5 h-2.5 inline-block mr-0.5 text-emerald-400" />{order.storeName}
                      </span>
                    )}
                  </div>
                </td>

                {/* Call buttons */}
                <td className="px-2 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {order.onCallClient && (
                      <button
                        onClick={order.onCallClient}
                        disabled={order.callDisabled}
                        className="w-7 h-7 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 flex items-center justify-center transition-colors"
                        title="اتصال"
                      >
                        <PhoneCall className="w-3 h-3 text-blue-400" />
                      </button>
                    )}
                    {order.storePhone && order.onCallStore && (
                      <button
                        onClick={order.onCallStore}
                        className="w-7 h-7 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center transition-colors"
                        title="اتصال بالمطعم"
                      >
                        <Phone className="w-3 h-3 text-emerald-400" />
                      </button>
                    )}
                    {!order.onCallClient && !order.storePhone && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="px-2 py-2.5 text-center">
                  <div className="flex items-center justify-center gap-1">
                    {order.nextAction && order.onNextAction && (
                      <Button
                        size="sm"
                        onClick={order.onNextAction}
                        disabled={order.updating}
                        className={`h-7 px-2 text-[10px] rounded-lg bg-gradient-to-r ${order.nextAction.colors} text-white font-bold shadow-md`}
                      >
                        {order.updating ? (
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <><CheckCircle className="w-3 h-3 ml-0.5" />{order.nextAction.label}</>
                        )}
                      </Button>
                    )}
                    {order.onCancel && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={order.onCancel}
                        disabled={order.updating}
                        className="h-7 px-2 text-[10px] rounded-lg border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold"
                      >
                        <XCircle className="w-3 h-3 ml-0.5" />إلغاء
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TrackingInfoTable;
