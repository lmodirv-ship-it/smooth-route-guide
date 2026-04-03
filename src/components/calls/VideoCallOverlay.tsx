/**
 * Floating Video Call Overlay (Picture-in-Picture style)
 * Shows local + remote video in a draggable small window
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Video, VideoOff, Mic, MicOff, PhoneOff, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoCallOverlayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  peerName: string;
  isMuted: boolean;
  isVideoEnabled: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
}

export default function VideoCallOverlay({
  localStream,
  remoteStream,
  peerName,
  isMuted,
  isVideoEnabled,
  onToggleMute,
  onToggleVideo,
  onEndCall,
}: VideoCallOverlayProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  const hasRemoteVideo = remoteStream?.getVideoTracks().some(t => t.enabled && t.readyState === "live");
  const hasLocalVideo = localStream?.getVideoTracks().some(t => t.enabled && t.readyState === "live");

  const size = expanded
    ? "w-[28rem] h-[22rem]"
    : "w-[14rem] h-[11rem]";

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.8, x: 0, y: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className={`fixed top-16 right-4 z-[12002] ${size} rounded-2xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] border border-border/30 bg-black transition-all duration-300 cursor-grab active:cursor-grabbing`}
    >
      {/* Remote video (full area) */}
      {hasRemoteVideo ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/80">
          <div className="text-center">
            <VideoOff className="h-8 w-8 mx-auto text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">{peerName}</p>
          </div>
        </div>
      )}

      {/* Hidden audio element for remote stream */}
      <audio
        ref={el => {
          if (el && remoteStream) {
            el.srcObject = remoteStream;
            void el.play().catch(() => {});
          }
        }}
        autoPlay
        playsInline
        className="hidden"
      />

      {/* Local video (small PiP inside) */}
      {hasLocalVideo && (
        <div className="absolute bottom-12 right-2 w-16 h-12 rounded-lg overflow-hidden border border-white/20 shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
        </div>
      )}

      {/* Peer name overlay */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
        <span className="text-[10px] font-medium text-white bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm truncate max-w-[60%]">
          {peerName}
        </span>
        <button
          onClick={() => setExpanded(p => !p)}
          className="p-1 rounded-full bg-black/50 text-white hover:bg-black/70 backdrop-blur-sm transition"
        >
          {expanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
        </button>
      </div>

      {/* Controls bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 p-2 bg-gradient-to-t from-black/80 to-transparent">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onToggleMute}
          className={`h-8 w-8 rounded-full text-white hover:bg-white/20 ${isMuted ? "bg-destructive/60" : ""}`}
        >
          {isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onToggleVideo}
          className={`h-8 w-8 rounded-full text-white hover:bg-white/20 ${!isVideoEnabled ? "bg-destructive/60" : ""}`}
        >
          {isVideoEnabled ? <Video className="h-3.5 w-3.5" /> : <VideoOff className="h-3.5 w-3.5" />}
        </Button>
        <Button
          type="button"
          size="icon"
          variant="destructive"
          onClick={onEndCall}
          className="h-8 w-8 rounded-full"
        >
          <PhoneOff className="h-3.5 w-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}
