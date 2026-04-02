import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const AUTH_TIMEOUT_MS = 8000;

export async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = AUTH_TIMEOUT_MS,
  timeoutCode = "REQUEST_TIMEOUT"
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutCode)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function isServiceTimeoutError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");

  return (
    message.includes("AUTH_TIMEOUT") ||
    message.includes("REQUEST_TIMEOUT") ||
    message.includes("ROLES_TIMEOUT") ||
    message.includes("PROFILE_TIMEOUT") ||
    message.includes("LOGIN_TIMEOUT") ||
    message.includes("SIGNUP_TIMEOUT") ||
    message.includes("FACE_TIMEOUT") ||
    message.includes("Failed to fetch") ||
    message.includes("upstream request timeout")
  );
}

export async function getSessionWithTimeout(timeoutMs = AUTH_TIMEOUT_MS): Promise<Session | null> {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      timeoutMs,
      "AUTH_TIMEOUT"
    );

    if (error) return null;
    return data.session ?? null;
  } catch {
    return null;
  }
}

export function useAuthReady(timeoutMs = AUTH_TIMEOUT_MS) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setReady(true);
    });

    void (async () => {
      const nextSession = await getSessionWithTimeout(timeoutMs);
      if (!mounted) return;
      setSession(nextSession);
      setReady(true);
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [timeoutMs]);

  return {
    ready,
    session,
    user: session?.user ?? null,
    isAuthenticated: !!session?.user,
  };
}
