/**
 * Call Center Engine Hook
 * Manages real WebRTC calls initiated by call center agents
 * to drivers, clients, restaurants, and delivery staff via reference codes.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { toast } from "sonner";

export type PartyType = "client" | "driver" | "delivery" | "restaurant" | "store";
export type AgentStatus = "available" | "in_call" | "busy" | "offline" | "break";
export type CallStatus = "ringing" | "connecting" | "active" | "ended" | "missed" | "rejected";

export interface CallParty {
  id: string;             // user ID (profiles.id)
  name: string;
  reference: string;      // e.g. A123456, S123456
  phone?: string;
  avatarUrl?: string | null;
  partyType: PartyType;
}

export interface ActiveCallState {
  callId: string;          // call_sessions.id
  callReference: string;   // L123456
  party: CallParty;
  status: CallStatus;
  direction: "outgoing" | "incoming";
  startedAt: number;       // Date.now()
  orderId?: string;
}

const buildIceServers = (): RTCIceServer[] => {
  const servers: RTCIceServer[] = [];

  // STUN
  const stunUrl = import.meta.env.VITE_STUN_URL;
  servers.push({ urls: stunUrl || "stun:stun.l.google.com:19302" });
  if (!stunUrl) servers.push({ urls: "stun:stun.cloudflare.com:3478" });

  // TURN (UDP/TCP)
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

  if (import.meta.env.DEV) {
    console.log("[WebRTC] iceServers:", servers.map(s => ({ urls: s.urls, hasCred: !!s.credential })));
  }

  return servers;
};

const rtcConfig: RTCConfiguration = { iceServers: buildIceServers() };

export function useCallCenter() {
  const { userId } = useCurrentUser();
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("available");
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const activeCallRef = useRef<ActiveCallState | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const processedSignalsRef = useRef<Set<string>>(new Set());

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  // --- Lookup party by reference code ---
  const lookupByReference = useCallback(async (reference: string): Promise<CallParty | null> => {
    const prefix = reference.charAt(0).toUpperCase();
    const code = reference.toUpperCase();

    // Client: A prefix -> profiles.user_code
    if (prefix === "A") {
      const { data } = await supabase
        .from("profiles")
        .select("id, name, phone, avatar_url, user_code")
        .eq("user_code", code)
        .maybeSingle();
      if (data) return { id: data.id, name: data.name || "عميل", reference: data.user_code || code, phone: data.phone || "", avatarUrl: data.avatar_url, partyType: "client" };
    }

    // Driver (ride): S prefix -> drivers.driver_code
    if (prefix === "S") {
      const { data } = await supabase
        .from("drivers")
        .select("id, user_id, driver_code, driver_type")
        .eq("driver_code", code)
        .maybeSingle();
      if (data) {
        const { data: profile } = await supabase.from("profiles").select("name, phone, avatar_url").eq("id", data.user_id).maybeSingle();
        return { id: data.user_id, name: profile?.name || "سائق", reference: data.driver_code || code, phone: profile?.phone || "", avatarUrl: profile?.avatar_url, partyType: "driver" };
      }
    }

    // Delivery driver: D prefix
    if (prefix === "D") {
      const { data } = await supabase
        .from("drivers")
        .select("id, user_id, driver_code, driver_type")
        .eq("driver_code", code)
        .maybeSingle();
      if (data) {
        const { data: profile } = await supabase.from("profiles").select("name, phone, avatar_url").eq("id", data.user_id).maybeSingle();
        return { id: data.user_id, name: profile?.name || "موظف توصيل", reference: data.driver_code || code, phone: profile?.phone || "", avatarUrl: profile?.avatar_url, partyType: "delivery" };
      }
    }

    // Restaurant: R prefix -> stores.store_code
    if (prefix === "R") {
      const { data } = await supabase
        .from("stores")
        .select("id, name, store_code, owner_id, phone")
        .eq("store_code", code)
        .maybeSingle();
      if (data) {
        return { id: data.owner_id || data.id, name: data.name || "مطعم", reference: data.store_code || code, phone: data.phone || "", avatarUrl: null, partyType: "restaurant" };
      }
    }

    return null;
  }, []);

  // --- Audio stream ---
  const ensureMedia = useCallback(async (withVideo = false) => {
    if (localStreamRef.current) {
      if (withVideo && !localStreamRef.current.getVideoTracks().length) {
        try {
          const vs = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 320, height: 240 } });
          vs.getVideoTracks().forEach(t => {
            localStreamRef.current!.addTrack(t);
            pcRef.current?.addTrack(t, localStreamRef.current!);
          });
        } catch {}
      }
      setLocalStream(localStreamRef.current);
      return localStreamRef.current;
    }
    const constraints: MediaStreamConstraints = { audio: true };
    if (withVideo) constraints.video = { facingMode: "user", width: 320, height: 240 };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const stopAudio = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
  }, []);

  // --- WebRTC ---
  const sendSignal = useCallback(async (callId: string, recipientId: string, signalType: string, payload: Record<string, unknown> = {}) => {
    if (!userId) return;
    await supabase.from("call_signals" as any).insert({
      call_id: callId,
      sender_id: userId,
      recipient_id: recipientId,
      signal_type: signalType,
      payload,
    } as any);
  }, [userId]);

  const flushCandidates = useCallback(async () => {
    if (!pcRef.current?.remoteDescription) return;
    for (const c of pendingCandidatesRef.current) {
      try { await pcRef.current.addIceCandidate(new RTCIceCandidate(c)); } catch {}
    }
    pendingCandidatesRef.current = [];
  }, []);

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.ontrack = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    pendingCandidatesRef.current = [];
    stopAudio();
    setRemoteStream(null);
    setLocalStream(null);
    setIsMuted(false);
    setIsVideoEnabled(false);
    setBusy(false);
    setActiveCall(null);
    setAgentStatus("available");
  }, [stopAudio]);

  const createPC = useCallback(async (callId: string, peerId: string, stream: MediaStream) => {
    pcRef.current?.close();
    const pc = new RTCPeerConnection(rtcConfig);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        if (import.meta.env.DEV && e.candidate.candidate.includes("relay")) {
          console.log("[WebRTC] ✅ RELAY candidate found:", e.candidate.candidate);
        }
        void sendSignal(callId, peerId, "ice", e.candidate.toJSON() as Record<string, unknown>);
      }
    };
    pc.ontrack = (e) => { if (e.streams[0]) setRemoteStream(e.streams[0]); };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "connected") {
        setActiveCall(prev => prev ? { ...prev, status: "active" } : prev);
        setBusy(false);
      }
      if (["failed", "disconnected", "closed"].includes(pc.connectionState) && activeCallRef.current) {
        setTimeout(() => { if (pc.connectionState !== "connected") cleanup(); }, 1200);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [cleanup, sendSignal]);

  // --- Update agent status ---
  const updateAgentStatus = useCallback(async (status: AgentStatus) => {
    setAgentStatus(status);
    if (!userId) return;
    await supabase.from("agent_sessions" as any)
      .update({ agent_status: status } as any)
      .eq("user_id", userId)
      .eq("status", "active");
  }, [userId]);

  // --- Start call by reference ---
  const startCallByReference = useCallback(async (reference: string, orderId?: string) => {
    if (!userId) { toast.error("سجّل الدخول أولاً"); return; }
    if (activeCallRef.current || busy) { toast.error("هناك مكالمة جارية"); return; }

    const party = await lookupByReference(reference);
    if (!party) { toast.error("لم يتم العثور على المرجع: " + reference); return; }

    return startCallToParty(party, orderId);
  }, [userId, busy]);

  // --- Start call to a known party ---
  const startCallToParty = useCallback(async (party: CallParty, orderId?: string) => {
    if (!userId) { toast.error("سجّل الدخول أولاً"); return; }
    if (activeCallRef.current || busy) { toast.error("هناك مكالمة جارية"); return; }

    try {
      setBusy(true);
      await updateAgentStatus("in_call");
      const stream = await ensureAudio();

      const callRes: any = await supabase.from("call_sessions" as any).insert({
        created_by: userId,
        caller_id: userId,
        callee_id: party.id,
        status: "ringing",
        metadata: { mode: "audio" },
        party_type: party.partyType,
        party_reference: party.reference,
        order_id: orderId || null,
      } as any).select("id, call_reference").single();

      if (callRes.error || !callRes.data?.id) throw callRes.error || new Error("call_create_failed");

      const callState: ActiveCallState = {
        callId: callRes.data.id,
        callReference: callRes.data.call_reference || "",
        party,
        status: "ringing",
        direction: "outgoing",
        startedAt: Date.now(),
        orderId,
      };

      setActiveCall(callState);

      const pc = await createPC(callRes.data.id, party.id, stream);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(callRes.data.id, party.id, "offer", offer as unknown as Record<string, unknown>);

      // Also log in call_logs
      await supabase.from("call_logs").insert({
        caller_name: "وكيل مركز الاتصال",
        caller_phone: "",
        reason: "اتصال من مركز الاتصال",
        call_type: "outgoing",
        status: "pending",
        agent_id: userId,
        user_id: party.id,
        call_session_id: callRes.data.id,
        party_type: party.partyType,
        party_reference: party.reference,
        order_id: orderId || null,
      });

    } catch (err) {
      console.error(err);
      toast.error("تعذر بدء المكالمة");
      cleanup();
    } finally {
      setBusy(false);
    }
  }, [userId, busy, cleanup, createPC, ensureAudio, sendSignal, updateAgentStatus]);

  // --- End call ---
  const endCall = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;

    try {
      await sendSignal(call.callId, call.party.id, "end", {});
      await supabase.from("call_sessions" as any).update({
        status: "ended",
        ended_at: new Date().toISOString(),
      } as any).eq("id", call.callId);

      // Update call_log duration
      const duration = Math.floor((Date.now() - call.startedAt) / 1000);
      await supabase.from("call_logs")
        .update({ status: "answered", duration })
        .eq("call_session_id", call.callId);
    } catch {}

    cleanup();
    await updateAgentStatus("available");
  }, [cleanup, sendSignal, updateAgentStatus]);

  // --- Toggle mute ---
  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = prev; });
      return !prev;
    });
  }, []);

  // --- Add note to current call ---
  const addCallNote = useCallback(async (content: string) => {
    const call = activeCallRef.current;
    if (!call || !userId || !content.trim()) return;

    await supabase.from("call_notes" as any).insert({
      call_session_id: call.callId,
      agent_id: userId,
      content: content.trim(),
    } as any);
    toast.success("تمت إضافة الملاحظة");
  }, [userId]);

  // --- Listen for signals ---
  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel(`cc-signals-${userId}-${Math.random().toString(36).slice(2,8)}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "call_signals",
        filter: `recipient_id=eq.${userId}`,
      }, async (payload: any) => {
        const row = payload.new;
        if (processedSignalsRef.current.has(row.id)) return;
        processedSignalsRef.current.add(row.id);

        if (!pcRef.current) {
          if (row.signal_type === "end" || row.signal_type === "reject") cleanup();
          return;
        }

        if (row.signal_type === "answer") {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(row.payload as RTCSessionDescriptionInit));
          await flushCandidates();
          setActiveCall(prev => prev ? { ...prev, status: "connecting" } : prev);
        } else if (row.signal_type === "ice") {
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(row.payload as RTCIceCandidateInit));
          } else {
            pendingCandidatesRef.current.push(row.payload as RTCIceCandidateInit);
          }
        } else if (row.signal_type === "end" || row.signal_type === "reject") {
          if (row.signal_type === "reject") toast.error("تم رفض المكالمة");
          cleanup();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId, cleanup, flushCandidates]);

  // --- Listen for session status changes ---
  useEffect(() => {
    if (!userId) return;

    const ch = supabase
      .channel(`cc-sessions-${userId}-${Math.random().toString(36).slice(2,8)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "call_sessions" }, (payload: any) => {
        const row = payload.new;
        const currentId = activeCallRef.current?.callId;
        if (!currentId || currentId !== row.id) return;

        if (row.status === "active") {
          setActiveCall(prev => prev ? { ...prev, status: "connecting" } : prev);
        }
        if (["ended", "rejected", "missed", "cancelled"].includes(row.status)) {
          cleanup();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [userId, cleanup]);

  // Cleanup on unmount
  useEffect(() => () => cleanup(), [cleanup]);

  return {
    agentStatus,
    activeCall,
    isMuted,
    busy,
    remoteStream,
    isInCall: Boolean(activeCall),
    lookupByReference,
    startCallByReference,
    startCallToParty,
    endCall,
    toggleMute,
    addCallNote,
    updateAgentStatus,
  };
}
