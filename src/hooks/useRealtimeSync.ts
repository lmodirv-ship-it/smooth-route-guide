/**
 * useRealtimeSync – Generic React hook for real-time table synchronisation.
 *
 * Usage:
 *   const { rows, loading } = useRealtimeSync<Driver>({
 *     table: "drivers",
 *     filters: { status: "active" },
 *     orderBy: "created_at",
 *   });
 *
 * Any INSERT / UPDATE / DELETE on the table triggers an automatic re-fetch,
 * keeping ALL 6 apps in sync without manual refresh.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { api, type RealtimeEvent } from "@/services/api";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface UseRealtimeSyncOptions {
  table: string;
  select?: string;
  filters?: Record<string, unknown>;
  orderBy?: string;
  ascending?: boolean;
  limit?: number;
  event?: RealtimeEvent;
  enabled?: boolean;
}

export function useRealtimeSync<T = unknown>(opts: UseRealtimeSyncOptions) {
  const {
    table,
    select,
    filters,
    orderBy,
    ascending,
    limit,
    event = "*",
    enabled = true,
  } = opts;

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await api.list<T>({ table, select, filters, orderBy, ascending, limit });
    setRows(data);
    setLoading(false);
  }, [enabled, table, select, JSON.stringify(filters), orderBy, ascending, limit]);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }

    fetchData();

    const channel: RealtimeChannel = api.subscribe({
      table,
      event,
      onData: () => fetchData(),
    });

    return () => {
      api.unsubscribe(channel);
    };
  }, [enabled, table, event, fetchData]);

  return { rows, loading, refresh: fetchData };
}
