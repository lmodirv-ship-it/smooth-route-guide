import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerSub {
  id: string;
  subscription_type: "credits" | "monthly" | "annual";
  status: string;
  credits_remaining: number;
  credits_total: number;
  starts_at: string;
  expires_at: string;
  package_name: string;
}

export function useCustomerSubscription() {
  const [subs, setSubs] = useState<CustomerSub[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const now = new Date().toISOString();

      const [subsRes, walletRes] = await Promise.all([
        supabase
          .from("customer_subscriptions")
          .select("*, customer_packages(name_ar, name_fr)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .gte("expires_at", now)
          .order("expires_at", { ascending: false }) as any,
        supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);

      if (subsRes.data) {
        setSubs(subsRes.data.map((s: any) => ({
          id: s.id,
          subscription_type: s.subscription_type,
          status: s.status,
          credits_remaining: s.credits_remaining,
          credits_total: s.credits_total,
          starts_at: s.starts_at,
          expires_at: s.expires_at,
          package_name: s.customer_packages?.name_ar || "باقة",
        })));
      }

      setWalletBalance(walletRes.data?.balance || 0);
      setLoading(false);
    };
    fetch();
  }, []);

  return { subs, walletBalance, loading };
}
