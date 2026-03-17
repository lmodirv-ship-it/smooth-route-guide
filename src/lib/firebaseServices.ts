/**
 * Firebase services layer — typed helpers for all Firestore collections.
 * Single source of truth for collection names and document schemas.
 */

import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, setDoc, serverTimestamp,
  onSnapshot, QueryConstraint, Timestamp,
} from "firebase/firestore";
import {
  ref, uploadBytes, getDownloadURL,
} from "firebase/storage";
import { db, storage, auth } from "./firebase";

// ─── Collection Names ───
export const COLLECTIONS = {
  users: "users",
  drivers: "drivers",
  clients: "clients",
  delivery_agents: "delivery_agents",
  call_center_agents: "call_center_agents",
  admins: "admins",
  restaurants: "restaurants",
  restaurant_categories: "restaurant_categories",
  menu_items: "menu_items",
  orders: "orders",
  order_items: "order_items",
  deliveries: "deliveries",
  order_status_history: "order_status_history",
  notifications: "notifications",
  app_settings: "app_settings",
} as const;

// ─── Types ───
export type UserRole = "admin" | "call_center" | "client" | "driver" | "delivery";

export interface UserDoc {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  city: string;
  status: string;
  photoURL: string;
  createdAt: any;
  lastLoginAt: any;
  profileCompleted: boolean;
}

export interface DriverDoc {
  uid: string;
  fullName: string;
  phone: string;
  email: string;
  vehicleType: string;
  vehiclePlate: string;
  licenseNumber: string;
  city: string;
  isOnline: boolean;
  isAvailable: boolean;
  rating: number;
  totalTrips: number;
  createdAt: any;
}

export interface ClientDoc {
  uid: string;
  fullName: string;
  phone: string;
  email: string;
  city: string;
  defaultAddress: string;
  homeAddress: string;
  workAddress: string;
  createdAt: any;
}

export interface DeliveryAgentDoc {
  uid: string;
  fullName: string;
  phone: string;
  email: string;
  vehicleType: string;
  city: string;
  isOnline: boolean;
  isAvailable: boolean;
  createdAt: any;
}

export interface RestaurantDoc {
  name: string;
  slug: string;
  description: string;
  imageURL: string;
  coverURL: string;
  city: string;
  address: string;
  phone: string;
  categoryId: string;
  isActive: boolean;
  rating: number;
  deliveryFee: number;
  estimatedDeliveryTime: string;
  createdAt: any;
}

export interface MenuItemDoc {
  restaurantId: string;
  categoryId: string;
  name: string;
  description: string;
  imageURL: string;
  price: number;
  comparePrice: number;
  isAvailable: boolean;
  isPopular: boolean;
  createdAt: any;
}

export interface OrderDoc {
  orderNumber: string;
  clientId: string;
  restaurantId: string;
  assignedDriverId: string;
  assignedDeliveryAgentId: string;
  callCenterAgentId: string;
  status: string;
  paymentMethod: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  notes: string;
  pickupAddress: string;
  deliveryAddress: string;
  clientPhone: string;
  createdAt: any;
  updatedAt: any;
}

// ─── Generic helpers ───
export async function getCollection<T = any>(
  col: string,
  constraints: QueryConstraint[] = []
): Promise<(T & { id: string })[]> {
  const q = query(collection(db, col), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T & { id: string }));
}

export async function getDocument<T = any>(
  col: string,
  docId: string
): Promise<(T & { id: string }) | null> {
  const snap = await getDoc(doc(db, col, docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

export async function addDocument<T = any>(col: string, data: T): Promise<string> {
  const docRef = await addDoc(collection(db, col), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function setDocument<T = any>(col: string, docId: string, data: T, merge = true) {
  await setDoc(doc(db, col, docId), data, { merge });
}

export async function updateDocument(col: string, docId: string, data: any) {
  await updateDoc(doc(db, col, docId), data);
}

export async function deleteDocument(col: string, docId: string) {
  await deleteDoc(doc(db, col, docId));
}

// ─── Realtime listener ───
export function listenCollection(
  col: string,
  callback: (docs: any[]) => void,
  constraints: QueryConstraint[] = []
) {
  const q = query(collection(db, col), ...constraints);
  return onSnapshot(q, (snap) => {
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(docs);
  });
}

// ─── Storage helpers ───
export async function uploadFile(path: string, file: File): Promise<string> {
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ─── User creation helpers ───
export async function createUserDocument(uid: string, data: Partial<UserDoc>) {
  const userData: UserDoc = {
    uid,
    fullName: data.fullName || "",
    email: data.email || "",
    phone: data.phone || "",
    role: data.role || "client",
    city: data.city || "",
    status: "active",
    photoURL: data.photoURL || "",
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    profileCompleted: false,
  };
  await setDoc(doc(db, COLLECTIONS.users, uid), userData, { merge: true });
  return userData;
}

export async function createRoleDocument(uid: string, role: UserRole, extra: Record<string, any> = {}) {
  const baseData = {
    uid,
    fullName: extra.fullName || "",
    phone: extra.phone || "",
    email: extra.email || "",
    createdAt: serverTimestamp(),
  };

  switch (role) {
    case "driver":
      await setDoc(doc(db, COLLECTIONS.drivers, uid), {
        ...baseData,
        vehicleType: "",
        vehiclePlate: "",
        licenseNumber: "",
        city: "",
        isOnline: false,
        isAvailable: false,
        rating: 5.0,
        totalTrips: 0,
      }, { merge: true });
      break;
    case "client":
      await setDoc(doc(db, COLLECTIONS.clients, uid), {
        ...baseData,
        city: "",
        defaultAddress: "",
        homeAddress: "",
        workAddress: "",
      }, { merge: true });
      break;
    case "delivery":
      await setDoc(doc(db, COLLECTIONS.delivery_agents, uid), {
        ...baseData,
        vehicleType: "",
        city: "",
        isOnline: false,
        isAvailable: false,
      }, { merge: true });
      break;
    case "call_center":
      await setDoc(doc(db, COLLECTIONS.call_center_agents, uid), {
        ...baseData,
        employeeId: "",
        permissions: [],
      }, { merge: true });
      break;
    case "admin":
      await setDoc(doc(db, COLLECTIONS.admins, uid), baseData, { merge: true });
      break;
  }
}

// ─── Order helpers ───
export function generateOrderNumber(): string {
  const now = new Date();
  const y = now.getFullYear().toString().slice(-2);
  const m = (now.getMonth() + 1).toString().padStart(2, "0");
  const d = now.getDate().toString().padStart(2, "0");
  const r = Math.floor(Math.random() * 9000 + 1000);
  return `HN${y}${m}${d}-${r}`;
}

export async function createOrder(orderData: Partial<OrderDoc>, items: any[]) {
  const orderNumber = generateOrderNumber();
  const orderId = await addDocument(COLLECTIONS.orders, {
    ...orderData,
    orderNumber,
    status: "pending",
    paymentStatus: "pending",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Save order items
  for (const item of items) {
    await addDocument(COLLECTIONS.order_items, {
      orderId,
      ...item,
    });
  }

  // Add to status history
  await addDocument(COLLECTIONS.order_status_history, {
    orderId,
    status: "pending",
    changedBy: orderData.clientId || "",
    changedByRole: "client",
    note: "تم إنشاء الطلب",
    createdAt: serverTimestamp(),
  });

  return { orderId, orderNumber };
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
  changedBy: string,
  changedByRole: string,
  note?: string
) {
  await updateDocument(COLLECTIONS.orders, orderId, {
    status,
    updatedAt: serverTimestamp(),
  });

  await addDocument(COLLECTIONS.order_status_history, {
    orderId,
    status,
    changedBy,
    changedByRole,
    note: note || "",
    createdAt: serverTimestamp(),
  });
}

export async function sendNotification(
  userId: string,
  title: string,
  body: string,
  type: string,
  relatedId?: string
) {
  await addDocument(COLLECTIONS.notifications, {
    userId,
    title,
    body,
    type,
    relatedId: relatedId || "",
    isRead: false,
  });
}

// Re-export Firestore query helpers for convenience
export { where, orderBy, limit, serverTimestamp, onSnapshot, collection, doc, query } from "firebase/firestore";
