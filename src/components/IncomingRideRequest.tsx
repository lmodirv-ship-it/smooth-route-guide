import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, User, Clock, DollarSign, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RideRequest } from "@/hooks/useIncomingRideRequests";

interface IncomingRideRequestProps {
  requests: RideRequest[];
  accepting: string | null;
  onAccept: (request: RideRequest) => void;
  onReject: (requestId: string) => void;
}

const IncomingRideRequest = ({ requests, accepting, onAccept, onReject }: IncomingRideRequestProps) => {
  if (requests.length === 0) return null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="px-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-muted-foreground bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
          {requests.length} طلب
        </span>
        <h2 className="font-bold text-foreground flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
          طلبات جديدة
        </h2>
      </div>

      <AnimatePresence mode="popLayout">
        {requests.map((request) => (
          <motion.div
            key={request.id}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="gradient-card rounded-2xl p-4 border border-primary/30 mb-3 relative overflow-hidden"
          >
            {/* Glow accent */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

            {/* Passenger info */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(request.created_at)}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{request.passenger_name}</span>
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
              </div>
            </div>

            {/* Route */}
            <div className="space-y-2 mb-3">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm text-foreground truncate">{request.pickup || 'موقع الالتقاط'}</span>
                <div className="w-2.5 h-2.5 rounded-full bg-success border-2 border-success/30" />
              </div>
              <div className="mr-[5px] border-r border-dashed border-muted-foreground/30 h-3" />
              <div className="flex items-center gap-2 justify-end">
                <span className="text-sm text-foreground truncate">{request.destination || 'الوجهة'}</span>
                <div className="w-2.5 h-2.5 rounded-full bg-destructive border-2 border-destructive/30" />
              </div>
            </div>

            {/* Price */}
            {request.price && request.price > 0 && (
              <div className="flex items-center justify-end gap-1 mb-3">
                <span className="text-lg font-bold text-primary">{request.price} ر.س</span>
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                onClick={() => onReject(request.id)}
                disabled={accepting === request.id}
              >
                <X className="w-4 h-4 ml-1" />
                رفض
              </Button>
              <Button
                size="sm"
                className="flex-1 gradient-primary text-primary-foreground"
                onClick={() => onAccept(request)}
                disabled={accepting === request.id}
              >
                {accepting === request.id ? (
                  <Loader2 className="w-4 h-4 animate-spin ml-1" />
                ) : (
                  <Check className="w-4 h-4 ml-1" />
                )}
                قبول
              </Button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default IncomingRideRequest;
