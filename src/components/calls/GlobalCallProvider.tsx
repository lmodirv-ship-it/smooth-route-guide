/**
 * GlobalCallProvider — mounts the in-app call hook + dialog at the app root,
 * so incoming WebRTC calls are received on EVERY page (not only those that
 * happen to render <FloatingChatButton /> or a tracking screen).
 *
 * This fixes the "calls don't ring" bug: previously the receiver only
 * registered the realtime listeners while inside specific pages.
 */
import { useInAppCall } from "@/hooks/useInAppCall";
import InAppCallDialog from "@/components/calls/InAppCallDialog";

export default function GlobalCallProvider() {
  const call = useInAppCall();

  // Render dialog only when a call is in progress to avoid extra DOM cost
  if (!call.userId) return null;

  return (
    <InAppCallDialog
      incomingCall={call.incomingCall}
      activeCall={call.activeCall}
      localStream={call.localStream}
      remoteStream={call.remoteStream}
      isMuted={call.isMuted}
      isVideoEnabled={call.isVideoEnabled}
      busy={call.busy}
      callDuration={call.callDuration}
      connectionQuality={call.connectionQuality}
      onAccept={call.acceptCall}
      onEnd={call.endCall}
      onToggleMute={call.toggleMute}
      onToggleVideo={call.toggleVideo}
    />
  );
}
