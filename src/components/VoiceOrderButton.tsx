import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VoiceOrderButton = () => {
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [sending, setSending] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start();
      setRecording(true);
    } catch {
      toast.error("لا يمكن الوصول إلى الميكروفون");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendVoiceOrder = async () => {
    if (!audioBlob) return;
    setSending(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("يرجى تسجيل الدخول"); return; }

      const fileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("voice-orders")
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("voice-orders")
        .getPublicUrl(fileName);

      await supabase.from("voice_orders").insert({
        user_id: user.id,
        audio_url: urlData.publicUrl,
        status: "pending",
      } as any);

      toast.success("✅ تم إرسال طلبك الصوتي! سيتصل بك مركز الاتصال قريباً");
      setAudioBlob(null);
      setShowPanel(false);
    } catch (e: any) {
      toast.error("فشل إرسال الطلب الصوتي");
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  const cancel = () => {
    setAudioBlob(null);
    setRecording(false);
    setShowPanel(false);
    mediaRecorderRef.current?.stop();
  };

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className="p-1.5 rounded-full border border-border bg-secondary text-foreground hover:bg-orange-500 hover:text-white transition-all"
        title="طلب صوتي"
      >
        <Mic className="w-3.5 h-3.5" />
      </button>

      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl p-6 shadow-2xl"
          >
            <div className="text-center space-y-4" dir="rtl">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">🎙️ طلب صوتي</h3>
                <Button variant="ghost" size="icon" onClick={cancel}>
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground">
                سجّل رسالة صوتية بطلبك وسيتصل بك مركز الاتصال لتأكيد الطلب
              </p>

              {!audioBlob ? (
                <Button
                  size="lg"
                  onClick={recording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full ${recording ? "bg-red-500 hover:bg-red-600 animate-pulse" : "bg-primary hover:bg-primary/90"}`}
                >
                  {recording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </Button>
              ) : (
                <div className="space-y-3">
                  <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" onClick={() => setAudioBlob(null)}>
                      إعادة التسجيل
                    </Button>
                    <Button onClick={sendVoiceOrder} disabled={sending} className="gap-2">
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      إرسال الطلب
                    </Button>
                  </div>
                </div>
              )}

              {recording && (
                <p className="text-xs text-red-400 animate-pulse">● جاري التسجيل...</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceOrderButton;
