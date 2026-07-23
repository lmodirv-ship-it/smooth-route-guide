import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

const CANCELLABLE = new Set(["pending", "confirmed"]);

export default defineTool({
  name: "cancel_reservation",
  title: "Cancel a reservation",
  description:
    "Cancel a seat reservation owned by the signed-in user. Only pending/confirmed reservations can be cancelled.",
  inputSchema: {
    reservation_id: z.string().uuid().describe("reservations.id (UUID)."),
    reason: z.string().trim().max(300).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ reservation_id, reason }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existing, error: readErr } = await sb
      .from("reservations")
      .select("id, user_id, status")
      .eq("id", reservation_id)
      .maybeSingle();

    if (readErr) return { content: [{ type: "text", text: readErr.message }], isError: true };
    if (!existing) {
      return { content: [{ type: "text", text: "Reservation not found or not accessible." }], isError: true };
    }
    if (existing.user_id !== userId) {
      return { content: [{ type: "text", text: "You are not the owner of this reservation." }], isError: true };
    }
    if (!CANCELLABLE.has(existing.status)) {
      return {
        content: [
          { type: "text", text: `Reservation is in status '${existing.status}' and can no longer be cancelled.` },
        ],
        isError: true,
      };
    }

    const patch: Record<string, unknown> = { status: "cancelled" };
    if (reason) patch.notes = reason;

    const { data, error } = await sb
      .from("reservations")
      .update(patch)
      .eq("id", reservation_id)
      .eq("user_id", userId!)
      .select("id, status, updated_at")
      .single();

    if (error) {
      return { content: [{ type: "text", text: `Cancel failed: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { reservation: data },
    };
  },
});
