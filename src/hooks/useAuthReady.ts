import { useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const AUTH_TIMEOUT_MS = 8000;

type SignInWithPasswordArgs = {
  email: string;
  password: string;
};

type SignUpArgs = Parameters<typeof supabase.auth.signUp>[0];

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

export function getAuthTimeoutMessage(action: "session" | "login" | "signup" | "roles" = "session") {
  switch (action) {
    case "login":
      return "خدمة تسجيل الدخول بطيئة حالياً. أعد المحاولة خلال لحظات.";
    case "signup":
      return "خدمة إنشاء الحساب بطيئة حالياً. أعد المحاولة خلال لحظات.";
    case "roles":
      return "تعذر التحقق من صلاحيات الحساب حالياً. أعد المحاولة خلال لحظات.";
    default:
      return "تعذر التحقق من حالة الجلسة حالياً. أعد المحاولة خلال لحظات.";
  }
}

export async function getSessionWithTimeoutResult(timeoutMs = AUTH_TIMEOUT_MS): Promise<{ session: Session | null; timedOut: boolean }> {
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      timeoutMs,
      "AUTH_TIMEOUT"
    );

    if (error) {
      return { session: null, timedOut: isServiceTimeoutError(error) };
    }

    return { session: data.session ?? null, timedOut: false };
  } catch (error) {
    return { session: null, timedOut: isServiceTimeoutError(error) };
  }
}

export async function getSessionWithTimeout(timeoutMs = AUTH_TIMEOUT_MS): Promise<Session | null> {
  const { session } = await getSessionWithTimeoutResult(timeoutMs);
  return session;
}

export async function getUserRolesWithTimeout(userId: string, timeoutMs = AUTH_TIMEOUT_MS): Promise<string[]> {
  const { data, error } = await withTimeout(
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId),
    timeoutMs,
    "ROLES_TIMEOUT"
  );

  if (error) throw error;

  return (data ?? [])
    .map((row) => row.role)
    .filter((role) => typeof role === "string" && role.length > 0) as string[];
}

export async function hasFaceProfileWithTimeout(email: string, timeoutMs = 3000): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return false;

  const { data, error } = await withTimeout(
    supabase
      .from("face_auth_profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle(),
    timeoutMs,
    "PROFILE_TIMEOUT"
  );

  if (error) throw error;
  return !!data;
}

export function signInWithPasswordWithTimeout(
  credentials: SignInWithPasswordArgs,
  timeoutMs = AUTH_TIMEOUT_MS
) {
  return withTimeout(
    supabase.auth.signInWithPassword(credentials),
    timeoutMs,
    "LOGIN_TIMEOUT"
  );
}

export function signUpWithTimeout(credentials: SignUpArgs, timeoutMs = AUTH_TIMEOUT_MS) {
  return withTimeout(
    supabase.auth.signUp(credentials),
    timeoutMs,
    "SIGNUP_TIMEOUT"
  );
}

export async function signOutWithTimeout(timeoutMs = 4000) {
  try {
    await withTimeout(supabase.auth.signOut(), timeoutMs, "SIGNOUT_TIMEOUT");
  } catch {
    // Sign-out fallback is best-effort only; never block the UI on it.
  }
}

export function useAuthReady(timeoutMs = AUTH_TIMEOUT_MS) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const currentSessionRef = useRef<Session | null>(null);
  const initialSyncCompleteRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    currentSessionRef.current = null;
    initialSyncCompleteRef.current = false;

    const applySession = (nextSession: Session | null, nextTimedOut = false) => {
      currentSessionRef.current = nextSession;
      if (!mounted) return;
      setSession(nextSession);
      setTimedOut(nextTimedOut && !nextSession);
      setReady(true);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        initialSyncCompleteRef.current = true;
        applySession(nextSession, false);
        return;
      }

      if (initialSyncCompleteRef.current) {
        applySession(null, false);
      }
    });

    void (async () => {
      const result = await getSessionWithTimeoutResult(timeoutMs);
      if (!mounted) return;

      initialSyncCompleteRef.current = true;

      if (currentSessionRef.current && !result.session) {
        setReady(true);
        setTimedOut(false);
        return;
      }

      applySession(result.session, result.timedOut);
    })();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [timeoutMs]);

  return {
    ready,
    session,
    timedOut,
    user: session?.user ?? null,
    isAuthenticated: !!session?.user,
  };
}
