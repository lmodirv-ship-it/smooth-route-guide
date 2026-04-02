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
  const [isInTrial, setIsInTrial] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);

  useEffect(() => {
    const SUBSCRIPTION_START_DATE = new Date("2026-04-05T00:00:00Z");
    const fetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      // Before April 5, 2026 — everything is free
      if (Date.now() < SUBSCRIPTION_START_DATE.getTime()) {
        const daysLeft = Math.max(0, Math.ceil((SUBSCRIPTION_START_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        setIsInTrial(true);
        setTrialDaysLeft(daysLeft);
        setSubs([{
          id: "pre-launch",
          subscription_type: "credits",
          status: "free",
          credits_remaining: 999,
          credits_total: 999,
          starts_at: new Date().toISOString(),
          expires_at: SUBSCRIPTION_START_DATE.toISOString(),
          package_name: "مجاني حتى 5 أبريل",
        }]);
        const walletRes = await supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle();
        setWalletBalance(walletRes.data?.balance || 0);
        setLoading(false);
        return;
      }

      const now = new Date().toISOString();

      const [subsRes, walletRes, profileRes] = await Promise.all([
        supabase
          .from("customer_subscriptions")
          .select("*, customer_packages(name_ar, name_fr)")
          .eq("user_id", user.id)
          .eq("status", "active")
          .gte("expires_at", now)
          .order("expires_at", { ascending: false }) as any,
        supabase.from("wallet").select("balance").eq("user_id", user.id).maybeSingle(),
        supabase.from("profiles").select("created_at").eq("id", user.id).maybeSingle(),
      ]);

      if (subsRes.data && subsRes.data.length > 0) {
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
      } else {
        // Check 5-day free trial
        const createdAt = new Date(profileRes.data?.created_at || user.created_at || Date.now());
        const trialEnds = new Date(createdAt.getTime() + 5 * 24 * 60 * 60 * 1000);
        const daysLeft = Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        if (daysLeft > 0) {
          setIsInTrial(true);
          setTrialDaysLeft(daysLeft);
          setSubs([{
            id: "trial",
            subscription_type: "credits",
            status: "trial",
            credits_remaining: 999,
            credits_total: 999,
            starts_at: createdAt.toISOString(),
            expires_at: trialEnds.toISOString(),
            package_name: "تجربة مجانية (5 أيام)",
          }]);
        }
      }

      setWalletBalance(walletRes.data?.balance || 0);
      setLoading(false);
    };
    fetch();
  }, []);

  return { subs, walletBalance, loading, isInTrial, trialDaysLeft };
}
