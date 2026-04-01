import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/useCurrentUser";

export interface CallPeer {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

export interface CallViewState {
  callId: string;
  peer: CallPeer;
  direction: "incoming" | "outgoing";
  status: "ringing" | "connecting" | "active";
}

/** Build ICE servers config from env vars (STUN + TURN/TURNS) */
function buildIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [
    { urls: import.meta.env.VITE_STUN_URL || "stun:stun.l.google.com:19302" },
    { urls: "stun:stun.cloudflare.com:3478" },
  ];

  const turnUrl = import.meta.env.VITE_TURN_URL as string | undefined;
  const turnsUrl = import.meta.env.VITE_TURNS_URL as string | undefined;
  const turnUser = import.meta.env.VITE_TURN_USERNAME as string | undefined;
  const turnPass = import.meta.env.VITE_TURN_PASSWORD as string | undefined;

  if (turnUrl && turnUser && turnPass) {
    servers.push({ urls: turnUrl, username: turnUser, credential: turnPass });
  }
  if (turnsUrl && turnUser && turnPass) {
    servers.push({ urls: turnsUrl, username: turnUser, credential: turnPass });
  }

  return servers;
}

const rtcConfig: RTCConfiguration = {
  iceServers: buildIceServers(),
};

const FINAL_STATUSES = new Set(["ended", "rejected", "missed", "cancelled"]);

export function useInAppCall() {
  const { userId } = useCurrentUser();
  const [incomingCall, setIncomingCall] = useState<CallViewState | null>(null);
  const [activeCall, setActiveCall] = useState<CallViewState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [busy, setBusy] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const activeCallRef = useRef<CallViewState | null>(null);
  const incomingCallRef = useRef<CallViewState | null>(null);
  const userIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  const fetchPeer = useCallback(async (peerId: string, fallback?: Partial<CallPeer>) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, avatar_url, user_code")
      .eq("id", peerId)
      .maybeSingle();

    return {
      id: peerId,
      name: data?.user_code || data?.name || fallback?.name || "مستخدم",
      avatarUrl: data?.avatar_url || fallback?.avatarUrl || null,
    } satisfies CallPeer;
  }, []);

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const resetPeer = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    pendingCandidatesRef.current = [];
    stopStream(localStream);
    setLocalStream(null);
    setRemoteStream(null);
    setIsMuted(false);
    setBusy(false);
  }, [localStream, stopStream]);

  const clearCallState = useCallback(() => {
    resetPeer();
    setIncomingCall(null);
    setActiveCall(null);
  }, [resetPeer]);

  const updateSession = useCallback(async (callId: string, patch: Record<string, unknown>) => {
    await supabase.from("call_sessions" as any).update(patch as any).eq("id", callId);
  }, []);

  const sendSignal = useCallback(async (callId: string, recipientId: string, signalType: string, payload: Record<string, unknown> = {}) => {
    if (!userIdRef.current) return;

    await supabase.from("call_signals" as any).insert({
      call_id: callId,
      sender_id: userIdRef.current,
      recipient_id: recipientId,
      signal_type: signalType,
      payload,
    } as any);
  }, []);

  const ensureMediaStream = useCallback(async (withVideo = false) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("unsupported_media");
    }

    if (localStream) {
      // Add video track if needed
      if (withVideo && !localStream.getVideoTracks().length) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
          videoStream.getVideoTracks().forEach(t => localStream.addTrack(t));
          // Add video track to peer connection
          if (pcRef.current) {
            videoStream.getVideoTracks().forEach(t => pcRef.current!.addTrack(t, localStream));
          }
        } catch { /* video not available */ }
      }
      return localStream;
    }

    const constraints: MediaStreamConstraints = { audio: true };
    if (withVideo) {
      constraints.video = { facingMode: "user", width: 320, height: 240 };
    }
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    setLocalStream(stream);
    return stream;
  }, [localStream]);

  const flushPendingCandidates = useCallback(async () => {
    if (!pcRef.current?.remoteDescription) return;

    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
      } catch {
        // ignore invalid candidate payloads
      }
    }

    pendingCandidatesRef.current = [];
  }, []);

  const createPeerConnection = useCallback(
    async (callId: string, peerId: string, stream: MediaStream) => {
      if (pcRef.current) {
        pcRef.current.close();
      }

      const peer = new RTCPeerConnection(rtcConfig);
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));

      peer.onicecandidate = (event) => {
        if (!event.candidate) return;
        void sendSignal(callId, peerId, "ice", event.candidate.toJSON() as Record<string, unknown>);
      };

      peer.ontrack = (event) => {
        const [streamTrack] = event.streams;
        if (streamTrack) {
          setRemoteStream(streamTrack);
        }
      };

      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") {
          setActiveCall((prev) => (prev ? { ...prev, status: "active" } : prev));
          setBusy(false);
          return;
        }

        if (["failed", "disconnected", "closed"].includes(peer.connectionState) && activeCallRef.current) {
          window.setTimeout(() => {
            if (peer.connectionState !== "connected") {
              clearCallState();
            }
          }, 1200);
        }
      };

      pcRef.current = peer;
      return peer;
    },
    [clearCallState, sendSignal],
  );

  const startCall = useCallback(
    async (peer: CallPeer) => {
      if (!userId) {
        toast.error("سجّل الدخول أولاً لبدء الاتصال");
        return;
      }

      if (activeCallRef.current || incomingCallRef.current || busy) {
        toast.error("هناك مكالمة جارية بالفعل");
        return;
      }

      try {
        setBusy(true);
        const stream = await ensureMediaStream();

        const callResponse: any = await supabase
          .from("call_sessions" as any)
          .insert({
            created_by: userId,
            caller_id: userId,
            callee_id: peer.id,
            status: "ringing",
            metadata: { mode: "audio" },
          } as any)
          .select("id")
          .single();

        const callRow = callResponse.data as { id?: string } | null;
        if (callResponse.error || !callRow?.id) throw callResponse.error || new Error("call_create_failed");

        setActiveCall({
          callId: callRow.id,
          peer,
          direction: "outgoing",
          status: "ringing",
        });

        const connection = await createPeerConnection(callRow.id, peer.id, stream);
        const offer = await connection.createOffer();
        await connection.setLocalDescription(offer);
        await sendSignal(callRow.id, peer.id, "offer", offer as unknown as Record<string, unknown>);
      } catch (error) {
        console.error(error);
        toast.error("تعذر بدء المكالمة الداخلية");
        clearCallState();
      } finally {
        setBusy(false);
      }
    },
    [busy, clearCallState, createPeerConnection, ensureAudioStream, sendSignal, userId],
  );

  const acceptCall = useCallback(async () => {
    if (!incomingCall || !userId) return;

    try {
      setBusy(true);
      const stream = await ensureMediaStream();
      const connection = await createPeerConnection(incomingCall.callId, incomingCall.peer.id, stream);

      const offerResponse: any = await supabase
        .from("call_signals" as any)
        .select("payload")
        .eq("call_id", incomingCall.callId)
        .eq("signal_type", "offer")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const offerSignal = offerResponse.data as { payload?: RTCSessionDescriptionInit } | null;

      if (!offerSignal?.payload) {
        throw new Error("offer_missing");
      }

      await connection.setRemoteDescription(new RTCSessionDescription(offerSignal.payload as RTCSessionDescriptionInit));

      const { data: queuedCandidates } = await supabase
        .from("call_signals" as any)
        .select("payload")
        .eq("call_id", incomingCall.callId)
        .eq("signal_type", "ice")
        .eq("sender_id", incomingCall.peer.id)
        .order("created_at", { ascending: true });

      pendingCandidatesRef.current = (queuedCandidates || []).map((item: any) => item.payload).filter(Boolean);
      await flushPendingCandidates();

      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);

      await sendSignal(incomingCall.callId, incomingCall.peer.id, "answer", answer as unknown as Record<string, unknown>);
      await updateSession(incomingCall.callId, {
        status: "active",
        started_at: new Date().toISOString(),
      });

      setActiveCall({ ...incomingCall, status: "connecting" });
      setIncomingCall(null);
    } catch (error) {
      console.error(error);
      toast.error("تعذر الرد على المكالمة");
      clearCallState();
    } finally {
      setBusy(false);
    }
  }, [incomingCall, userId, ensureAudioStream, createPeerConnection, flushPendingCandidates, sendSignal, updateSession, clearCallState]);

  const endCall = useCallback(async () => {
    const currentCall = activeCallRef.current || incomingCallRef.current;
    if (!currentCall) return;

    const isIncomingOnly = Boolean(incomingCallRef.current && !activeCallRef.current);
    const nextStatus = isIncomingOnly ? "rejected" : "ended";

    try {
      await sendSignal(currentCall.callId, currentCall.peer.id, nextStatus === "rejected" ? "reject" : "end", {});
      await updateSession(currentCall.callId, {
        status: nextStatus,
        ended_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(error);
    } finally {
      clearCallState();
    }
  }, [clearCallState, sendSignal, updateSession]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      localStream?.getAudioTracks().forEach((track) => {
        track.enabled = prev;
      });
      return !prev;
    });
  }, [localStream]);

  const toggleVideo = useCallback(async () => {
    if (!localStream) return;
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      // Toggle existing video tracks
      const newEnabled = !videoTracks[0].enabled;
      videoTracks.forEach(t => { t.enabled = newEnabled; });
      setIsVideoEnabled(newEnabled);
    } else {
      // Add video track
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
        videoStream.getVideoTracks().forEach(t => {
          localStream.addTrack(t);
          pcRef.current?.addTrack(t, localStream);
        });
        setIsVideoEnabled(true);
      } catch {
        toast.error("تعذر تشغيل الكاميرا");
      }
    }
  }, [localStream]);

  useEffect(() => {
    if (!userId) return;

    const sessionChannel = supabase
      .channel(`call-sessions-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "call_sessions" }, async (payload: any) => {
        const row = payload.new;
        if (row.callee_id !== userId || row.status !== "ringing") return;

        const peer = await fetchPeer(row.caller_id);
        setIncomingCall({
          callId: row.id,
          peer,
          direction: "incoming",
          status: "ringing",
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_sessions" }, async (payload: any) => {
        const row = payload.new;
        if (row.caller_id !== userId && row.callee_id !== userId) return;

        const currentCallId = activeCallRef.current?.callId || incomingCallRef.current?.callId;
        if (currentCallId !== row.id) return;

        if (row.status === "active") {
          setActiveCall((prev) => (prev ? { ...prev, status: "connecting" } : prev));
        }

        if (FINAL_STATUSES.has(row.status)) {
          if (row.status === "rejected" && row.caller_id === userId) {
            toast.error("تم رفض المكالمة");
          }

          clearCallState();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sessionChannel);
    };
  }, [clearCallState, fetchPeer, userId]);

  useEffect(() => {
    if (!userId) return;

    const signalChannel = supabase
      .channel(`call-signals-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "call_signals", filter: `recipient_id=eq.${userId}` },
        async (payload: any) => {
          const row = payload.new;

          if (processedSignalsRef.current.has(row.id)) return;
          processedSignalsRef.current.add(row.id);

          if (row.signal_type === "offer" && !incomingCallRef.current) {
            const callResponse: any = await supabase
              .from("call_sessions" as any)
              .select("id, caller_id, callee_id, status")
              .eq("id", row.call_id)
              .maybeSingle();

            const callRow = callResponse.data as { id: string; caller_id: string; callee_id: string; status: string } | null;

            if (callRow?.callee_id === userId && callRow?.status === "ringing") {
              const peer = await fetchPeer(callRow.caller_id);
              setIncomingCall({
                callId: callRow.id,
                peer,
                direction: "incoming",
                status: "ringing",
              });
            }
            return;
          }

          if (!pcRef.current) {
            if (row.signal_type === "end" || row.signal_type === "reject") {
              clearCallState();
            }
            return;
          }

          if (row.signal_type === "answer") {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(row.payload as RTCSessionDescriptionInit));
            await flushPendingCandidates();
            setActiveCall((prev) => (prev ? { ...prev, status: "connecting" } : prev));
            return;
          }

          if (row.signal_type === "ice") {
            if (pcRef.current.remoteDescription) {
              await pcRef.current.addIceCandidate(new RTCIceCandidate(row.payload as RTCIceCandidateInit));
            } else {
              pendingCandidatesRef.current.push(row.payload as RTCIceCandidateInit);
            }
            return;
          }

          if (row.signal_type === "end" || row.signal_type === "reject") {
            clearCallState();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(signalChannel);
    };
  }, [clearCallState, fetchPeer, flushPendingCandidates, userId]);

  useEffect(() => {
    return () => {
      clearCallState();
    };
  }, [clearCallState]);

  return {
    userId,
    incomingCall,
    activeCall,
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    busy,
    isInCall: Boolean(incomingCall || activeCall),
    startCall,
    acceptCall,
    endCall,
    toggleMute,
    toggleVideo,
  };
}