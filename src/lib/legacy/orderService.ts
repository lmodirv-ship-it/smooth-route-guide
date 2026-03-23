import {
  addDoc,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type OrderStatus =
  | "pending"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "delivering"
  | "delivered"
  | "completed"
  | "canceled";

export interface OrderRecord {
  id: string;
  orderNumber: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  type: string;
  pickupAddress: string;
  deliveryAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  status: OrderStatus;
  createdAt: any;
  acceptedAt: any;
  updatedAt: any;
  etaMinutes: number | null;
  distanceKm: number | null;
  price: number | null;
  items: any[];
  rejectedBy: string[];
  driverCurrentLat: number | null;
  driverCurrentLng: number | null;
}

const ORDERS_COLLECTION = "orders";
const USERS_COLLECTION = "users";
const DRIVERS_COLLECTION = "drivers";
const HISTORY_COLLECTION = "order_status_history";

const ACTIVE_DRIVER_STATUSES: OrderStatus[] = ["accepted", "on_the_way", "arrived", "delivering", "delivered"];
const FINAL_STATUSES: OrderStatus[] = ["completed", "canceled"];

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; badge: string }> = {
  pending: { label: "بانتظار سائق", badge: "bg-warning/10 text-warning" },
  accepted: { label: "تم قبول الطلب", badge: "bg-info/10 text-info" },
  on_the_way: { label: "في الطريق", badge: "bg-info/10 text-info" },
  arrived: { label: "وصل السائق", badge: "bg-primary/10 text-primary" },
  delivering: { label: "بدأ التوصيل", badge: "bg-accent/10 text-accent" },
  delivered: { label: "تم التسليم", badge: "bg-success/10 text-success" },
  completed: { label: "مكتمل", badge: "bg-success/10 text-success" },
  canceled: { label: "ملغي", badge: "bg-destructive/10 text-destructive" },
};

export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return Number((earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
}

export function estimateEtaMinutes(distanceKm: number, averageSpeedKmH = 28) {
  return Math.max(1, Math.round((distanceKm / averageSpeedKmH) * 60));
}

export function formatOrderTime(value: any) {
  const date = toDate(value);
  if (!date) return "—";
  return date.toLocaleTimeString("ar-MA", { hour: "2-digit", minute: "2-digit" });
}

export function toDate(value: any) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();
  if (typeof value === "string" || typeof value === "number") return new Date(value);
  return null;
}

function generateOrderNumber() {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = `${now.getMonth() + 1}`.padStart(2, "0");
  const dd = `${now.getDate()}`.padStart(2, "0");
  const seq = Math.floor(Math.random() * 9000 + 1000);
  return `HN-${yy}${mm}${dd}-${seq}`;
}

function normalizeStatus(status: string | undefined): OrderStatus {
  if (status === "cancelled") return "canceled";
  if (status === "in_transit") return "delivering";
  if (status === "picked_up") return "delivering";
  if (status === "driver_assigned" || status === "confirmed") return "pending";
  if (status === "arrived_restaurant") return "arrived";
  return (status as OrderStatus) || "pending";
}

function normalizeOrder(id: string, raw: Record<string, any>): OrderRecord {
  return {
    id,
    orderNumber: raw.orderNumber || raw.order_number || `HN-${id.slice(0, 6).toUpperCase()}`,
    clientId: raw.clientId || raw.user_id || raw.userId || "",
    clientName: raw.clientName || raw.userName || raw.client_name || "عميل",
    clientPhone: raw.clientPhone || raw.userPhone || raw.client_phone || "",
    driverId: raw.driverId || raw.driver_id || null,
    driverName: raw.driverName || raw.driver_name || null,
    driverPhone: raw.driverPhone || raw.driver_phone || null,
    type: raw.type || raw.category || raw.delivery_type || "توصيل",
    pickupAddress: raw.pickupAddress || raw.pickup_address || raw.store_name || "",
    deliveryAddress: raw.deliveryAddress || raw.delivery_address || "",
    pickupLat: raw.pickupLat ?? raw.pickup_lat ?? null,
    pickupLng: raw.pickupLng ?? raw.pickup_lng ?? null,
    deliveryLat: raw.deliveryLat ?? raw.delivery_lat ?? null,
    deliveryLng: raw.deliveryLng ?? raw.delivery_lng ?? null,
    status: normalizeStatus(raw.status),
    createdAt: raw.createdAt || raw.created_at || null,
    acceptedAt: raw.acceptedAt || raw.accepted_at || null,
    updatedAt: raw.updatedAt || raw.updated_at || null,
    etaMinutes: raw.etaMinutes ?? raw.eta_minutes ?? null,
    distanceKm: raw.distanceKm ?? raw.distance_km ?? null,
    price: raw.price ?? raw.estimated_price ?? raw.total ?? null,
    items: Array.isArray(raw.items) ? raw.items : [],
    rejectedBy: Array.isArray(raw.rejectedBy) ? raw.rejectedBy : [],
    driverCurrentLat: raw.driverCurrentLat ?? raw.driver_current_lat ?? null,
    driverCurrentLng: raw.driverCurrentLng ?? raw.driver_current_lng ?? null,
  };
}

async function getUserProfile(uid: string) {
  const userSnap = await getDoc(doc(db, USERS_COLLECTION, uid));
  const driverSnap = await getDoc(doc(db, DRIVERS_COLLECTION, uid));
  const userData = userSnap.exists() ? userSnap.data() : {};
  const driverData = driverSnap.exists() ? driverSnap.data() : {};

  return {
    name: userData.fullName || driverData.fullName || auth.currentUser?.displayName || "",
    phone: userData.phone || driverData.phone || auth.currentUser?.phoneNumber || "",
    email: userData.email || auth.currentUser?.email || "",
  };
}

async function addHistory(orderId: string, status: OrderStatus, changedBy: string, changedByRole: string, note?: string) {
  await addDoc(collection(db, HISTORY_COLLECTION), {
    orderId,
    status,
    changedBy,
    changedByRole,
    note: note || "",
    createdAt: serverTimestamp(),
  });
}

export async function createDeliveryOrder(input: {
  clientId: string;
  type: string;
  pickupAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  deliveryAddress: string;
  deliveryLat: number | null;
  deliveryLng: number | null;
  price: number;
  items: any[];
}) {
  const client = await getUserProfile(input.clientId);
  const orderRef = doc(collection(db, ORDERS_COLLECTION));
  const orderNumber = generateOrderNumber();

  await setDoc(orderRef, {
    id: orderRef.id,
    orderNumber,
    clientId: input.clientId,
    clientName: client.name || "عميل",
    clientPhone: client.phone || "",
    driverId: null,
    driverName: null,
    driverPhone: null,
    type: input.type,
    pickupAddress: input.pickupAddress,
    deliveryAddress: input.deliveryAddress,
    pickupLat: input.pickupLat,
    pickupLng: input.pickupLng,
    deliveryLat: input.deliveryLat,
    deliveryLng: input.deliveryLng,
    status: "pending",
    createdAt: serverTimestamp(),
    acceptedAt: null,
    updatedAt: serverTimestamp(),
    etaMinutes: null,
    distanceKm: null,
    price: input.price,
    items: input.items,
    rejectedBy: [],
    driverCurrentLat: null,
    driverCurrentLng: null,

    // compatibility fields used by older screens
    user_id: input.clientId,
    category: "courier",
    store_name: input.type,
    pickup_address: input.pickupAddress,
    pickup_lat: input.pickupLat,
    pickup_lng: input.pickupLng,
    delivery_address: input.deliveryAddress,
    delivery_lat: input.deliveryLat,
    delivery_lng: input.deliveryLng,
    estimated_price: input.price,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    driver_id: null,
    accepted_at: null,
    eta_minutes: null,
    distance_km: null,
    driver_current_lat: null,
    driver_current_lng: null,
  });

  await addHistory(orderRef.id, "pending", input.clientId, "client", "تم إنشاء الطلب");
  return { id: orderRef.id, orderNumber };
}

export async function acceptOrder(orderId: string, driverUid: string) {
  const driver = await getUserProfile(driverUid);
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const driverRef = doc(db, DRIVERS_COLLECTION, driverUid);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) throw new Error("الطلب غير موجود");

    const order = orderSnap.data();
    if (normalizeStatus(order.status) !== "pending") {
      throw new Error("تم التعامل مع هذا الطلب بالفعل");
    }

    transaction.update(orderRef, {
      status: "accepted",
      driverId: driverUid,
      driverName: driver.name || "سائق",
      driverPhone: driver.phone || "",
      acceptedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      driver_id: driverUid,
      driver_name: driver.name || "سائق",
      driver_phone: driver.phone || "",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    transaction.set(driverRef, { isAvailable: false }, { merge: true });
  });

  await addHistory(orderId, "accepted", driverUid, "driver", "قام السائق بقبول الطلب");
}

export async function rejectOrder(orderId: string, driverUid: string) {
  await updateDoc(doc(db, ORDERS_COLLECTION, orderId), {
    rejectedBy: arrayUnion(driverUid),
    updatedAt: serverTimestamp(),
    updated_at: new Date().toISOString(),
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  actor: { uid: string; role: string },
  extra: Record<string, any> = {},
  note?: string
) {
  const orderRef = doc(db, ORDERS_COLLECTION, orderId);
  const snap = await getDoc(orderRef);
  if (!snap.exists()) throw new Error("الطلب غير موجود");

  const currentOrder = normalizeOrder(snap.id, snap.data());
  const payload: Record<string, any> = {
    status,
    updatedAt: serverTimestamp(),
    updated_at: new Date().toISOString(),
    ...extra,
  };

  if (status === "arrived") payload.arrivedAt = serverTimestamp();
  if (status === "delivered") payload.deliveredAt = serverTimestamp();
  if (status === "completed") payload.completedAt = serverTimestamp();
  if (status === "canceled") payload.canceledAt = serverTimestamp();

  await updateDoc(orderRef, payload);
  await addHistory(orderId, status, actor.uid, actor.role, note);

  if (FINAL_STATUSES.includes(status) && currentOrder.driverId) {
    await updateDoc(doc(db, DRIVERS_COLLECTION, currentOrder.driverId), {
      isAvailable: true,
      updatedAt: serverTimestamp(),
    });
  }
}

export function subscribeAllOrders(callback: (orders: OrderRecord[]) => void): Unsubscribe {
  const q = query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"), limit(100));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map((item) => normalizeOrder(item.id, item.data())));
  });
}

export function subscribeDriverPendingOrders(driverUid: string, callback: (orders: OrderRecord[]) => void): Unsubscribe {
  return subscribeAllOrders((orders) => {
    callback(
      orders.filter(
        (order) => order.status === "pending" && !(order.rejectedBy || []).includes(driverUid)
      )
    );
  });
}

export function subscribeDriverActiveOrder(driverUid: string, callback: (order: OrderRecord | null) => void): Unsubscribe {
  const q = query(collection(db, ORDERS_COLLECTION), where("driverId", "==", driverUid), orderBy("createdAt", "desc"), limit(10));
  return onSnapshot(q, (snapshot) => {
    const active = snapshot.docs
      .map((item) => normalizeOrder(item.id, item.data()))
      .find((order) => ACTIVE_DRIVER_STATUSES.includes(order.status));

    callback(active || null);
  });
}

export function subscribeClientLatestOrder(clientUid: string, callback: (order: OrderRecord | null) => void): Unsubscribe {
  const q = query(collection(db, ORDERS_COLLECTION), where("clientId", "==", clientUid), orderBy("createdAt", "desc"), limit(10));
  return onSnapshot(q, (snapshot) => {
    const latest = snapshot.docs
      .map((item) => normalizeOrder(item.id, item.data()))
      .find((order) => !FINAL_STATUSES.includes(order.status));

    callback(latest || null);
  });
}

export function subscribeDriverLocation(driverUid: string, callback: (location: { lat: number; lng: number } | null) => void): Unsubscribe {
  return onSnapshot(doc(db, DRIVERS_COLLECTION, driverUid), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    const data = snapshot.data();
    const lat = data.currentLat ?? data.current_lat ?? null;
    const lng = data.currentLng ?? data.current_lng ?? null;

    callback(lat != null && lng != null ? { lat: Number(lat), lng: Number(lng) } : null);
  });
}

export async function syncDriverOrderMetrics(driverUid: string, lat: number, lng: number) {
  const q = query(collection(db, ORDERS_COLLECTION), where("driverId", "==", driverUid), orderBy("createdAt", "desc"), limit(10));
  const snapshot = await getDocs(q);
  const active = snapshot.docs
    .map((item) => normalizeOrder(item.id, item.data()))
    .find((order) => ACTIVE_DRIVER_STATUSES.includes(order.status));

  if (!active) return;

  const target = active.status === "arrived" || active.status === "delivering"
    ? { lat: active.deliveryLat, lng: active.deliveryLng }
    : { lat: active.pickupLat, lng: active.pickupLng };

  if (target.lat == null || target.lng == null) return;

  const distanceKm = calculateDistanceKm(lat, lng, Number(target.lat), Number(target.lng));
  const etaMinutes = estimateEtaMinutes(distanceKm);

  await updateDoc(doc(db, ORDERS_COLLECTION, active.id), {
    driverCurrentLat: lat,
    driverCurrentLng: lng,
    distanceKm,
    etaMinutes,
    updatedAt: serverTimestamp(),
    driver_current_lat: lat,
    driver_current_lng: lng,
    distance_km: distanceKm,
    eta_minutes: etaMinutes,
    updated_at: new Date().toISOString(),
  });
}
