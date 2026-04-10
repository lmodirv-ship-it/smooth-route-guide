import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables that cannot be modified/deleted from the UI
const PROTECTED_TABLES = ["user_roles", "profiles", "db_audit_log"];
// Tables completely hidden from listing
const HIDDEN_TABLES = ["schema_migrations"];
// Blocked table prefixes (system tables)
const BLOCKED_PREFIXES = ["pg_", "auth.", "storage.", "supabase_", "realtime.", "vault.", "pgmq."];

function isBlocked(table: string) {
  return BLOCKED_PREFIXES.some(p => table.startsWith(p));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the user is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) throw new Error("Unauthorized");

    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check admin role
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleData) throw new Error("Forbidden: admin role required");

    const body = await req.json();
    const { action } = body;

    // === LIST TABLES ===
    if (action === "list_tables") {
      const { data, error } = await adminClient.rpc("get_public_tables" as any);
      if (error) {
        // Fallback: query information_schema
        const { data: tables, error: e2 } = await adminClient
          .from("information_schema.tables" as any)
          .select("table_name")
          .eq("table_schema", "public")
          .eq("table_type", "BASE TABLE");
        if (e2) throw e2;
        const filtered = (tables || [])
          .map((t: any) => t.table_name)
          .filter((n: string) => !isBlocked(n) && !HIDDEN_TABLES.includes(n));
        return json({ tables: filtered.sort() });
      }
      const filtered = (data || [])
        .filter((n: string) => !isBlocked(n) && !HIDDEN_TABLES.includes(n));
      return json({ tables: filtered.sort() });
    }

    // === TABLE COLUMNS ===
    if (action === "columns") {
      const { table } = body;
      if (!table || isBlocked(table)) throw new Error("Invalid table");
      const { data, error } = await adminClient
        .rpc("get_table_columns" as any, { p_table: table });
      if (error) throw error;
      return json({ columns: data || [] });
    }

    // === READ RECORDS ===
    if (action === "read") {
      const { table, page = 1, pageSize = 50, search, searchColumn, sortColumn, sortDir = "asc", filters } = body;
      if (!table || isBlocked(table)) throw new Error("Invalid table");

      let query = adminClient.from(table).select("*", { count: "exact" });

      if (search && searchColumn) {
        query = query.ilike(searchColumn, `%${search}%`);
      }
      if (filters && Array.isArray(filters)) {
        for (const f of filters) {
          if (f.column && f.value !== undefined) {
            query = query.eq(f.column, f.value);
          }
        }
      }
      // Check if table has created_at column before defaulting sort
      if (sortColumn) {
        query = query.order(sortColumn, { ascending: sortDir === "asc" });
      } else {
        // Try created_at sort; if column doesn't exist, query without sort
        const { data: cols } = await adminClient.rpc("get_table_columns", { p_table: table });
        const hasCreatedAt = cols?.some((c: any) => c.column_name === "created_at");
        if (hasCreatedAt) {
          query = query.order("created_at", { ascending: false });
        }
      }

      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);

      const { data, count, error } = await query;
      if (error) throw error;
      return json({ records: data || [], total: count || 0, page, pageSize });
    }

    // === INSERT ===
    if (action === "insert") {
      const { table, record } = body;
      if (!table || isBlocked(table)) throw new Error("Invalid table");

      const { data, error } = await adminClient.from(table).insert(record).select().single();
      if (error) throw error;

      // Audit log
      await adminClient.from("db_audit_log").insert({
        user_id: user.id,
        action: "INSERT",
        table_name: table,
        record_id: data?.id || null,
        new_data: data,
      });

      return json({ record: data });
    }

    // === UPDATE ===
    if (action === "update") {
      const { table, id, changes } = body;
      if (!table || !id || isBlocked(table)) throw new Error("Invalid request");

      // Get old data for audit
      const { data: oldData } = await adminClient.from(table).select("*").eq("id", id).single();

      const { data, error } = await adminClient.from(table).update(changes).eq("id", id).select().single();
      if (error) throw error;

      await adminClient.from("db_audit_log").insert({
        user_id: user.id,
        action: "UPDATE",
        table_name: table,
        record_id: id,
        old_data: oldData,
        new_data: data,
      });

      return json({ record: data });
    }

    // === DELETE ===
    if (action === "delete") {
      const { table, id } = body;
      if (!table || !id || isBlocked(table)) throw new Error("Invalid request");
      if (PROTECTED_TABLES.includes(table)) throw new Error("Cannot delete from protected table");

      const { data: oldData } = await adminClient.from(table).select("*").eq("id", id).single();

      const { error } = await adminClient.from(table).delete().eq("id", id);
      if (error) throw error;

      await adminClient.from("db_audit_log").insert({
        user_id: user.id,
        action: "DELETE",
        table_name: table,
        record_id: id,
        old_data: oldData,
      });

      return json({ success: true });
    }

    // === AUDIT LOG ===
    if (action === "audit_log") {
      const { table, page = 1, pageSize = 50 } = body;
      let query = adminClient.from("db_audit_log").select("*", { count: "exact" });
      if (table) query = query.eq("table_name", table);
      query = query.order("created_at", { ascending: false });
      const from = (page - 1) * pageSize;
      query = query.range(from, from + pageSize - 1);
      const { data, count, error } = await query;
      if (error) throw error;
      return json({ logs: data || [], total: count || 0 });
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
