import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Phone, MessageCircle, Loader2, Send, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useInAppCall } from "@/hooks/useInAppCall";
import InAppCallDialog from "@/components/calls/InAppCallDialog";
import deliveryLogo from "@/assets/hn-delivery-logo.jpeg";

const reasons = [
  { id: "order_issue", label: "مشكلة في الطلب", labelFr: "Problème de commande" },
  { id: "late_delivery", label: "تأخر التوصيل", labelFr: "Retard de livraison" },
  { id: "wrong_item", label: "منتج خاطئ", labelFr: "Mauvais article" },
  { id: "driver_issue", label: "مشكلة مع السائق", labelFr: "Problème avec le livreur" },
  { id: "payment", label: "مشكلة في الدفع", labelFr: "Problème de paiement" },
  { id: "other", label: "أخرى", labelFr: "Autre" },
];

const DeliverySupport = () => {
  const navigate = useNavigate();
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [callingAgent, setCallingAgent] = useState(false);
  const inAppCall = useInAppCall();

  const handleCallCenter = async () => {
    setCallingAgent(true);
    try {
      // Find an available call center agent
      const { data: agents } = await supabase
        .from("user_roles" as any)
        .select("user_id")
        .eq("role", "agent")
        .limit(5);

      if (!agents || agents.length === 0) {
        toast({ title: "لا يوجد وكلاء متاحون حالياً", variant: "destructive" });
        return;
      }

      // Pick first available agent
      const agentId = (agents[0] as any).user_id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, user_code, avatar_url")
        .eq("id", agentId)
        .maybeSingle();

      await inAppCall.startCall({
        id: agentId,
        name: profile?.user_code || profile?.name || "مركز الاتصال",
        avatarUrl: profile?.avatar_url,
      });
    } catch {
      toast({ title: "تعذر الاتصال بمركز المساعدة", variant: "destructive" });
    } finally {
      setCallingAgent(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason || !description.trim()) {
      toast({ title: "يرجى ملء جميع الحقول", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "يرجى تسجيل الدخول", variant: "destructive" });
        return;
      }

      await supabase.from("complaints").insert({
        user_id: user.id,
        category: selectedReason,
        description: description.trim(),
        priority: selectedReason === "driver_issue" ? "high" : "medium",
      });

      toast({ title: "تم إرسال طلب المساعدة ✅", description: "سيتواصل معك فريقنا قريباً" });
      setSelectedReason("");
      setDescription("");
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen delivery-bg" dir="rtl">
      <div className="bg-gradient-to-br from-info/80 via-info/60 to-info/40 pt-6 pb-8 px-5 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => navigate("/delivery")} className="p-2 rounded-xl bg-white/10 backdrop-blur-sm">
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center gap-2">
            <img src={deliveryLogo} alt="" className="w-8 h-8 rounded-full border border-white/30" />
            <div>
              <h1 className="text-lg font-bold text-white">مركز المساعدة</h1>
              <p className="text-xs text-white/60">Centre d'aide</p>
            </div>
          </div>
          <div className="w-9" />
        </div>

        {/* In-App Call to Call Center */}
        <button
          onClick={handleCallCenter}
          disabled={callingAgent || inAppCall.isInCall}
          className="w-full bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-3 hover:bg-white/20 transition-colors disabled:opacity-50"
        >
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <PhoneCall className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 text-right">
            <p className="text-sm font-bold text-white">اتصل بمركز المساعدة</p>
            <p className="text-xs text-white/60">مكالمة مباشرة داخل التطبيق</p>
          </div>
          <div className="bg-green-500/30 rounded-xl px-4 py-2 text-xs font-bold text-white">
            {callingAgent ? "جاري..." : "اتصال"}
          </div>
        </button>
      </div>

      <div className="px-5 mt-5 pb-10 space-y-4">
        {/* Reason Select */}
        <div>
          <h2 className="text-sm font-bold text-foreground mb-3">سبب التواصل</h2>
          <div className="grid grid-cols-2 gap-2">
            {reasons.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedReason(r.id)}
                className={`p-3 rounded-xl border text-right transition-all ${
                  selectedReason === r.id
                    ? "border-primary bg-primary/5"
                    : "border-border glass-card hover:border-primary/30"
                }`}
              >
                <p className="text-xs font-bold text-foreground">{r.label}</p>
                <p className="text-[10px] text-muted-foreground">{r.labelFr}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-sm text-muted-foreground block">وصف المشكلة</label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="صف مشكلتك بالتفصيل..."
            className="glass-card border-border rounded-xl min-h-[100px] text-right resize-none"
            maxLength={1000}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={loading || !selectedReason || !description.trim()}
          className="w-full h-12 rounded-xl gradient-primary text-primary-foreground font-bold gap-2 disabled:opacity-40"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <Send className="w-4 h-4" />
              إرسال رسالة
            </>
          )}
        </Button>
      </div>

      <InAppCallDialog
        incomingCall={inAppCall.incomingCall}
        activeCall={inAppCall.activeCall}
        localStream={inAppCall.localStream}
        remoteStream={inAppCall.remoteStream}
        isMuted={inAppCall.isMuted}
        isVideoEnabled={inAppCall.isVideoEnabled}
        callDuration={inAppCall.callDuration}
        connectionQuality={inAppCall.connectionQuality}
        onAccept={inAppCall.acceptCall}
        
        onEnd={inAppCall.endCall}
        onToggleMute={inAppCall.toggleMute}
        onToggleVideo={inAppCall.toggleVideo}
      />
    </div>
  );
};

export default DeliverySupport;
