/**
 * ⚠️  LEGACY DIRECTORY
 *
 * Files in this folder depend on Firebase/Firestore and exist ONLY as a
 * transitional compatibility layer while remaining features are migrated
 * to Supabase.
 *
 * DO NOT add new code that imports from this directory.
 *
 * Files to migrate and then delete:
 *   - firebase.ts          — Firebase SDK initialisation
 *   - firestoreClient.ts   — Firestore query builder (partially proxies to Supabase)
 *   - firestoreAdapters.ts — Table name mapping utilities
 *   - orderService.ts      — Delivery order CRUD (used by DriverDelivery, DeliveryOrdersBoard)
 *   - autoAssignDriver.ts  — Auto-assignment logic (uses Firestore queries)
 *
 * Consumers still using these files:
 *   - src/hooks/useIncomingRideRequests.ts
 *   - src/pages/driver/DriverDelivery.tsx
 *   - src/components/orders/DeliveryOrdersBoard.tsx
 *
 * After those consumers are migrated to Supabase, delete this entire directory.
 */
