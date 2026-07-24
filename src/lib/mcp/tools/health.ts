import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

const ENABLED_TOOLS = [
  "health",
  "whoami",
  "list_my_delivery_orders",
  "list_my_trips",
  "list_my_reservations",
  "create_delivery_order",
  "cancel_delivery_order",
  "create_reservation",
  "cancel_reservation",
];

export default defineTool({
  name: "health",
  title: "Server health & status",
  description:
    "Return MCP server status: API version, authentication state of the caller, and the list of currently enabled tools.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx: ToolContext) => {
    const payload = {
      status: "ok" as const,
      server: "hn-driver-mcp",
      api_version: "0.1.0",
      time: new Date().toISOString(),
      authenticated: ctx.isAuthenticated(),
      user_id: ctx.isAuthenticated() ? ctx.getUserId() : null,
      email: ctx.isAuthenticated() ? ctx.getUserEmail() : null,
      enabled_tools: ENABLED_TOOLS,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
