type FirestoreRow = Record<string, any> & { id: string };

type TableAdapter = {
  collection: string;
  normalize?: (row: FirestoreRow) => Record<string, any>;
  serialize?: (payload: Record<string, any>, rowId?: string) => Record<string, any>;
  readOnly?: boolean;
};

const toIsoString = (value: any): string | null => {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number") return new Date(value).toISOString();
  return null;
};

const cleanObject = (value: Record<string, any>) =>
  Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

const normalizeDeliveryStatus = (status?: string) => {
  if (status === "cancelled") return "canceled";
  if (status === "in_transit") return "delivering";
  if (status === "picked_up") return "picked_up";
  if (status === "driver_assigned" || status === "confirmed") return status;
  if (status === "arrived") return "arrived_restaurant";
  return status || "pending";
};

const adapters: Record<string, TableAdapter> = {
  stores: {
    collection: "restaurants",
    normalize: (row) => ({
      ...row,
      id: row.id,
      name: row.name || "",
      description: row.description || "",
      address: row.address || "",
      phone: row.phone || "",
      category: row.category || row.categoryId || "restaurant",
      image_url: row.image_url || row.imageURL || "",
      is_open: row.is_open ?? row.isActive ?? true,
      rating: Number(row.rating ?? 0),
      delivery_fee: Number(row.delivery_fee ?? row.deliveryFee ?? 0),
      delivery_time_min: Number(row.delivery_time_min ?? 20),
      delivery_time_max: Number(row.delivery_time_max ?? 40),
      min_order: Number(row.min_order ?? 0),
      created_at: toIsoString(row.created_at || row.createdAt),
    }),
  },
  menu_categories: {
    collection: "restaurant_categories",
    normalize: (row) => ({
      ...row,
      id: row.id,
      store_id: row.store_id || row.restaurantId || row.restaurant_id || "",
      name_ar: row.name_ar || row.name || "",
      name_fr: row.name_fr || row.name || "",
      is_active: row.is_active ?? true,
      sort_order: Number(row.sort_order ?? 0),
      created_at: toIsoString(row.created_at || row.createdAt),
    }),
  },
  menu_items: {
    collection: "menu_items",
    normalize: (row) => ({
      ...row,
      id: row.id,
      store_id: row.store_id || row.restaurantId || row.restaurant_id || "",
      category_id: row.category_id || row.categoryId || "",
      name_ar: row.name_ar || row.name || "",
      name_fr: row.name_fr || row.name || "",
      description_ar: row.description_ar || row.description || "",
      description_fr: row.description_fr || row.description || "",
      image_url: row.image_url || row.imageURL || "",
      is_available: row.is_available ?? row.isAvailable ?? true,
      price: Number(row.price ?? 0),
      sort_order: Number(row.sort_order ?? 0),
      created_at: toIsoString(row.created_at || row.createdAt),
    }),
  },
  delivery_orders: {
    collection: "orders",
    normalize: (row) => ({
      ...row,
      id: row.id,
      user_id: row.user_id || row.clientId || row.userId || "",
      client_id: row.client_id || row.clientId || row.user_id || "",
      store_name: row.store_name || row.type || row.category || "طلب توصيل",
      category: row.category || row.type || row.delivery_type || "delivery",
      delivery_type: row.delivery_type || row.type || row.category || "delivery",
      status: normalizeDeliveryStatus(row.status),
      pickup_address: row.pickup_address || row.pickupAddress || row.store_name || "",
      delivery_address: row.delivery_address || row.deliveryAddress || "",
      pickup_lat: row.pickup_lat ?? row.pickupLat ?? null,
      pickup_lng: row.pickup_lng ?? row.pickupLng ?? null,
      delivery_lat: row.delivery_lat ?? row.deliveryLat ?? null,
      delivery_lng: row.delivery_lng ?? row.deliveryLng ?? null,
      estimated_price: Number(row.estimated_price ?? row.price ?? row.total ?? 0),
      final_price: Number(row.final_price ?? row.price ?? row.total ?? 0),
      driver_id: row.driver_id || row.driverId || null,
      created_at: toIsoString(row.created_at || row.createdAt),
      updated_at: toIsoString(row.updated_at || row.updatedAt),
      accepted_at: toIsoString(row.accepted_at || row.acceptedAt),
      delivered_at: toIsoString(row.delivered_at || row.deliveredAt),
      items: Array.isArray(row.items) ? row.items : [],
    }),
    serialize: (payload, rowId) => {
      const status = normalizeDeliveryStatus(payload.status);
      const userId = payload.user_id || payload.client_id || payload.clientId || payload.userId;
      const pickupAddress = payload.pickup_address || payload.pickupAddress || payload.store_name;
      const deliveryAddress = payload.delivery_address || payload.deliveryAddress;
      const price = payload.estimated_price ?? payload.final_price ?? payload.price ?? payload.total;

      return cleanObject({
        ...payload,
        id: rowId || payload.id,
        user_id: userId,
        clientId: userId,
        client_id: userId,
        store_name: payload.store_name || payload.type || payload.category,
        type: payload.type || payload.delivery_type || payload.category,
        category: payload.category || payload.type || payload.delivery_type,
        delivery_type: payload.delivery_type || payload.type || payload.category,
        status,
        pickup_address: pickupAddress,
        pickupAddress,
        delivery_address: deliveryAddress,
        deliveryAddress,
        pickup_lat: payload.pickup_lat ?? payload.pickupLat ?? null,
        pickupLat: payload.pickupLat ?? payload.pickup_lat ?? null,
        pickup_lng: payload.pickup_lng ?? payload.pickupLng ?? null,
        pickupLng: payload.pickupLng ?? payload.pickup_lng ?? null,
        delivery_lat: payload.delivery_lat ?? payload.deliveryLat ?? null,
        deliveryLat: payload.deliveryLat ?? payload.delivery_lat ?? null,
        delivery_lng: payload.delivery_lng ?? payload.deliveryLng ?? null,
        deliveryLng: payload.deliveryLng ?? payload.delivery_lng ?? null,
        estimated_price: price,
        final_price: payload.final_price ?? price,
        price,
        driver_id: payload.driver_id || payload.driverId || null,
        driverId: payload.driverId || payload.driver_id || null,
        accepted_at: payload.accepted_at || toIsoString(payload.acceptedAt),
        acceptedAt: payload.acceptedAt || payload.accepted_at || null,
        delivered_at: payload.delivered_at || toIsoString(payload.deliveredAt),
        deliveredAt: payload.deliveredAt || payload.delivered_at || null,
        updated_at: payload.updated_at || new Date().toISOString(),
      });
    },
  },
  order_items: { collection: "order_items" },
  ride_requests: { collection: "ride_requests" },
  trips: { collection: "trips" },
  drivers: {
    collection: "drivers",
    normalize: (row) => {
      const userId = row.user_id || row.uid || row.id;
      const status = row.status || (row.isOnline ? "active" : "inactive");
      return {
        ...row,
        id: row.id || userId,
        uid: userId,
        user_id: userId,
        name: row.name || row.fullName || "سائق",
        fullName: row.fullName || row.name || "سائق",
        phone: row.phone || "",
        email: row.email || "",
        license_no: row.license_no || row.licenseNumber || "",
        current_lat: row.current_lat ?? row.currentLat ?? null,
        current_lng: row.current_lng ?? row.currentLng ?? null,
        location_updated_at: toIsoString(row.location_updated_at || row.lastLocationUpdate),
        rating: Number(row.rating ?? 0),
        status,
        isOnline: status === "active",
        isAvailable: row.isAvailable ?? status === "active",
        created_at: toIsoString(row.created_at || row.createdAt),
      };
    },
    serialize: (payload, rowId) => {
      const userId = payload.user_id || payload.uid || rowId || payload.id;
      const status = payload.status || (payload.isOnline ? "active" : "inactive");
      const isOnline = status === "active";
      return cleanObject({
        ...payload,
        uid: userId,
        user_id: userId,
        fullName: payload.fullName || payload.name,
        name: payload.name || payload.fullName,
        currentLat: payload.currentLat ?? payload.current_lat,
        currentLng: payload.currentLng ?? payload.current_lng,
        current_lat: payload.current_lat ?? payload.currentLat,
        current_lng: payload.current_lng ?? payload.currentLng,
        status,
        isOnline,
        isAvailable: payload.isAvailable ?? isOnline,
        lastLocationUpdate: payload.lastLocationUpdate || payload.location_updated_at,
        created_at: payload.created_at || toIsoString(payload.createdAt),
      });
    },
  },
  profiles: {
    collection: "users",
    normalize: (row) => ({
      ...row,
      id: row.id || row.uid,
      uid: row.uid || row.id,
      user_id: row.uid || row.id,
      name: row.name || row.fullName || "",
      fullName: row.fullName || row.name || "",
      avatar_url: row.avatar_url || row.photoURL || "",
      photoURL: row.photoURL || row.avatar_url || "",
      created_at: toIsoString(row.created_at || row.createdAt),
      last_login_at: toIsoString(row.last_login_at || row.lastLoginAt),
      balance: Number(row.balance ?? 0),
    }),
    serialize: (payload, rowId) => cleanObject({
      ...payload,
      uid: rowId || payload.uid || payload.id,
      fullName: payload.fullName || payload.name,
      name: payload.name || payload.fullName,
      photoURL: payload.photoURL || payload.avatar_url,
      avatar_url: payload.avatar_url || payload.photoURL,
    }),
  },
  wallet: {
    collection: "users",
    normalize: (row) => ({
      id: row.id || row.uid,
      user_id: row.uid || row.id,
      balance: Number(row.balance ?? 0),
      updated_at: toIsoString(row.updated_at || row.lastLoginAt || row.createdAt) || new Date().toISOString(),
    }),
    serialize: (payload) => cleanObject({
      balance: Number(payload.balance ?? 0),
      updated_at: payload.updated_at || new Date().toISOString(),
    }),
  },
  earnings: {
    collection: "trips",
    readOnly: true,
    normalize: (row) => ({
      ...row,
      id: row.id,
      amount: Number(row.amount ?? row.fare ?? row.price ?? 0),
      date: row.date || (toIsoString(row.created_at || row.createdAt)?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)),
      driver_id: row.driver_id || row.driverId || "",
      created_at: toIsoString(row.created_at || row.createdAt),
      __skip: row.status && row.status !== "completed",
    }),
  },
  alerts: { collection: "alerts" },
  complaints: { collection: "complaints" },
  tickets: { collection: "tickets" },
  call_logs: { collection: "call_logs" },
  import_logs: { collection: "import_logs" },
  zones: { collection: "zones" },
  documents: { collection: "documents" },
  notifications: { collection: "notifications" },
  user_roles: { collection: "user_roles" },
};

const defaultNormalize = (row: FirestoreRow) => ({
  ...row,
  id: row.id,
  created_at: toIsoString(row.created_at || row.createdAt),
  updated_at: toIsoString(row.updated_at || row.updatedAt),
});

export const resolveFirestoreCollection = (table: string) => adapters[table]?.collection || table;

export const isFirestoreTableReadOnly = (table: string) => Boolean(adapters[table]?.readOnly);

export const normalizeFirestoreRow = (table: string, row: FirestoreRow) => {
  const adapter = adapters[table];
  const normalized = adapter?.normalize ? adapter.normalize(row) : defaultNormalize(row);
  return cleanObject(normalized);
};

export const serializeFirestoreRow = (table: string, payload: Record<string, any>, rowId?: string) => {
  const adapter = adapters[table];
  return cleanObject(adapter?.serialize ? adapter.serialize(payload, rowId) : payload);
};
