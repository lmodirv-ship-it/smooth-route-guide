/**
 * Professional Call Center Call Modal
 * Shows during active calls with all controls:
 * mute, end, transfer, add note, redial
 */
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic, MicOff, PhoneOff, Phone, Radio, StickyNote,
  Forward, RotateCcw, Clock, User, Hash, Video, VideoOff,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import VideoCallOverlay from "@/components/calls/VideoCallOverlay";
import type { ActiveCallState, PartyType } from "@/hooks/useCallCenter";

const PARTY_LABELS: Record<PartyType, string> = {
  client: "عميل",
  driver: "سائق",
  delivery: "موظف توصيل",
  restaurant: "مطعم",
  store: "متجر",
};

const PARTY_COLORS: Record<PartyType, string> = {
  client: "bg-info/20 text-info",
  driver: "bg-success/20 text-success",
  delivery: "bg-warning/20 text-warning",
  restaurant: "bg-primary/20 text-primary",
  store: "bg-accent/20 text-accent-foreground",
};

const formatTimer = (seconds: number) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

interface CallCenterModalProps {
  activeCall: ActiveCallState | null;
  isMuted: boolean;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onEndCall: () => void;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onAddNote: (content: string) => void;
  onTransfer?: () => void;
  onRedial?: () => void;
}

export default function CallCenterModal({
  activeCall,
  isMuted,
  isVideoEnabled,
  localStream,
  remoteStream,
  onEndCall,
  onToggleMute,
  onToggleVideo,
  onAddNote,
  onTransfer,
  onRedial,
}: CallCenterModalProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState("");

  // Play remote audio
  useEffect(() => {
    if (!audioRef.current) return;
    audioRef.current.srcObject = remoteStream;
    if (remoteStream) void audioRef.current.play().catch(() => {});
  }, [remoteStream]);

  // Timer
  useEffect(() => {
    if (!activeCall) { setElapsed(0); return; }
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeCall.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeCall?.startedAt]);

  const handleSaveNote = () => {
    if (noteText.trim()) {
      onAddNote(noteText.trim());
      setNoteText("");
      setShowNotes(false);
    }
  };

  if (!activeCall) return <audio ref={audioRef} autoPlay playsInline />;

  const party = activeCall.party;
  const statusLabel = activeCall.status === "ringing" ? "جارٍ الاتصال..." :
    activeCall.status === "connecting" ? "جاري الربط..." : "المكالمة جارية";

  return (
    <>
      <audio ref={audioRef} autoPlay playsInline />

      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 30, scale: 0.95 }}
          className="fixed bottom-6 left-6 z-[140] w-[26rem] max-w-[calc(100vw-2rem)] glass-card rounded-[1.6rem] p-5 border border-primary/20 shadow-[0_8px_40px_hsl(var(--primary)/0.15)]"
          dir="rtl"
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <Avatar className="h-14 w-14 border-2 border-primary/30">
              <AvatarFallback className="bg-secondary text-lg font-bold text-foreground">
                {party.reference.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PARTY_COLORS[party.partyType]}`}>
                  {PARTY_LABELS[party.partyType]}
                </span>
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Radio className="h-3 w-3 text-primary animate-pulse" />
                  {statusLabel}
                </p>
              </div>
              <h3 className="text-lg font-bold text-foreground truncate">{party.name}</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Hash className="h-3 w-3" />{party.reference}</span>
                {party.phone && <span>{party.phone}</span>}
              </div>
            </div>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mb-4 py-2 rounded-xl bg-secondary/50">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xl font-mono font-bold text-foreground">{formatTimer(elapsed)}</span>
          </div>

          {/* Call Reference */}
          {activeCall.callReference && (
            <div className="flex items-center justify-center gap-1 mb-3 text-xs text-muted-foreground">
              <span>مرجع المكالمة:</span>
              <span className="font-mono font-bold text-foreground">{activeCall.callReference}</span>
            </div>
          )}

          {/* Controls */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleMute}
              className={`h-11 flex-col gap-1 ${isMuted ? "border-destructive/30 bg-destructive/10" : ""}`}
            >
              {isMuted ? <MicOff className="h-4 w-4 text-destructive" /> : <Mic className="h-4 w-4" />}
              <span className="text-[10px]">{isMuted ? "إلغاء" : "كتم"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowNotes(true)}
              className="h-11 flex-col gap-1"
            >
              <StickyNote className="h-4 w-4 text-warning" />
              <span className="text-[10px]">ملاحظة</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onTransfer}
              className="h-11 flex-col gap-1"
            >
              <Forward className="h-4 w-4 text-info" />
              <span className="text-[10px]">تحويل</span>
            </Button>

            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onEndCall}
              className="h-11 flex-col gap-1"
            >
              <PhoneOff className="h-4 w-4" />
              <span className="text-[10px]">إنهاء</span>
            </Button>
          </div>

          {/* Redial button */}
          {activeCall.status === "ended" && onRedial && (
            <Button onClick={onRedial} variant="outline" className="w-full gap-2 mt-1">
              <RotateCcw className="h-4 w-4" /> إعادة الاتصال
            </Button>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Notes Dialog */}
      <Dialog open={showNotes} onOpenChange={setShowNotes}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة ملاحظة للمكالمة</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <Hash className="h-3 w-3" />
              <span>{activeCall.callReference} — {party.name} ({PARTY_LABELS[party.partyType]})</span>
            </div>
            <Textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="اكتب ملاحظتك هنا..."
              className="min-h-[100px] text-right"
            />
            <Button onClick={handleSaveNote} className="w-full">حفظ الملاحظة</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
