import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

interface RideBottomSheetProps {
  open: boolean;
  title: string;
  dir?: "rtl" | "ltr";
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Reusable interactive bottom sheet for ride options (payment, passengers, vehicle, notes). */
const RideBottomSheet = ({ open, title, dir = "rtl", onClose, children, footer }: RideBottomSheetProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[2000] bg-background/80 backdrop-blur-sm flex items-end"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          onDragEnd={(_, info) => { if (info.offset.y > 90) onClose(); }}
          onClick={(e) => e.stopPropagation()}
          dir={dir}
          className="w-full glass-strong border-t border-ride-border rounded-t-3xl px-4 pb-6 pt-2 max-h-[80dvh] overflow-y-auto"
        >
          <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-ride-border" />
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-base font-bold text-foreground">{title}</h3>
            <button
              onClick={onClose}
              aria-label="close"
              className="flex h-9 w-9 items-center justify-center rounded-xl glass border border-ride-border"
            >
              <X className="h-4 w-4 text-ride-muted" />
            </button>
          </div>
          <div className="space-y-2">{children}</div>
          {footer && <div className="mt-4">{footer}</div>}
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default RideBottomSheet;
