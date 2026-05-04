/**
 * CallContext — single source of truth for the in-app WebRTC call state.
 *
 * Why: previously every page that wanted to start/receive calls instantiated
 * its own `useInAppCall()`, which spawned duplicate Supabase realtime channels,
 * duplicate RTCPeerConnections, and meant pages without the hook never rang.
 *
 * Now `<CallProvider>` mounts the hook ONCE at the app root. Every consumer
 * (FloatingChatButton, tracking pages, support pages, call center) reads the
 * same state via `useCall()`.
 */
import { createContext, useContext, type ReactNode } from "react";
import { useInAppCall } from "@/hooks/useInAppCall";

type CallContextValue = ReturnType<typeof useInAppCall>;

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const call = useInAppCall();
  return <CallContext.Provider value={call}>{children}</CallContext.Provider>;
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used within <CallProvider>");
  }
  return ctx;
}
