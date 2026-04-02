import { useNavigate } from "react-router-dom";
import { Settings, Volume2, Radar } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useUserReference } from "@/hooks/useUserReference";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const DriverTopBarControls = () => {
  const navigate = useNavigate();
  const { driverCode, userCode } = useUserReference();
  const refCode = driverCode || userCode;
  const [avatar, setAvatar] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      const { data: profile } = await supabase.from("profiles").select("avatar_url, avg_rating").eq("id", user.id).maybeSingle();
      if (profile && mounted) {
        setAvatar(profile.avatar_url);
        setRating(Number(profile.avg_rating || 0));
      }
      // Check if driver has GPS (simple online check)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => mounted && setIsOnline(true),
          () => mounted && setIsOnline(false),
          { timeout: 3000 }
        );
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="flex items-center gap-2">
      {/* Driver avatar + ref */}
      <button onClick={() => navigate("/driver/profile")} className="relative flex items-center gap-1.5">
        <Avatar className="w-7 h-7 border border-primary/50">
          <AvatarImage src={avatar || undefined} />
          <AvatarFallback className="bg-primary text-primary-foreground text-[10px] font-bold">
            {refCode?.charAt(0)?.toUpperCase() || "S"}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background ${isOnline ? "bg-emerald-400" : "bg-red-500"}`} />
      </button>
      <span className="text-[11px] font-mono font-bold text-foreground">{refCode || "—"}</span>
      {rating > 0 && <span className="text-[10px] text-amber-400">{"★".repeat(Math.min(Math.round(rating), 5))}</span>}

      <div className="w-px h-4 bg-border/40" />

      {/* Settings */}
      <button onClick={() => navigate("/driver/settings")}
        className="p-1.5 rounded-full border border-border bg-secondary text-foreground hover:bg-muted transition-all">
        <Settings className="w-3.5 h-3.5" />
      </button>

      {/* Online status dot */}
      <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" : "bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]"}`} />
    </div>
  );
};

export default DriverTopBarControls;
