import { MapPin, Clock, Phone, PhoneCall, Route, DollarSign, Hash, Store, User, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface TrackingInfoTableProps {
  distanceKm: number | null;
  etaMinutes: number | null;
  price: number | string | null;
  pickupLabel: string;
  destinationLabel: string;
  referenceCode?: string | null;
  referenceLabel?: string;
  storeName?: string | null;
  storePhone?: string | null;
  onCallClient?: () => void;
  onCallStore?: () => void;
  callDisabled?: boolean;
  nextAction?: { label: string; colors: string } | null;
  onNextAction?: () => void;
  onCancel?: () => void;
  updating?: boolean;
  orderCode?: string | null;
}

const TrackingInfoTable = ({
  distanceKm,
  etaMinutes,
  price,
  pickupLabel,
  destinationLabel,
  referenceCode,
  referenceLabel = "رمز العميل",
  storeName,
  storePhone,
  onCallClient,
  onCallStore,
  callDisabled,
  nextAction,
  onNextAction,
  onCancel,
  updating,
  orderCode,
}: TrackingInfoTableProps) => {
  return (
    <div className="space-y-2">
      {/* ── Unified Info Table ── */}
      <div className="rounded-xl border border-border overflow-hidden bg-card/60 backdrop-blur-sm">
        <table className="w-full text-sm">
          <tbody>
            {/* Route row */}
            <tr className="border-b border-border/50">
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-emerald-400" />
                  المسار
                </div>
              </td>
              <td className="px-3 py-2.5 text-foreground">
                <div className="flex items-center gap-2 text-xs">
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/15 truncate max-w-[100px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    {pickupLabel}
                  </span>
                  <Route className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-destructive/10 border border-destructive/15 truncate max-w-[100px]">
                    <div className="w-1.5 h-1.5 rounded-full bg-destructive shrink-0" />
                    {destinationLabel}
                  </span>
                </div>
              </td>
            </tr>

            {/* Distance */}
            <tr className="border-b border-border/50">
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  المسافة
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className="text-foreground font-bold">{distanceKm?.toFixed(1) || "—"} كم</span>
              </td>
            </tr>

            {/* ETA */}
            <tr className="border-b border-border/50">
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  الوقت المتوقع
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className="text-foreground font-bold">{etaMinutes || "—"} دقيقة</span>
              </td>
            </tr>

            {/* Price */}
            <tr className="border-b border-border/50">
              <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                  السعر
                </div>
              </td>
              <td className="px-3 py-2.5">
                <span className="text-primary font-black text-base">{price || "—"} DH</span>
              </td>
            </tr>

            {/* Reference code */}
            {referenceCode && (
              <tr className="border-b border-border/50">
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-violet-400" />
                    {referenceLabel}
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-foreground bg-primary/10 px-2 py-0.5 rounded-md border border-primary/20 text-xs">
                      {referenceCode}
                    </span>
                    {onCallClient && (
                      <button
                        onClick={onCallClient}
                        disabled={callDisabled}
                        className="w-8 h-8 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 flex items-center justify-center transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Store */}
            {storeName && (
              <tr className="border-b border-border/50">
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-emerald-400" />
                    المطعم
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-bold text-xs truncate">{storeName}</span>
                    {storePhone && onCallStore && (
                      <button
                        onClick={onCallStore}
                        className="w-8 h-8 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {/* Order code */}
            {orderCode && (
              <tr>
                <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                  <div className="flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                    رقم الطلب
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="font-mono text-xs text-foreground/70">{orderCode}</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Action Buttons ── */}
      {nextAction && onNextAction && (
        <Button
          onClick={onNextAction}
          disabled={updating}
          className={`w-full h-14 rounded-2xl bg-gradient-to-r ${nextAction.colors} text-white font-bold text-base shadow-xl gap-2`}
        >
          {updating ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : nextAction.label}
        </Button>
      )}

      {onCancel && (
        <Button
          onClick={onCancel}
          disabled={updating}
          variant="outline"
          className="w-full h-10 rounded-xl border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 text-sm gap-1 font-bold"
        >
          إلغاء
        </Button>
      )}
    </div>
  );
};

export default TrackingInfoTable;
