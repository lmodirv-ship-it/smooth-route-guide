import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { useUiStudio } from "@/hooks/useUiStudio";

const ClassicRide = lazy(() => import("@/pages/CustomerPage"));
const StudioRide = lazy(() => import("@/pages/customer/RideStudioLayout"));

/** Picks the customer ride layout configured in the admin UI Studio. */
const RideEntry = () => {
  const { layout, loading } = useUiStudio("customer");

  if (loading) {
    return (
      <div className="min-h-[60dvh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const Layout = layout === "studio" ? StudioRide : ClassicRide;
  return (
    <Suspense fallback={<div className="min-h-[60dvh] flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
      <Layout />
    </Suspense>
  );
};

export default RideEntry;
