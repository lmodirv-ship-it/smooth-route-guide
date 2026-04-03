import { MapPin, Clock, DollarSign, Hash, Phone, PhoneCall, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";

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
    <div dir="rtl" className="w-full">
      {/* Table title */}
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-bold text-foreground">📋 الطلبات</h3>
        <span className="text-[10px] text-muted-foreground">{allOrders.length} طلب</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-center text-[11px] px-2">
              <DollarSign className="w-3.5 h-3.5 mx-auto mb-0.5 text-amber-500" />الثمن
            </TableHead>
            <TableHead className="text-center text-[11px] px-2">
              <Clock className="w-3.5 h-3.5 mx-auto mb-0.5 text-blue-500" />الوقت
            </TableHead>
            <TableHead className="text-center text-[11px] px-2">
              <MapPin className="w-3.5 h-3.5 mx-auto mb-0.5 text-primary" />المسافة
            </TableHead>
            <TableHead className="text-center text-[11px] px-2">
              <Hash className="w-3.5 h-3.5 mx-auto mb-0.5 text-violet-400" />المرجع
            </TableHead>
            <TableHead className="text-center text-[11px] px-2">
              <CheckCircle className="w-3.5 h-3.5 mx-auto mb-0.5 text-emerald-500" />إجراء
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allOrders.map((order, idx) => (
            <TableRow key={order.id || idx}>
              {/* Price */}
              <TableCell className="text-center px-2 py-2">
                <span className="text-sm font-black text-primary">{order.price || "—"}</span>
                <span className="text-[9px] text-muted-foreground block">DH</span>
              </TableCell>

              {/* Time */}
              <TableCell className="text-center px-2 py-2">
                <span className="text-sm font-bold text-foreground">{order.etaMinutes || "—"}</span>
                <span className="text-[9px] text-muted-foreground block">دقيقة</span>
              </TableCell>

              {/* Distance */}
              <TableCell className="text-center px-2 py-2">
                <span className="text-sm font-bold text-foreground">{order.distanceKm?.toFixed(1) || "—"}</span>
                <span className="text-[9px] text-muted-foreground block">كم</span>
              </TableCell>

              {/* Reference + call */}
              <TableCell className="text-center px-2 py-2">
                <span className="text-[11px] font-mono font-bold text-foreground block truncate max-w-[60px] mx-auto">
                  {order.referenceCode || "—"}
                </span>
                <div className="flex items-center justify-center gap-1 mt-1">
                  {order.onCallClient && (
                    <button
                      onClick={order.onCallClient}
                      disabled={order.callDisabled}
                      className="w-6 h-6 rounded-full bg-blue-500/15 hover:bg-blue-500/30 border border-blue-500/30 flex items-center justify-center transition-colors"
                    >
                      <PhoneCall className="w-3 h-3 text-blue-400" />
                    </button>
                  )}
                  {order.storePhone && order.onCallStore && (
                    <button
                      onClick={order.onCallStore}
                      className="w-6 h-6 rounded-full bg-emerald-500/15 hover:bg-emerald-500/30 border border-emerald-500/30 flex items-center justify-center transition-colors"
                    >
                      <Phone className="w-3 h-3 text-emerald-400" />
                    </button>
                  )}
                </div>
              </TableCell>

              {/* Actions */}
              <TableCell className="text-center px-1 py-2">
                <div className="flex flex-col gap-1 items-center">
                  {order.nextAction && order.onNextAction && (
                    <Button
                      size="sm"
                      onClick={order.onNextAction}
                      disabled={order.updating}
                      className={`h-7 px-2 text-[10px] rounded-lg bg-gradient-to-r ${order.nextAction.colors} text-white font-bold shadow-sm`}
                    >
                      {order.updating ? (
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <><CheckCircle className="w-3 h-3" />{order.nextAction.label}</>
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
                      <XCircle className="w-3 h-3" />إلغاء
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TrackingInfoTable;
