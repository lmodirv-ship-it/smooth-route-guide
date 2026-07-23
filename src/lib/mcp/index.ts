import { auth, defineMcp } from "@lovable.dev/mcp-js";
import whoami from "./tools/whoami";
import listMyDeliveryOrders from "./tools/list-my-delivery-orders";
import listMyTrips from "./tools/list-my-trips";
import listMyReservations from "./tools/list-my-reservations";

// Direct supabase.co issuer is required (not the .lovable.cloud proxy).
// Build it from VITE_SUPABASE_PROJECT_ID, which Vite inlines at build time so
// this module stays import-safe (no runtime env reads at top level).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hn-driver-mcp",
  title: "HN Driver",
  version: "0.1.0",
  instructions:
    "Tools for the HN Driver platform. Use `whoami` to confirm identity, `list_my_delivery_orders` and `list_my_trips` to read the signed-in user's activity, and `list_my_reservations` for scheduled-route bookings. All reads are scoped by RLS to the connected user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoami, listMyDeliveryOrders, listMyTrips, listMyReservations],
});
