import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "list_my_delivery_orders",
  title: "List my delivery orders",
  description: "List the signed-in customer's delivery orders (most recent first). RLS scopes results to the current user.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("Max rows (1-50)."),
    status: z.string().optional().describe("Optional exact status filter, e.g. 'pending', 'delivered'."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status }, ctx: ToolContext) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let q = sb
      .from("delivery_orders")
      .select("id, status, category, total, pickup_address, delivery_address, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (status) q = q.eq("status", status);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { orders: data ?? [] },
    };
  },
});
