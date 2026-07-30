/**
 * ai-model-verify — يختبر مفتاح/اتصال نموذج مسجّل في جدول ai_models.
 * محصور بالمسؤولين فقط.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

async function probe(provider: string, modelId: string, apiKey: string | null, baseUrl: string | null) {
  try {
    if (provider === "lovable" || !apiKey) {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) return { ok: false, message: "لا يوجد مفتاح مخزَّن ولا مفتاح بوابة Lovable" };
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai/gpt-5.6-luna",
          reasoning_effort: "none",
          messages: [{ role: "user", content: "ping" }],
        }),
      });
      return { ok: r.ok, message: r.ok ? "بوابة Lovable تعمل" : `Gateway ${r.status}: ${await r.text()}` };
    }

    if (provider === "google") {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      );
      return { ok: r.ok, message: r.ok ? "المفتاح صالح" : `Google ${r.status}: ${await r.text()}` };
    }

    if (provider === "anthropic") {
      const r = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      });
      return { ok: r.ok, message: r.ok ? "المفتاح صالح" : `Anthropic ${r.status}: ${await r.text()}` };
    }

    // OpenAI-compatible default (openai, groq, together, openrouter, mistral, deepseek, xai, fireworks…)
    const defaults: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      groq: "https://api.groq.com/openai/v1",
      together: "https://api.together.xyz/v1",
      openrouter: "https://openrouter.ai/api/v1",
      mistral: "https://api.mistral.ai/v1",
      deepseek: "https://api.deepseek.com/v1",
      xai: "https://api.x.ai/v1",
      fireworks: "https://api.fireworks.ai/inference/v1",
      perplexity: "https://api.perplexity.ai",
    };
    const url = (baseUrl || defaults[provider] || "https://api.openai.com/v1").replace(/\/$/, "");
    const r = await fetch(`${url}/models`, { headers: { Authorization: `Bearer ${apiKey}` } });
    return { ok: r.ok, message: r.ok ? "المفتاح صالح" : `${provider} ${r.status}: ${(await r.text()).slice(0, 300)}` };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const id = typeof body?.model_row_id === "string" ? body.model_row_id : null;
    if (!id) {
      return new Response(JSON.stringify({ error: "model_row_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const { data: row, error } = await admin.from("ai_models").select("*").eq("id", id).maybeSingle();
    if (error || !row) {
      return new Response(JSON.stringify({ error: "model_not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await probe(row.provider, row.model_id, row.api_key ?? null, row.base_url ?? null);

    await admin.from("ai_models").update({
      last_test_at: new Date().toISOString(),
      last_test_ok: result.ok,
      last_test_message: result.message?.slice(0, 500) ?? null,
      status: result.ok ? "enabled" : "failed",
    }).eq("id", id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
