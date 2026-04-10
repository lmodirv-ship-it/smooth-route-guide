import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const body = await req.json();
    const { action, server_key } = body;

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Server-side reporting (uses a server key instead of JWT)
    if (action === "report_backup" && server_key) {
      // Validate server key from app_settings
      const { data: setting } = await adminClient
        .from("app_settings")
        .select("value")
        .eq("key", "server_backup_key")
        .maybeSingle();

      const expectedKey = setting?.value as string;
      if (!expectedKey || server_key !== expectedKey) {
        return json({ error: "Invalid server key" }, 403);
      }

      const { backup_type, file_path, file_size, tables_count, rows_total, duration_sec, status, error_message, health_score, sync_status, disk_usage, metadata } = body;

      const { error } = await adminClient.from("server_backup_status").insert({
        backup_type: backup_type || "daily",
        file_path,
        file_size: file_size || 0,
        tables_count: tables_count || 0,
        rows_total: rows_total || 0,
        duration_sec: duration_sec || 0,
        status: status || "success",
        error_message,
        health_score,
        sync_status,
        disk_usage,
        source: "server",
        metadata: metadata || {},
      });

      if (error) throw error;
      return json({ success: true });
    }

    // Admin-only actions (require JWT)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Forbidden");

    // === GET SERVER STATUS ===
    if (action === "status") {
      // Latest backups
      const { data: backups } = await adminClient
        .from("server_backup_status")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      // Stats
      const { data: stats } = await adminClient
        .from("server_backup_status")
        .select("status, backup_type")
        .gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString());

      const totalBackups = stats?.length || 0;
      const successBackups = stats?.filter(s => s.status === "success").length || 0;
      const failedBackups = stats?.filter(s => s.status === "failed").length || 0;

      // Latest health/sync
      const latest = backups?.[0];

      return json({
        backups: backups || [],
        summary: {
          total_7d: totalBackups,
          success_7d: successBackups,
          failed_7d: failedBackups,
          last_backup: latest?.created_at || null,
          last_status: latest?.status || "unknown",
          last_sync: latest?.sync_status || "unknown",
          last_health_score: latest?.health_score || null,
          disk_usage: latest?.disk_usage || "N/A",
        },
      });
    }

    // === GET REPAIR HISTORY ===
    if (action === "repairs") {
      const { data } = await adminClient
        .from("system_repairs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return json({ repairs: data || [] });
    }

    // === GET HEALTH SNAPSHOTS ===
    if (action === "snapshots") {
      const { data } = await adminClient
        .from("system_health_snapshots")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      return json({ snapshots: data || [] });
    }

    throw new Error("Unknown action");
  } catch (e: any) {
    return json({ error: e.message }, 400);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
