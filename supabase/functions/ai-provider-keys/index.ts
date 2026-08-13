/**
 * ai-provider-keys — فحص مفاتيح المزوّدين واستيراد نماذجهم.
 * محصور بالمسؤولين. لا يُرسل المفتاح من المتصفح: يُقرأ من قاعدة البيانات بصلاحية الخدمة.
 */
// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { providerBase } from "../_shared/providerBase.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action ?? "");
    const keyId = String(body?.key_id ?? "");
    if (!["test", "import"].includes(action)) return json({ error: "action must be test|import" }, 400);
    if (!/^[0-9a-f-]{36}$/i.test(keyId)) return json({ error: "key_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: row } = await admin.from("ai_provider_keys").select("*").eq("id", keyId).maybeSingle();
    if (!row) return json({ error: "key not found" }, 404);

    const base = providerBase(row.provider, row.base_url);
    const started = Date.now();
    let ok = false;
    let models: string[] = [];
    let error: string | null = null;

    try {
      const res = await fetch(`${base}/models`, {
        headers: { Authorization: `Bearer ${row.api_key}`, "Content-Type": "application/json" },
      });
      if (res.ok) {
        const payload = await res.json().catch(() => ({}));
        const list = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.models) ? payload.models : [];
        models = list.map((m: any) => String(m?.id ?? m?.name ?? "")).filter(Boolean);
        ok = true;
      } else {
        error = `HTTP ${res.status}`;
      }
    } catch (e) {
      error = (e as Error)?.message ?? "network error";
    }

    let imported = 0;
    if (ok && action === "import" && models.length) {
      const rows = models.slice(0, 120).map((id, i) => ({
        provider: row.provider,
        model_id: id,
        display_name: id,
        base_url: row.base_url || null,
        category: "LLM",
        is_free: false,
        is_enabled: true,
        priority: 100 + i,
        logo_key: row.provider,
      }));
      const { data: existing } = await admin.from("ai_models").select("model_id").eq("provider", row.provider);
      const have = new Set((existing ?? []).map((r: any) => r.model_id));
      const fresh = rows.filter((r) => !have.has(r.model_id));
      if (fresh.length) {
        const { error: insErr } = await admin.from("ai_models").insert(fresh);
        if (insErr) return json({ error: insErr.message }, 400);
        imported = fresh.length;
      }
    }

    await admin.from("ai_provider_keys").update({
      status: ok ? "connected" : "error",
      last_check_at: new Date().toISOString(),
      models_count: ok ? models.length : row.models_count,
    }).eq("id", keyId);

    return json({ ok, ms: Date.now() - started, models_count: models.length, imported, error });
  } catch (e) {
    return json({ error: (e as Error)?.message ?? "unexpected error" }, 500);
  }
});
