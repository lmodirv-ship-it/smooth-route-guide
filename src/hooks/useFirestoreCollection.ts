import { useCallback, useEffect, useMemo, useState } from "react";
import { collection, getDocs, onSnapshot, orderBy, query, where, limit as fbLimit, type QueryConstraint } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { normalizeFirestoreRow, resolveFirestoreCollection } from "@/lib/firestoreAdapters";

export type FirestoreFilter = {
  field: string;
  op?: "==" | ">=" | "<=" | ">" | "<" | "!=" | "in";
  value: any;
};

export function useFirestoreCollection<T = any>(options: {
  table: string;
  filters?: FirestoreFilter[];
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

  const constraints = useMemo<QueryConstraint[]>(() => {
    const next: QueryConstraint[] = [];
    for (const filter of filters) {
      const op = filter.op || "==";
      next.push(where(filter.field, op as any, filter.value));
    }
    if (orderByField) next.push(orderBy(orderByField, orderDirection));
    if (limitCount) next.push(fbLimit(limitCount));
    return next;
  }, [filters, orderByField, orderDirection, limitCount]);

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const snap = await getDocs(query(collection(db, resolveFirestoreCollection(table)), ...constraints));
    const rows = snap.docs
      .map((docSnap) => normalizeFirestoreRow(table, { id: docSnap.id, ...docSnap.data() }))
      .filter((row) => !(row as any).__skip) as T[];
    setData(rows);
    setLoading(false);
  }, [enabled, table, constraints]);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setLoading(false);
      return;
    }

    if (!realtime) {
      void fetchData();
      return;
    }

    setLoading(true);
    const unsubscribe = onSnapshot(query(collection(db, resolveFirestoreCollection(table)), ...constraints), (snap) => {
      const rows = snap.docs
        .map((docSnap) => normalizeFirestoreRow(table, { id: docSnap.id, ...docSnap.data() }))
        .filter((row) => !(row as any).__skip) as T[];
      setData(rows);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled, realtime, table, constraints, fetchData]);

  return { data, loading, refresh: fetchData };
}
