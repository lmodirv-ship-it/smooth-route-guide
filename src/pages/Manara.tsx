import { Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Manara3DSphere from "@/components/manara/Manara3DSphere";
import ManaraBackground3D from "@/components/manara/ManaraBackground3D";
import ManaraNetworkOrbit from "@/components/manara/ManaraNetworkOrbit";
import ManaraSignalLog from "@/components/manara/ManaraSignalLog";
import { useManaraContent } from "@/hooks/useManaraContent";
import { useManaraNetwork } from "@/hooks/useManaraNetwork";

const Manara = () => {
  const { content, loading } = useManaraContent();
  const { sites, siteId, imports, exports: networkExports } = useManaraNetwork();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="relative min-h-screen bg-background text-foreground">
      <ManaraBackground3D />

      {/* Back button (icon only) */}
      <div className="absolute right-4 top-4 z-40">
        <Button asChild variant="ghost" size="icon">
          <Link to="/" aria-label="home">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      {/* Glowing 3D sphere — full screen, no text */}
      <Manara3DSphere heightPercent={100} speed={content.sphereSpeed} labels={[]} />

      {/* HN group orbital network + live signal log */}
      <ManaraNetworkOrbit sites={sites} selfSite={siteId} imports={imports} exports={networkExports} />
      <ManaraSignalLog />
    </div>
  );
};

export default Manara;
