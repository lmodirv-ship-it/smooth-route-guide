import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

const CANCELLABLE = new Set(["pending", "accepted", "ready_for_driver", "assigned"]);

export default defineTool({
  name: "cancel_delivery_order",
  title: "Cancel a delivery order",
  description:
    "Cancel a delivery order owned by the signed-in user. Only orders that have not been picked up or delivered can be cancelled.",
  inputSchema: {
    order_id: z.string().uuid().describe("The delivery_orders.id (UUID)."),
    reason: z.string().trim().min(1).max(300).default("cancelled by user"),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ order_id, reason }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch first to give a clear error and enforce ownership + status client-side too
    const { data: existing, error: readErr } = await sb
      .from("delivery_orders")
      .select("id, user_id, status")
      .eq("id", order_id)
      .maybeSingle();

    if (readErr) {
      return { content: [{ type: "text", text: readErr.message }], isError: true };
    }
    if (!existing) {
      return { content: [{ type: "text", text: "Order not found or not accessible." }], isError: true };
    }
    if (existing.user_id !== userId) {
      return { content: [{ type: "text", text: "You are not the owner of this order." }], isError: true };
    }
    if (!CANCELLABLE.has(existing.status)) {
      return {
        content: [
          {
            type: "text",
            text: `Order is in status '${existing.status}' and can no longer be cancelled.`,
          },
        ],
        isError: true,
      };
    }

    const { data, error } = await sb
      .from("delivery_orders")
      .update({ status: "cancelled", cancel_reason: reason })
      .eq("id", order_id)
      .eq("user_id", userId!)
      .select("id, status, cancel_reason, updated_at")
      .single();

    if (error) {
      return { content: [{ type: "text", text: `Cancel failed: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { order: data },
    };
  },
});
