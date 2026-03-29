import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserRef {
  userCode: string | null;
  driverCode: string | null;
  loading: boolean;
}

export function useUserReference(): UserRef {
  const [userCode, setUserCode] = useState<string | null>(null);
  const [driverCode, setDriverCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_code")
        .eq("id", user.id)
        .single();
      if (mounted && profile?.user_code) setUserCode(profile.user_code);

      const { data: driver } = await supabase
        .from("drivers")
        .select("driver_code")
        .eq("user_id", user.id)
        .maybeSingle();
      if (mounted && driver?.driver_code) setDriverCode(driver.driver_code);

      if (mounted) setLoading(false);
    };
    fetch();
    return () => { mounted = false; };
  }, []);

  return { userCode, driverCode, loading };
}
