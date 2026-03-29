/**
 * Unified API Service Layer
 * ─────────────────────────
 * Centralised CRUD + real-time helpers shared by ALL 6 apps.
 * Import once in any app:
 *
 *   import { api } from "@/services/api";
 *
 * This module is **additive-only** – it never modifies existing code.
 */

import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ────────────────────────── Types ──────────────────────────

export interface ApiListOptions {
  /** Supabase table name */
  table: string;
  /** Optional columns (default "*") */
  select?: string;
  /** Simple equality filters */
  filters?: Record<string, unknown>;
  /** Order by field */
  orderBy?: string;
  /** Ascending (default false → desc) */
  ascending?: boolean;
  /** Limit rows returned */
  limit?: number;
}

export interface ApiMutateResult<T = unknown> {
  data: T | null;
  error: string | null;
}

// ─────────────────── Generic CRUD helpers ───────────────────

async function list<T = unknown>(opts: ApiListOptions): Promise<{ data: T[]; error: string | null }> {
  let query = supabase.from(opts.table as any).select(opts.select || "*");

  if (opts.filters) {
    for (const [key, value] of Object.entries(opts.filters)) {
      query = query.eq(key, value as any);
    }
  }

  if (opts.orderBy) {
    query = query.order(opts.orderBy, { ascending: opts.ascending ?? false });
  }

  if (opts.limit) {
    query = query.limit(opts.limit);
  }

  const { data, error } = await query;
  return { data: (data || []) as T[], error: error?.message || null };
}

async function getById<T = unknown>(table: string, id: string, select = "*"): Promise<ApiMutateResult<T>> {
  const { data, error } = await supabase
    .from(table as any)
    .select(select)
    .eq("id", id)
    .single();
  return { data: data as T | null, error: error?.message || null };
}

async function create<T = unknown>(table: string, values: Record<string, unknown>): Promise<ApiMutateResult<T>> {
  const { data, error } = await supabase
    .from(table as any)
    .insert(values as any)
    .select()
    .single();
  return { data: data as T | null, error: error?.message || null };
}

async function update<T = unknown>(table: string, id: string, values: Record<string, unknown>): Promise<ApiMutateResult<T>> {
  const { data, error } = await supabase
    .from(table as any)
    .update(values as any)
    .eq("id", id)
    .select()
    .single();
  return { data: data as T | null, error: error?.message || null };
}

async function remove(table: string, id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from(table as any).delete().eq("id", id);
  return { error: error?.message || null };
}

// ─────────────────── Real-time subscription ───────────────────

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface SubscribeOptions {
  table: string;
  event?: RealtimeEvent;
  filter?: string;
  onData: (payload: any) => void;
}

function subscribe(opts: SubscribeOptions): RealtimeChannel {
  const channelName = `api-sync-${opts.table}-${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event: opts.event || "*",
        schema: "public",
        table: opts.table,
        filter: opts.filter,
      },
      (payload) => opts.onData(payload)
    )
    .subscribe();

  return channel;
}

function unsubscribe(channel: RealtimeChannel) {
  supabase.removeChannel(channel);
}

// ─────────────────── Auth helpers ───────────────────

async function currentUser() {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

async function currentSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

// ─────────────────── Edge Function caller ───────────────────

async function callFunction<T = unknown>(
  name: string,
  body?: Record<string, unknown>
): Promise<ApiMutateResult<T>> {
  const { data, error } = await supabase.functions.invoke(name, {
    body: body ? JSON.stringify(body) : undefined,
  });
  return { data: data as T | null, error: error?.message || null };
}

// ─────────────────── Export unified API ───────────────────

export const api = {
  // CRUD
  list,
  getById,
  create,
  update,
  remove,

  // Real-time
  subscribe,
  unsubscribe,

  // Auth
  currentUser,
  currentSession,

  // Edge functions
  callFunction,

  // Raw client (escape hatch)
  supabase,
} as const;
