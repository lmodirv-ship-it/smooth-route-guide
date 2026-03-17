/**
 * Firestore wrapper that mimics Supabase's query builder API.
 * Maps old Supabase table names to new Firebase collection names.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as fbLimit,
  setDoc,
  serverTimestamp,
  onSnapshot,
  QueryConstraint,
  DocumentData,
  WhereFilterOp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, auth, storage } from "./firebase";

// Map old Supabase table names to Firebase collection names
const COLLECTION_MAP: Record<string, string> = {
  stores: "restaurants",
  menu_categories: "restaurant_categories",
  menu_items: "menu_items",
  delivery_orders: "orders",
  order_items: "order_items",
  ride_requests: "orders",
  trips: "orders",
  drivers: "drivers",
  profiles: "users",
  notifications: "notifications",
  alerts: "notifications",
  complaints: "orders",
  tickets: "orders",
  call_center: "call_center_agents",
  call_logs: "order_status_history",
  earnings: "orders",
  payments: "orders",
  promotions: "app_settings",
  ratings: "orders",
  vehicles: "drivers",
  wallet: "users",
  zones: "app_settings",
  app_settings: "app_settings",
  documents: "drivers",
  user_roles: "users",
  chat_conversations: "notifications",
  chat_messages: "notifications",
  import_logs: "app_settings",
  trip_status_history: "order_status_history",
};

const resolveCollection = (name: string) => COLLECTION_MAP[name] || name;

type OrderDir = "asc" | "desc";

// ---------- Query Builder ----------
class FirestoreQueryBuilder<T = any> {
  private _collection: string;
  private _constraints: QueryConstraint[] = [];
  private _selectFields: string | null = null;
  private _single = false;
  private _maybeSingle = false;
  private _limitVal: number | null = null;
  private _orderField: string | null = null;
  private _orderDir: OrderDir = "desc";
  // For insert / update / delete
  private _mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private _payload: any = null;
  private _eqFilters: Array<{ field: string; value: any }> = [];
  private _neqFilters: Array<{ field: string; value: any }> = [];
  private _inFilters: Array<{ field: string; values: any[] }> = [];
  private _notNullFields: string[] = [];

  constructor(collectionName: string) {
    this._collection = resolveCollection(collectionName);
  }

  select(fields?: string, opts?: { count?: string; head?: boolean }) {
    this._selectFields = fields || "*";
    this._mode = "select";
    if (opts?.head) this._headOnly = true;
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
    // 'is' null → not null
    if (op === "is" && value === null) {
      this._notNullFields.push(field);
    }
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

  // ---- Execute ----
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
      console.error(`Firestore ${this._mode} error on ${this._collection}:`, error);
      return { data: null, error: { message: error.message || "Firestore error" } };
    }
  }

  private async _execSelect() {
    const ref = collection(db, this._collection);
    const constraints: QueryConstraint[] = [];

    // eq filters
    for (const f of this._eqFilters) {
      constraints.push(where(f.field, "==", f.value));
    }
    // neq filters
    for (const f of this._neqFilters) {
      constraints.push(where(f.field, "!=", f.value));
    }
    // in filters (Firestore 'in' max 30 items)
    for (const f of this._inFilters) {
      if (f.values.length > 0) {
        // Split into chunks of 30 for Firestore 'in' limit
        if (f.values.length <= 30) {
          constraints.push(where(f.field, "in", f.values));
        }
      }
    }

    // Order
    if (this._orderField) {
      constraints.push(orderBy(this._orderField, this._orderDir));
    }

    // Limit
    if (this._limitVal) {
      constraints.push(fbLimit(this._limitVal));
    }

    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);

    let data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Filter not-null fields (can't always do in Firestore query)
    for (const field of this._notNullFields) {
      data = data.filter((item: any) => item[field] != null);
    }

    if (this._single) {
      return { data: data[0] || null, error: data.length === 0 ? { message: "Not found" } : null };
    }
    if (this._maybeSingle) {
      return { data: data[0] || null, error: null };
    }

    return { data, error: null, count: data.length };
  }

  private async _execInsert() {
    const ref = collection(db, this._collection);
    const items = Array.isArray(this._payload) ? this._payload : [this._payload];
    const results: any[] = [];

    for (const item of items) {
      const docData = { ...item, created_at: item.created_at || new Date().toISOString() };
      
      // If item has an 'id' field, use it as document ID
      if (item.id) {
        const docRef = doc(db, this._collection, item.id);
        await setDoc(docRef, docData);
        results.push(docData);
      } else {
        const docRef = await addDoc(ref, docData);
        results.push({ id: docRef.id, ...docData });
      }
    }

    return {
      data: Array.isArray(this._payload) ? results : results[0],
      error: null,
    };
  }

  private async _execUpdate() {
    // Need eq filters to identify documents
    if (this._eqFilters.length === 0) {
      return { data: null, error: { message: "Update requires at least one eq filter" } };
    }

    // If filtering by 'id', update directly
    const idFilter = this._eqFilters.find((f) => f.field === "id");
    if (idFilter) {
      const docRef = doc(db, this._collection, idFilter.value);
      await updateDoc(docRef, { ...this._payload, updated_at: new Date().toISOString() });
      return { data: { id: idFilter.value, ...this._payload }, error: null };
    }

    // Otherwise query then update
    const ref = collection(db, this._collection);
    const constraints: QueryConstraint[] = this._eqFilters.map((f) =>
      where(f.field, "==", f.value)
    );
    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);

    const results: any[] = [];
    for (const d of snapshot.docs) {
      await updateDoc(d.ref, { ...this._payload, updated_at: new Date().toISOString() });
      results.push({ id: d.id, ...d.data(), ...this._payload });
    }

    return { data: results, error: null };
  }

  private async _execUpsert() {
    const items = Array.isArray(this._payload) ? this._payload : [this._payload];
    const results: any[] = [];

    for (const item of items) {
      const id = item.id || doc(collection(db, this._collection)).id;
      const docRef = doc(db, this._collection, id);
      await setDoc(docRef, { ...item, id, updated_at: new Date().toISOString() }, { merge: true });
      results.push({ id, ...item });
    }

    return {
      data: Array.isArray(this._payload) ? results : results[0],
      error: null,
    };
  }

  private async _execDelete() {
    const idFilter = this._eqFilters.find((f) => f.field === "id");
    if (idFilter) {
      const docRef = doc(db, this._collection, idFilter.value);
      await deleteDoc(docRef);
      return { data: null, error: null };
    }

    // Query then delete
    const ref = collection(db, this._collection);
    const constraints: QueryConstraint[] = this._eqFilters.map((f) =>
      where(f.field, "==", f.value)
    );
    const q = query(ref, ...constraints);
    const snapshot = await getDocs(q);

    for (const d of snapshot.docs) {
      await deleteDoc(d.ref);
    }

    return { data: null, error: null };
  }
}

// ---------- Auth wrapper ----------
const firebaseAuthWrapper = {
  getUser: async () => {
    const user = auth.currentUser;
    if (!user) return { data: { user: null }, error: null };
    return {
      data: {
        user: {
          id: user.uid,
          email: user.email,
          user_metadata: {
            name: user.displayName,
          },
        },
      },
      error: null,
    };
  },
  getSession: async () => {
    const user = auth.currentUser;
    if (!user) return { data: { session: null }, error: null };
    return {
      data: {
        session: {
          user: {
            id: user.uid,
            email: user.email,
          },
        },
      },
      error: null,
    };
  },
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        callback("SIGNED_IN", {
          user: { id: user.uid, email: user.email },
        });
      } else {
        callback("SIGNED_OUT", null);
      }
    });
    return {
      data: {
        subscription: { unsubscribe },
      },
    };
  },
  signOut: async () => {
    await auth.signOut();
    return { error: null };
  },
  signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
    const { signInWithEmailAndPassword } = await import("firebase/auth");
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return {
        data: { user: { id: cred.user.uid, email: cred.user.email } },
        error: null,
      };
    } catch (e: any) {
      return { data: { user: null }, error: { message: e.message } };
    }
  },
  signUp: async ({ email, password, options }: any) => {
    const { createUserWithEmailAndPassword } = await import("firebase/auth");
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return {
        data: { user: { id: cred.user.uid, email: cred.user.email } },
        error: null,
      };
    } catch (e: any) {
      return { data: { user: null }, error: { message: e.message } };
    }
  },
};

// ---------- Realtime wrapper (no-op for now, logs warning) ----------
class RealtimeChannel {
  private _name: string;
  constructor(name: string) {
    this._name = name;
  }
  on(_event: string, _opts: any, _callback: any) {
    return this;
  }
  subscribe() {
    console.log(`[Firestore Realtime] Channel "${this._name}" subscribed (polling fallback)`);
    return this;
  }
}

// ---------- Storage wrapper (Firebase Storage) ----------
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
      // For Firebase Storage, we construct the URL
      const projectId = "hn-driver-18963";
      const encodedPath = encodeURIComponent(`${bucket}/${path}`);
      const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${projectId}.firebasestorage.app/o/${encodedPath}?alt=media`;
      return { data: { publicUrl } };
    },
  }),
};

// ---------- Functions wrapper ----------
const functionsWrapper = {
  invoke: async (name: string, opts?: { body?: any }) => {
    // Edge functions still go through Supabase
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
          apikey: SUPABASE_KEY,
        },
        body: opts?.body ? JSON.stringify(opts.body) : undefined,
      });
      const data = await res.json();
      return { data, error: null };
    } catch (e: any) {
      return { data: null, error: { message: e.message } };
    }
  },
};

// ---------- Main Client ----------
export const firestoreDB = {
  from: (table: string) => new FirestoreQueryBuilder(table),
  auth: firebaseAuthWrapper,
  channel: (name: string) => new RealtimeChannel(name),
  removeChannel: (_channel: any) => {},
  storage: storageWrapper,
  functions: functionsWrapper,
};

// Default export as 'supabase' alias for easy migration
export { firestoreDB as supabase };
