import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, PhoneCall, PhoneOff, Radio, Video, VideoOff, Wifi, WifiOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import VideoCallOverlay from "@/components/calls/VideoCallOverlay";
import type { CallViewState } from "@/hooks/useInAppCall";

export interface InAppCallDialogProps {
  incomingCall: CallViewState | null;
  activeCall: CallViewState | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  busy: boolean;
  callDuration?: number;
  connectionQuality?: "good" | "medium" | "poor";
  onAccept: () => void;
  onEnd: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
}

const getStatusLabel = (call: CallViewState | null) => {
  if (!call) return "";
  if (call.direction === "incoming") return "مكالمة واردة";
  if (call.status === "ringing") return "جارِ الاتصال...";
  if (call.status === "connecting") return "جاري الربط...";
  return "المكالمة جارية";
};

const formatDuration = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export default function InAppCallDialog({
  incomingCall,
  activeCall,
  localStream,
  remoteStream,
  isMuted,
  isVideoEnabled,
  busy,
  callDuration = 0,
  connectionQuality = "good",
  onAccept,
  onEnd,
  onToggleMute,
  onToggleVideo,
}: InAppCallDialogProps) {
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [pulsePhase, setPulsePhase] = useState(0);

  useEffect(() => {
    if (!remoteAudioRef.current) return;
    remoteAudioRef.current.srcObject = remoteStream;
    if (remoteStream) {
      void remoteAudioRef.current.play().catch(() => undefined);
    }
  }, [remoteStream]);

  // Pulse animation for ringing
  useEffect(() => {
    if (!incomingCall && activeCall?.status !== "ringing") return;
    const interval = setInterval(() => setPulsePhase(p => (p + 1) % 3), 600);
    return () => clearInterval(interval);
  }, [incomingCall, activeCall?.status]);

  const qualityColor = connectionQuality === "good" ? "text-emerald-400" : connectionQuality === "medium" ? "text-amber-400" : "text-red-400";

  return (
    <>
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* ─── Incoming Call ─── */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-center justify-center bg-background/80 backdrop-blur-xl p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.88, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="w-full max-w-sm rounded-[2rem] bg-card border border-border shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-8 text-center"
              dir="rtl"
            >
              {/* Animated ring pulse */}
              <div className="relative mx-auto mb-6 h-24 w-24">
                <motion.div
                  animate={{ scale: [1, 1.5, 1.5], opacity: [0.4, 0, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  className="absolute inset-0 rounded-full bg-primary/20"
                />
                <motion.div
                  animate={{ scale: [1, 1.3, 1.3], opacity: [0.3, 0, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                  className="absolute inset-0 rounded-full bg-primary/15"
                />
                <Avatar className="relative h-24 w-24 border-2 border-primary/40 shadow-[0_0_30px_hsl(var(--primary)/0.3)]">
                  <AvatarImage src={incomingCall.peer.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 text-2xl font-bold text-primary">
                    {incomingCall.peer.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </div>

              <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-2">
                <PhoneCall className="h-4 w-4 text-primary animate-pulse" />
                {getStatusLabel(incomingCall)}
              </p>
              <h3 className="text-2xl font-bold text-foreground mb-6">{incomingCall.peer.name}</h3>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={onEnd}
                  className="h-14 rounded-2xl text-base gap-2 shadow-lg"
                >
                  <PhoneOff className="h-5 w-5" />
                  رفض
                </Button>
                <Button
                  type="button"
                  onClick={onAccept}
                  disabled={busy}
                  className="h-14 rounded-2xl text-base gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/30"
                >
                  <PhoneCall className="h-5 w-5" />
                  رد
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Video Overlay ─── */}
      <AnimatePresence>
        {activeCall && isVideoEnabled && (
          <VideoCallOverlay
            localStream={localStream}
            remoteStream={remoteStream}
            peerName={activeCall.peer.name}
            isMuted={isMuted}
            isVideoEnabled={isVideoEnabled}
            onToggleMute={onToggleMute}
            onToggleVideo={onToggleVideo}
            onEndCall={onEnd}
          />
        )}
      </AnimatePresence>

      {/* ─── Active Audio Call (floating card) ─── */}
      <AnimatePresence>
        {activeCall && !isVideoEnabled && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.94 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="fixed bottom-28 right-4 z-[131] w-[22rem] max-w-[calc(100vw-2rem)] rounded-[1.8rem] bg-card border border-border shadow-[0_12px_40px_rgba(0,0,0,0.25)] p-5"
            dir="rtl"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-14 w-14 border border-border/70">
                  <AvatarImage src={activeCall.peer.avatarUrl || undefined} />
                  <AvatarFallback className="bg-primary/10 font-bold text-primary">
                    {activeCall.peer.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                {activeCall.status === "active" && (
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {activeCall.status === "active" ? (
                    <>
                      <span className="flex items-center gap-1">
                        <Wifi className={`h-3 w-3 ${qualityColor}`} />
                      </span>
                      <span className="font-mono font-bold text-primary text-sm">
                        {formatDuration(callDuration)}
                      </span>
                    </>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
                      {getStatusLabel(activeCall)}
                    </span>
                  )}
                </div>
                <h3 className="truncate text-lg font-bold text-foreground">{activeCall.peer.name}</h3>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onToggleMute}
                className={`h-12 rounded-xl gap-1.5 transition-all ${isMuted ? "bg-destructive/10 border-destructive/30 text-destructive" : ""}`}
              >
                {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {isMuted ? "إلغاء" : "كتم"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onToggleVideo}
                className="h-12 rounded-xl gap-1.5"
              >
                <Video className="h-4 w-4" />
                فيديو
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={onEnd}
                className="h-12 rounded-xl gap-1.5 shadow-md shadow-destructive/20"
              >
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
