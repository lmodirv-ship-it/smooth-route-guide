/**
 * ai-admin-chat — دردشة المسؤول مع النماذج المفعّلة (بث حي عبر SSE).
 * محصور بالمسؤولين فقط.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;

const OPENAI_COMPATIBLE_BASE: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  together: "https://api.together.xyz/v1",
  openrouter: "https://openrouter.ai/api/v1",
  mistral: "https://api.mistral.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
  xai: "https://api.x.ai/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
};

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
    const messages = Array.isArray(body?.messages) ? body.messages.slice(-40) : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const modelRowId: string | null = typeof body?.model_row_id === "string" ? body.model_row_id : null;
    const agentId: string | null = typeof body?.agent_id === "string" ? body.agent_id : null;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    let systemPrompt = "أنت مساعد إداري لمنصة HN Driver. أجب بدقّة وباللغة التي يستعملها المستخدم.";
    if (agentId) {
      const { data: agent } = await admin.from("ai_agents").select("*").eq("id", agentId).maybeSingle();
      if (agent?.system_prompt) systemPrompt = agent.system_prompt;
    }

    let modelRow: Record<string, any> | null = null;
    if (modelRowId) {
      const { data } = await admin.from("ai_models").select("*").eq("id", modelRowId).maybeSingle();
      modelRow = data ?? null;
    }

    const chatMessages = [{ role: "system", content: systemPrompt }, ...messages];

    // ── Provider selection ──
    let url: string;
    let headers: Record<string, string>;
    let payload: Record<string, unknown>;

    if (modelRow?.api_key && modelRow.provider !== "lovable") {
      const base = (modelRow.base_url || OPENAI_COMPATIBLE_BASE[modelRow.provider] || "https://api.openai.com/v1")
        .replace(/\/$/, "");
      url = `${base}/chat/completions`;
      headers = { Authorization: `Bearer ${modelRow.api_key}`, "Content-Type": "application/json" };
      payload = { model: modelRow.model_id, messages: chatMessages, stream: true };
    } else {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) {
        return new Response(JSON.stringify({ error: "لا يوجد مفتاح مُفعّل لهذا النموذج" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      url = "https://ai.gateway.lovable.dev/v1/chat/completions";
      headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
      payload = {
        model: "openai/gpt-5.6-sol",
        reasoning_effort: "none",
        messages: chatMessages,
        stream: true,
      };
    }

    const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(payload) });
    if (!resp.ok || !resp.body) {
      const details = await resp.text().catch(() => "");
      console.error(`ai-admin-chat provider failed [${resp.status}]: ${details}`);
      return new Response(JSON.stringify({ error: "provider_error", status: resp.status, details }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(resp.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
