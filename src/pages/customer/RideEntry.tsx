import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useUiStudio } from "@/hooks/useUiStudio";
import BottomNav from "@/components/BottomNav";

const ClassicRide = lazy(() => import("@/pages/CustomerPage"));
const StudioRide = lazy(() => import("@/pages/customer/RideStudioLayout"));

/** Picks the customer ride layout configured in the admin UI Studio. */
const RideEntry = () => {
  const ui = useUiStudio("customer");
  const { layout, loading } = ui;

  if (loading) {
    return (
      <div className="min-h-[60dvh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const Layout = layout === "studio" ? StudioRide : ClassicRide;
  return (
    <div className="relative min-h-[calc(100dvh-2.75rem)]">
      <Suspense fallback={<div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
        <Layout />
      </Suspense>
      {layout === "studio" && ui.options.showBottomNav && (
        <div className="fixed inset-x-0 bottom-0 z-[1000]">
          <BottomNav role="client" />
        </div>
      )}
    </div>
  );
};

export default RideEntry;
