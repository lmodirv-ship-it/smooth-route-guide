import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

/**
 * Create a delivery order as the signed-in user.
 * user_id is always derived from the verified OAuth token (never from input),
 * and RLS enforces that the row is owned by that user.
 */
export default defineTool({
  name: "create_delivery_order",
  title: "Create a delivery order",
  description:
    "Create a new delivery order for the signed-in customer. user_id is taken from the auth token; RLS enforces ownership.",
  inputSchema: {
    pickup_address: z.string().trim().min(3).max(300).describe("Where to pick up (address)."),
    delivery_address: z.string().trim().min(3).max(300).describe("Where to deliver (address)."),
    category: z
      .enum(["general", "food", "grocery", "pharmacy", "documents", "package"])
      .default("general"),
    notes: z.string().trim().max(500).optional(),
    estimated_price: z.number().min(0).max(100000).optional(),
    payment_method: z.enum(["cash", "card", "wallet"]).default("cash"),
    customer_phone: z.string().trim().max(20).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const userId = ctx.getUserId();
    if (!userId) {
      return { content: [{ type: "text", text: "Missing user id in token" }], isError: true };
    }

    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const insert = {
      user_id: userId,
      pickup_address: input.pickup_address,
      delivery_address: input.delivery_address,
      category: input.category ?? "general",
      notes: input.notes ?? "",
      estimated_price: input.estimated_price ?? 0,
      payment_method: input.payment_method ?? "cash",
      customer_phone: input.customer_phone ?? null,
      status: "pending",
    };

    const { data, error } = await sb
      .from("delivery_orders")
      .insert(insert)
      .select("id, status, category, pickup_address, delivery_address, estimated_price, created_at")
      .single();

    if (error) {
      return {
        content: [{ type: "text", text: `Failed to create order: ${error.message}` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { order: data },
    };
  },
});
