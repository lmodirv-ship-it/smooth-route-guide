/**
 * Firestore wrapper that mimics Supabase's query builder API.
 * Maps old Supabase table names to new Firebase collection names.
 */

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  setDoc,
  serverTimestamp,
  onSnapshot,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { supabase as cloudSupabase } from "@/integrations/supabase/client";
import { db, auth, storage } from "./firebase";
import {
  isFirestoreTableReadOnly,
  normalizeFirestoreRow,
  resolveFirestoreCollection,
  serializeFirestoreRow,
} from "./firestoreAdapters";

type OrderDir = "asc" | "desc";
type RealtimeEvent = "*" | "INSERT" | "UPDATE" | "DELETE";

class FirestoreQueryBuilder<T = any> {
  private _table: string;
  private _collection: string;
  private _constraints: QueryConstraint[] = [];
  private _single = false;
  private _maybeSingle = false;
  private _limitVal: number | null = null;
  private _orderField: string | null = null;
  private _orderDir: OrderDir = "desc";
  private _mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private _payload: any = null;
  private _eqFilters: Array<{ field: string; value: any }> = [];
  private _neqFilters: Array<{ field: string; value: any }> = [];
  private _inFilters: Array<{ field: string; values: any[] }> = [];
  private _notNullFields: string[] = [];

  constructor(tableName: string) {
    this._table = tableName;
    this._collection = resolveFirestoreCollection(tableName);
  }

  select(_fields?: string, _opts?: { count?: string; head?: boolean }) {
    return this;
  }

  insert(data: any | any[]) {
    this._mode = "insert";
    this._payload = data;
    return this;
  }

  update(data: any) {
    this._mode = "update";
    this._payload = data;
    return this;
  }

  upsert(data: any | any[]) {
    this._mode = "upsert";
    this._payload = data;
    return this;
  }

  delete() {
    this._mode = "delete";
    return this;
  }

  eq(field: string, value: any) {
    this._eqFilters.push({ field, value });
    return this;
  }

  neq(field: string, value: any) {
    this._neqFilters.push({ field, value });
    return this;
  }

  in(field: string, values: any[]) {
    this._inFilters.push({ field, values });
    return this;
  }

  gte(field: string, value: any) {
    this._constraints.push(where(field, ">=", value));
    return this;
  }

  lte(field: string, value: any) {
    this._constraints.push(where(field, "<=", value));
    return this;
  }

  gt(field: string, value: any) {
    this._constraints.push(where(field, ">", value));
    return this;
  }

  lt(field: string, value: any) {
    this._constraints.push(where(field, "<", value));
    return this;
  }

  not(field: string, op: string, value: any) {
    if (op === "is" && value === null) this._notNullFields.push(field);
    return this;
  }

  order(field: string, opts?: { ascending?: boolean }) {
    this._orderField = field;
    this._orderDir = opts?.ascending ? "asc" : "desc";
    return this;
  }

  limit(n: number) {
    this._limitVal = n;
    return this;
  }

  single() {
    this._single = true;
    return this;
  }

  maybeSingle() {
    this._maybeSingle = true;
    return this;
  }

  async then(
    resolve: (value: { data: any; error: any; count?: number }) => void,
    reject?: (reason?: any) => void
  ) {
    try {
      const result = await this._execute();
      resolve(result);
    } catch (e: any) {
      if (reject) reject(e);
      else resolve({ data: null, error: e });
    }
  }

  private async _execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      switch (this._mode) {
        case "select":
          return await this._execSelect();
        case "insert":
          return await this._execInsert();
        case "update":
          return await this._execUpdate();
        case "upsert":
          return await this._execUpsert();
        case "delete":
          return await this._execDelete();
        default:
          return await this._execSelect();
      }
    } catch (error: any) {
      console.error(`Firestore ${this._mode} error on ${this._table}:`, error);
      return { data: null, error: { message: error.message || "Firestore error" } };
    }
  }

  private buildConstraints() {
    const constraints: QueryConstraint[] = [...this._constraints];

    for (const f of this._eqFilters) constraints.push(where(f.field, "==", f.value));
    for (const f of this._neqFilters) constraints.push(where(f.field, "!=", f.value));
    for (const f of this._inFilters) {
      if (f.values.length > 0 && f.values.length <= 30) constraints.push(where(f.field, "in", f.values));
    }
    if (this._orderField) constraints.push(orderBy(this._orderField, this._orderDir));
    if (this._limitVal) constraints.push(fbLimit(this._limitVal));

    return constraints;
  }

  private normalizeSnapshot(snapshot: Awaited<ReturnType<typeof getDocs>>) {
    let data = snapshot.docs.map((d) => {
      const row = Object.assign({ id: d.id }, d.data() as Record<string, any>);
      return normalizeFirestoreRow(this._table, row);
    });
    for (const field of this._notNullFields) data = data.filter((item: any) => item[field] != null);
    data = data.filter((item: any) => !item.__skip);
    return data;
  }

  private async _execSelect() {
    const snapshot = await getDocs(query(collection(db, this._collection), ...this.buildConstraints()));
    const data = this.normalizeSnapshot(snapshot);

    if (this._single) {
      return { data: data[0] || null, error: data.length === 0 ? { message: "Not found" } : null };
    }
    if (this._maybeSingle) {
      return { data: data[0] || null, error: null };
    }

    return { data, error: null, count: data.length };
  }

  private async _execInsert() {
    if (isFirestoreTableReadOnly(this._table)) {
      return { data: null, error: { message: `Table ${this._table} is read-only` } };
    }

    const ref = collection(db, this._collection);
    const items = Array.isArray(this._payload) ? this._payload : [this._payload];
    const results: any[] = [];

    for (const item of items) {
      const baseId = item.id || doc(ref).id;
      const docData = {
        ...serializeFirestoreRow(this._table, item, baseId),
        id: baseId,
        created_at: item.created_at || new Date().toISOString(),
        createdAt: item.createdAt || serverTimestamp(),
      };

      await setDoc(doc(db, this._collection, baseId), docData, { merge: true });
      results.push(normalizeFirestoreRow(this._table, { id: baseId, ...docData }));
    }

    return { data: Array.isArray(this._payload) ? results : results[0], error: null };
  }

  private async _execUpdate() {
    if (isFirestoreTableReadOnly(this._table)) {
      return { data: null, error: { message: `Table ${this._table} is read-only` } };
    }
    if (this._eqFilters.length === 0) {
      return { data: null, error: { message: "Update requires at least one eq filter" } };
    }

    const idFilter = this._eqFilters.find((f) => f.field === "id");
    const payload = serializeFirestoreRow(this._table, this._payload, idFilter?.value);

    if (idFilter) {
      const docRef = doc(db, this._collection, idFilter.value);
      await updateDoc(docRef, { ...payload, updated_at: new Date().toISOString() });
      return { data: { id: idFilter.value, ...payload }, error: null };
    }

    const snapshot = await getDocs(query(collection(db, this._collection), ...this._eqFilters.map((f) => where(f.field, "==", f.value))));
    const results: any[] = [];

    for (const d of snapshot.docs) {
      await updateDoc(d.ref, { ...payload, updated_at: new Date().toISOString() });
      const existingData = d.data() as Record<string, any>;
      const mergedData = Object.assign({ id: d.id }, existingData, payload as Record<string, any>);
      results.push(normalizeFirestoreRow(this._table, mergedData));
    }

    return { data: results, error: null };
  }

  private async _execUpsert() {
    if (isFirestoreTableReadOnly(this._table)) {
      return { data: null, error: { message: `Table ${this._table} is read-only` } };
    }

    const items = Array.isArray(this._payload) ? this._payload : [this._payload];
    const results: any[] = [];

    for (const item of items) {
      const id = item.id || doc(collection(db, this._collection)).id;
      const docRef = doc(db, this._collection, id);
      const payload = {
        ...serializeFirestoreRow(this._table, item, id),
        id,
        updated_at: new Date().toISOString(),
      };
      await setDoc(docRef, payload, { merge: true });
      results.push(normalizeFirestoreRow(this._table, { id, ...payload }));
    }

    return { data: Array.isArray(this._payload) ? results : results[0], error: null };
  }

  private async _execDelete() {
    if (isFirestoreTableReadOnly(this._table)) {
      return { data: null, error: { message: `Table ${this._table} is read-only` } };
    }

    const idFilter = this._eqFilters.find((f) => f.field === "id");
    if (idFilter) {
      await deleteDoc(doc(db, this._collection, idFilter.value));
      return { data: null, error: null };
    }

    const snapshot = await getDocs(query(collection(db, this._collection), ...this._eqFilters.map((f) => where(f.field, "==", f.value))));
    for (const d of snapshot.docs) await deleteDoc(d.ref);
    return { data: null, error: null };
  }
}

const firebaseAuthWrapper = {
  getUser: async () => {
    const user = auth.currentUser;
    if (!user) return { data: { user: null }, error: null };
    return {
      data: {
        user: {
          id: user.uid,
          email: user.email,
          user_metadata: { name: user.displayName },
        },
      },
      error: null,
    };
  },
  getSession: async () => {
    const user = auth.currentUser;
    if (!user) return { data: { session: null }, error: null };
    return {
      data: { session: { user: { id: user.uid, email: user.email } } },
      error: null,
    };
  },
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) callback("SIGNED_IN", { user: { id: user.uid, email: user.email } });
      else callback("SIGNED_OUT", null);
    });
    return { data: { subscription: { unsubscribe } } };
  },
  signOut: async () => {
    await auth.signOut();
    return { error: null };
  },
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return { data: { user: { id: cred.user.uid, email: cred.user.email } }, error: null };
    } catch (e: any) {
      return { data: { user: null }, error: { message: e.message } };
    }
  },
  signUp: async ({ email, password }: any) => {
    const { createUserWithEmailAndPassword } = await import("firebase/auth");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return { data: { user: { id: cred.user.uid, email: cred.user.email } }, error: null };
    } catch (e: any) {
      return { data: { user: null }, error: { message: e.message } };
    }
  },
};

class RealtimeChannel {
  private _name: string;
  private _listeners: Array<{ table: string; event: RealtimeEvent; callback: (payload: any) => void }> = [];
  private _unsubscribes: Unsubscribe[] = [];

  constructor(name: string) {
    this._name = name;
  }

  on(
    _event: string,
    opts: { event?: string; table?: string; schema?: string; [key: string]: any },
    callback: (payload: any) => void
  ) {
    if (!opts?.table) return this;
    this._listeners.push({
      table: opts.table,
      event: ((opts.event || "*").toUpperCase() as RealtimeEvent),
      callback,
    });
    return this;
  }

  subscribe() {
    const tables = [...new Set(this._listeners.map((listener) => listener.table))];

    tables.forEach((table) => {
      const collectionName = resolveFirestoreCollection(table);
      let initialized = false;

      const unsubscribe = onSnapshot(collection(db, collectionName), (snapshot) => {
        if (!initialized) {
          initialized = true;
          return;
        }

        snapshot.docChanges().forEach((change) => {
          const eventType = change.type === "added" ? "INSERT" : change.type === "modified" ? "UPDATE" : "DELETE";
          const nextRow =
            change.type === "removed"
              ? null
              : normalizeFirestoreRow(table, { id: change.doc.id, ...(change.doc.data() as Record<string, any>) });

          const payload = {
            eventType,
            table,
            new: nextRow,
            old: null,
          };

          this._listeners
            .filter((listener) => listener.table === table && (listener.event === "*" || listener.event === eventType))
            .forEach((listener) => listener.callback(payload));
        });
      });

      this._unsubscribes.push(unsubscribe);
    });

    console.log(`[Firestore Realtime] Channel "${this._name}" subscribed`);
    return this;
  }

  unsubscribeAll() {
    this._unsubscribes.forEach((unsubscribe) => unsubscribe());
    this._unsubscribes = [];
  }
}

const storageWrapper = {
  from: (bucket: string) => ({
    upload: async (path: string, file: File) => {
      try {
        const storageRef = ref(storage, `${bucket}/${path}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        return { data: { path, fullPath: `${bucket}/${path}`, publicUrl: url }, error: null };
      } catch (e: any) {
        return { data: null, error: { message: e.message } };
      }
    },
    getPublicUrl: (path: string) => {
      const projectId = "hn-driver-18963";
      const encodedPath = encodeURIComponent(`${bucket}/${path}`);
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${projectId}.firebasestorage.app/o/${encodedPath}?alt=media`;
      return { data: { publicUrl } };
    },
  }),
};

const functionsWrapper = {
  invoke: async (name: string, opts?: { body?: any }) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    try {
      const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        apikey: supabaseKey,
      };

      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
        method: "POST",
        headers,
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
      });
      const data = await res.json();
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },
};

export const firestoreDB = {
  from: (table: string) => new FirestoreQueryBuilder(table),
  auth: firebaseAuthWrapper,
  channel: (name: string) => new RealtimeChannel(name),
  removeChannel: (channel: { unsubscribeAll?: () => void }) => channel?.unsubscribeAll?.(),
  storage: storageWrapper,
  functions: functionsWrapper,
};

export { firestoreDB as supabase };
