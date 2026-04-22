import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Gift, Users, Trophy, Share2, Copy, MessageCircle, Mail, Send, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import PageMeta from "@/components/PageMeta";
import { trackEvent } from "@/components/TrackingScripts";
import { toast } from "sonner";

const Invite = () => {
  const [referralCode, setReferralCode] = useState<string>("");
  const [stats, setStats] = useState({ invited: 0, joined: 0, earned: 0 });
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from("profiles")
        .select("referral_code, name").eq("id", user.id).maybeSingle();
      if (profile?.referral_code) setReferralCode(profile.referral_code);

      const { data: refs } = await supabase.from("referrals")
        .select("status, reward_amount, reward_given").eq("referrer_id", user.id);
      const invited = refs?.length || 0;
      const joined = refs?.filter(r => r.status === "completed").length || 0;
      const earned = refs?.filter(r => r.reward_given).reduce((s, r) => s + Number(r.reward_amount || 0), 0) || 0;
      setStats({ invited, joined, earned });

      // Top inviters
      const { data: top } = await supabase.from("profiles")
        .select("name, referral_count").order("referral_count", { ascending: false }).limit(10);
      setLeaderboard(top || []);
    };
    load();
  }, []);

  const inviteUrl = referralCode
    ? `${window.location.origin}/?ref=${referralCode}&utm_source=referral&utm_medium=invite&utm_campaign=user_referral`
    : `${window.location.origin}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    trackEvent("Share", { method: "copy_link", content_type: "referral" });
    toast.success("تم نسخ الرابط ✅");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = `🚗 جرب HN Driver — أفضل تطبيق نقل وتوصيل! استخدم رابطي واحصل على رصيد مجاني: ${inviteUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    trackEvent("Share", { method: "whatsapp", content_type: "referral" });
  };

  const shareTelegram = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent("جرب HN Driver واحصل على رصيد مجاني!")}`, "_blank");
    trackEvent("Share", { method: "telegram", content_type: "referral" });
  };

  const shareEmail = () => {
    window.location.href = `mailto:?subject=${encodeURIComponent("انضم لـ HN Driver")}&body=${encodeURIComponent(`جرب أفضل تطبيق نقل وتوصيل: ${inviteUrl}`)}`;
    trackEvent("Share", { method: "email", content_type: "referral" });
  };

  return (
    <div className="min-h-screen gradient-dark px-4 py-8" dir="rtl">
      <PageMeta
        title="ادعُ أصدقاءك واربح رصيد مجاني | HN Driver"
        description="ادعُ أصدقاءك إلى HN Driver واحصل على 50 درهم لكل صديق ينضم. شاركهم رابطك المخصص الآن."
      />

      <div className="max-w-2xl mx-auto">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8">
          <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 glow-primary">
            <Gift className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">ادعُ أصدقاءك واربح</h1>
          <p className="text-muted-foreground">احصل على <span className="text-success font-bold">50 درهم</span> لكل صديق ينضم ويكمل رحلته الأولى</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass-card rounded-xl p-4 text-center">
            <Users className="w-5 h-5 text-info mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.invited}</p>
            <p className="text-xs text-muted-foreground">دعوة</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <Check className="w-5 h-5 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.joined}</p>
            <p className="text-xs text-muted-foreground">انضم</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <Trophy className="w-5 h-5 text-warning mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.earned}</p>
            <p className="text-xs text-muted-foreground">DH ربحت</p>
          </div>
        </div>

        {/* Link */}
        <div className="glass-card rounded-2xl p-5 mb-6">
          <p className="text-sm text-muted-foreground mb-2">رابط الإحالة الخاص بك:</p>
          <div className="bg-secondary rounded-lg p-3 mb-3 break-all text-xs text-foreground border border-border">
            {inviteUrl}
          </div>
          <Button onClick={copyLink} className="w-full gradient-primary text-primary-foreground h-11">
            {copied ? <><Check className="w-4 h-4 ml-2" /> تم النسخ</> : <><Copy className="w-4 h-4 ml-2" /> نسخ الرابط</>}
          </Button>
        </div>

        {/* Share buttons */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <Button onClick={shareWhatsApp} variant="outline" className="h-14 flex-col gap-1 bg-secondary border-border">
            <MessageCircle className="w-5 h-5 text-success" />
            <span className="text-xs">WhatsApp</span>
          </Button>
          <Button onClick={shareTelegram} variant="outline" className="h-14 flex-col gap-1 bg-secondary border-border">
            <Send className="w-5 h-5 text-info" />
            <span className="text-xs">Telegram</span>
          </Button>
          <Button onClick={shareEmail} variant="outline" className="h-14 flex-col gap-1 bg-secondary border-border">
            <Mail className="w-5 h-5 text-warning" />
            <span className="text-xs">Email</span>
          </Button>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-warning" />
              <h2 className="font-bold text-foreground">قائمة المتصدرين</h2>
            </div>
            <div className="space-y-2">
              {leaderboard.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? "bg-warning text-warning-foreground" : i === 1 ? "bg-muted text-foreground" : i === 2 ? "bg-orange-500/20 text-orange-500" : "bg-secondary text-muted-foreground"}`}>
                      {i + 1}
                    </div>
                    <span className="text-sm text-foreground">{u.name || "مستخدم"}</span>
                  </div>
                  <span className="text-sm font-bold text-primary">{u.referral_count || 0} دعوة</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invite;
