import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, PhoneCall, PhoneOff, Radio, Video, VideoOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VideoCallOverlay from "@/components/calls/VideoCallOverlay";
import type { CallViewState } from "@/hooks/useInAppCall";

interface InAppCallDialogProps {
  incomingCall: CallViewState | null;
  activeCall: CallViewState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  busy: boolean;
  onAccept: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const getStatusLabel = (call: CallViewState | null) => {
  if (!call) return "";
  if (call.direction === "incoming") return "مكالمة واردة";
  if (call.status === "ringing") return "جارِ الاتصال";
  if (call.status === "connecting") return "جاري الربط";
  return "المكالمة جارية";
};

export default function InAppCallDialog({
  incomingCall,
  activeCall,
  remoteStream,
  isMuted,
  busy,
  onAccept,
  onEnd,
  onToggleMute,
}: InAppCallDialogProps) {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!remoteAudioRef.current) return;

    remoteAudioRef.current.srcObject = remoteStream;
    if (remoteStream) {
      void remoteAudioRef.current.play().catch(() => undefined);
    }
  }, [remoteStream]);

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-background/70 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 18 }}
              className="glass-card w-full max-w-sm rounded-[1.75rem] p-6 text-center"
              dir="rtl"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/12 text-primary shadow-[0_0_24px_hsl(var(--info)/0.22)]">
                <PhoneCall className="h-7 w-7" />
              </div>

              <Avatar className="mx-auto mb-3 h-20 w-20 border border-border/70 shadow-[0_0_24px_hsl(var(--info)/0.2)]">
                <AvatarImage src={incomingCall.peer.avatarUrl || undefined} />
                <AvatarFallback className="bg-secondary text-lg font-bold text-foreground">
                  {incomingCall.peer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <p className="text-sm text-muted-foreground">{getStatusLabel(incomingCall)}</p>
              <h3 className="mt-1 text-xl font-bold text-foreground">{incomingCall.peer.name}</h3>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button type="button" variant="destructive" onClick={onEnd} className="h-12">
                  <PhoneOff className="h-4 w-4" />
                  رفض
                </Button>
                <Button type="button" onClick={onAccept} disabled={busy} className="h-12">
                  <PhoneCall className="h-4 w-4" />
                  رد
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeCall && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="fixed bottom-28 right-4 z-[131] w-[22rem] max-w-[calc(100vw-2rem)] rounded-[1.6rem] glass-card p-4"
            dir="rtl"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border border-border/70">
                <AvatarImage src={activeCall.peer.avatarUrl || undefined} />
                <AvatarFallback className="bg-secondary font-bold text-foreground">
                  {activeCall.peer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Radio className="h-3.5 w-3.5 text-info" />
                  {getStatusLabel(activeCall)}
                </p>
                <h3 className="truncate text-lg font-bold text-foreground">{activeCall.peer.name}</h3>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button type="button" variant="outline" onClick={onToggleMute} className="h-11" data-active={isMuted}>
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isMuted ? "إلغاء الكتم" : "كتم"}
              </Button>
              <Button type="button" variant="destructive" onClick={onEnd} className="h-11">
                <PhoneOff className="h-4 w-4" />
                إنهاء
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}