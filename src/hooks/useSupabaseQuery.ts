import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type QueryFilter = {
  field: string;
  op?: "==" | ">=" | "<=" | ">" | "<" | "!=" | "in";
  value: any;
};

/** @deprecated Use QueryFilter instead */
export type FirestoreFilter = QueryFilter;

const opMap: Record<string, string> = {
  "==": "eq",
  "!=": "neq",
  ">": "gt",
  ">=": "gte",
  "<": "lt",
  "<=": "lte",
};

/**
 * Generic Supabase table query hook with optional realtime subscription.
 */
export function useSupabaseQuery<T = any>(options: {
  table: string;
  filters?: QueryFilter[];
  orderByField?: string;
  orderDirection?: "asc" | "desc";
  limitCount?: number;
  realtime?: boolean;
  enabled?: boolean;
}) {
  const {
    table,
    filters = [],
    orderByField,
    orderDirection = "desc",
    limitCount,
    realtime = false,
    enabled = true,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(enabled);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let q = supabase.from(table as any).select("*");

      for (const filter of filters) {
        const op = filter.op || "==";
        if (op === "in") {
          q = q.in(filter.field, filter.value);
        } else {
          const method = opMap[op] || "eq";
          q = (q as any)[method](filter.field, filter.value);
        }
      }

      if (orderByField) {
        q = q.order(orderByField, { ascending: orderDirection === "asc" });
      }
      if (limitCount) {
        q = q.limit(limitCount);
      }

      const { data: rows, error } = await q;
      if (error) {
        console.error(`useSupabaseQuery[${table}]:`, error);
        setData([]);
      } else {
        setData((rows || []) as T[]);
      }
    } catch (err) {
      console.error(`useSupabaseQuery[${table}]:`, err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, table, JSON.stringify(filters), orderByField, orderDirection, limitCount]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }

    void fetchData();

    if (realtime) {
      const channel = supabase
        .channel(`collection-${table}-${Math.random()}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          void fetchData();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [enabled, realtime, table, fetchData]);

  return { data, loading, refresh: fetchData };
}

/** @deprecated Use useSupabaseQuery instead */
export const useFirestoreCollection = useSupabaseQuery;
