/**
 * Referral Card — shows user's referral code and referral stats
 * Used in customer profile/hub pages
 */
import { useState, useEffect } from "react";
import { Users, Copy, Gift, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const ReferralCard = () => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralCount, setReferralCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get referral code
      const { data: profile } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .single();
      if (profile?.referral_code) setReferralCode(profile.referral_code);

      // Count referrals
      const { count } = await supabase
        .from("referrals")
        .select("id", { count: "exact", head: true })
        .eq("referrer_id", user.id)
        .eq("status", "completed") as any;
      setReferralCount(count || 0);
    };
    load();
  }, []);

  const handleCopy = () => {
    if (!referralCode) return;
    const shareText = `انضم لتطبيق HN Driver واحصل على خصم! استخدم رمز الإحالة: ${referralCode}`;
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    toast({ title: "تم نسخ رمز الإحالة! 📋" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralCode) return;
    const shareData = {
      title: "HN Driver - دعوة صديق",
      text: `انضم لتطبيق HN Driver واحصل على خصم! استخدم رمز الإحالة: ${referralCode}`,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleCopy();
      }
    } catch {
      handleCopy();
    }
  };

  if (!referralCode) return null;

  return (
    <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-5" dir="rtl">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-foreground">ادعُ أصدقاءك واربح!</h3>
      </div>
      
      <p className="text-sm text-muted-foreground mb-4">
        شارك رمز الإحالة مع أصدقائك. عندما يسجلون ويستخدمون التطبيق، تحصلان معاً على مكافأة في المحفظة! 🎉
      </p>

      {/* Referral Code */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-center">
          <code className="text-lg font-mono font-bold tracking-[0.3em] text-primary">{referralCode}</code>
        </div>
        <Button variant="outline" size="icon" onClick={handleCopy} className="h-12 w-12 rounded-xl">
          {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
        </Button>
      </div>

      <Button onClick={handleShare} className="w-full gap-2 rounded-xl h-11">
        <Users className="w-4 h-4" /> مشاركة رمز الإحالة
      </Button>

      {referralCount > 0 && (
        <div className="mt-3 text-center">
          <span className="text-sm text-muted-foreground">
            أحلت <span className="font-bold text-primary">{referralCount}</span> صديق حتى الآن
          </span>
        </div>
      )}
    </div>
  );
};

export default ReferralCard;
