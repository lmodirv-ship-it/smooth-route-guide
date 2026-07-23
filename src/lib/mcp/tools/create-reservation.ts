import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "create_reservation",
  title: "Reserve seats on a route",
  description:
    "Create a seat reservation on a scheduled route for the signed-in user. Seat count is decremented by the DB trigger.",
  inputSchema: {
    route_id: z.string().uuid().describe("routes.id (UUID) of the scheduled route."),
    seats: z.number().int().min(1).max(10).default(1).describe("Number of seats to reserve (1-10)."),
    notes: z.string().trim().max(300).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ route_id, seats, notes }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await sb
      .from("reservations")
      .insert({
        route_id,
        user_id: userId,
        seats_reserved: seats ?? 1,
        notes: notes ?? null,
        status: "pending",
      })
      .select("id, reservation_code, route_id, seats_reserved, status, created_at")
      .single();

    if (error) {
      return { content: [{ type: "text", text: `Reservation failed: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { reservation: data },
    };
  },
});
