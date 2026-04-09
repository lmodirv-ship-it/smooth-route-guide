/**
 * Quick Chat Templates — pre-set messages for driver-customer communication
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const QUICK_MESSAGES = [
  { emoji: "🏍️", text: "أنا في الطريق إليك" },
  { emoji: "🍽️", text: "أنا في المطعم، جارٍ استلام الطلب" },
  { emoji: "⏳", text: "الطلب سيكون جاهزاً خلال دقائق" },
  { emoji: "📍", text: "أنا أمام العنوان، أين أجدك؟" },
  { emoji: "📞", text: "أرجو الرد على الاتصال" },
  { emoji: "🚗", text: "واصل، أنا قريب جداً" },
  { emoji: "⬇️", text: "أنزل من فضلك، أنا في الأسفل" },
  { emoji: "🙏", text: "شكراً لك، توصيل سعيد!" },
];

interface QuickChatMessagesProps {
  orderId: string;
  recipientId: string;
  senderId: string;
  onClose?: () => void;
}

const QuickChatMessages = ({ orderId, recipientId, senderId, onClose }: QuickChatMessagesProps) => {
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  const sendMessage = async (text: string) => {
    setSending(text);
    try {
      // Insert into community_messages as a quick notification
      // In a full implementation, this would use a dedicated chat table
      const { error } = await supabase.from("community_messages").insert({
        user_id: senderId,
        content: `[طلب ${orderId.slice(0, 6)}] ${text}`,
      });
      if (!error) {
        setSent(prev => new Set(prev).add(text));
        toast({ title: "تم إرسال الرسالة ✉️" });
      }
    } catch {
      toast({ title: "خطأ في الإرسال", variant: "destructive" });
    }
    setSending(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="bg-card border border-border rounded-2xl p-3 shadow-xl"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <MessageCircle className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-foreground">رسائل سريعة</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {QUICK_MESSAGES.map((msg) => {
          const isSent = sent.has(msg.text);
          const isSending = sending === msg.text;
          return (
            <motion.button
              key={msg.text}
              whileTap={{ scale: 0.95 }}
              onClick={() => !isSent && sendMessage(msg.text)}
              disabled={isSending || isSent}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs text-right transition-all ${
                isSent
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500"
                  : "bg-muted/50 border border-border hover:bg-muted text-foreground"
              }`}
            >
              <span className="text-sm">{msg.emoji}</span>
              <span className="flex-1 truncate">{msg.text}</span>
              {isSending && <Send className="w-3 h-3 animate-pulse text-primary" />}
              {isSent && <span className="text-[10px]">✓</span>}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default QuickChatMessages;
