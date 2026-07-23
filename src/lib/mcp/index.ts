import { auth, defineMcp } from "@lovable.dev/mcp-js";
import health from "./tools/health";
import whoami from "./tools/whoami";
import listMyDeliveryOrders from "./tools/list-my-delivery-orders";
import listMyTrips from "./tools/list-my-trips";
import listMyReservations from "./tools/list-my-reservations";
import createDeliveryOrder from "./tools/create-delivery-order";
import cancelDeliveryOrder from "./tools/cancel-delivery-order";
import createReservation from "./tools/create-reservation";
import cancelReservation from "./tools/cancel-reservation";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "hn-driver-mcp",
  title: "HN Driver",
  version: "0.2.0",
  instructions:
    "Tools for the HN Driver platform. Use `health` to check server status, `whoami` to confirm identity, `list_my_*` to read the signed-in user's data, `create_delivery_order`/`cancel_delivery_order` to manage deliveries, and `create_reservation`/`cancel_reservation` for scheduled-route bookings. All reads and writes are scoped by RLS to the connected user.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    health,
    whoami,
    listMyDeliveryOrders,
    listMyTrips,
    listMyReservations,
    createDeliveryOrder,
    cancelDeliveryOrder,
    createReservation,
    cancelReservation,
  ],
});
