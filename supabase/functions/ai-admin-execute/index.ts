/**
 * ai-admin-execute — تنفيذ أوامر الكتابة المعلّقة بعد موافقة المسؤول يدوياً، أو رفضها.
 * لا يقبل SQL حراً؛ فقط أدوات معرّفة مسبقاً في adminTools.
 */
// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { executeWriteTool, getSpec } from "../_shared/adminTools.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const { command_id, action } = await req.json().catch(() => ({}));
    if (!command_id || !["approve", "reject"].includes(action)) return json({ error: "bad_request" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: cmd, error } = await admin.from("smart_assistant_commands").select("*").eq("id", command_id).maybeSingle();
    if (error) return json({ error: error.message }, 500);
    if (!cmd) return json({ error: "command_not_found" }, 404);
    if (cmd.status !== "pending") return json({ error: "command_already_processed", status: cmd.status }, 409);

    if (action === "reject") {
      await admin.from("smart_assistant_commands")
        .update({ status: "rejected", executed_at: new Date().toISOString() }).eq("id", command_id);
      return json({ ok: true, status: "rejected" });
    }

    const spec = getSpec(cmd.tool_name ?? "");
    if (!spec || spec.kind !== "write") return json({ error: "unknown_tool" }, 400);

    const { data: perm } = await admin.from("ai_tool_permissions").select("is_enabled, daily_limit").eq("tool_name", spec.name).maybeSingle();
    if (perm && perm.is_enabled === false) return json({ error: "tool_disabled" }, 403);
    if (perm?.daily_limit && perm.daily_limit > 0) {
      const since = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
      const { count } = await admin.from("smart_assistant_commands")
        .select("id", { count: "exact", head: true })
        .eq("tool_name", spec.name).eq("status", "executed").gte("executed_at", since);
      if ((count ?? 0) >= perm.daily_limit) return json({ error: "daily_limit_reached", limit: perm.daily_limit }, 429);
    }

    try {
      const result = await executeWriteTool(admin, spec.name, cmd.tool_args ?? {});
      await admin.from("smart_assistant_commands").update({
        status: "executed", executed_at: new Date().toISOString(), tool_result: result,
      }).eq("id", command_id);
      return json({ ok: true, status: "executed", result });
    } catch (e: any) {
      const message = e?.message ?? "فشل التنفيذ";
      await admin.from("smart_assistant_commands").update({
        status: "failed", executed_at: new Date().toISOString(), tool_result: { error: message },
      }).eq("id", command_id);
      return json({ ok: false, status: "failed", error: message }, 400);
    }
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
