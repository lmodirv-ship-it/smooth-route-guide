/**
 * ai-admin-chat — دردشة المسؤول مع النماذج المفعّلة + حلقة أدوات (قراءة فورية / كتابة بموافقة).
 * محصور بالمسؤولين فقط. البث عبر SSE بصيغة متوافقة مع OpenAI + أحداث `lovable` خاصة بالأدوات.
 */
// deno-lint-ignore-file no-explicit-any
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { TOOL_SPECS, toOpenAITools, runReadTool, getSpec, describeWrite, executeWriteTool } from "../_shared/adminTools.ts";

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

const BASE_PROMPT = `أنت «محرّك إدارة HN Driver» — مساعد المسؤول داخل لوحة التحكم.
- استعمل الأدوات المتاحة للحصول على أرقام حقيقية من قاعدة البيانات بدل التخمين.
- عند أي طلب تعديل (تفعيل سائق، تغيير حالة طلب، إضافة مطعم، تعديل تسعير…) استدعِ أداة الكتابة المناسبة؛ لن تُنفَّذ مباشرة بل ستُعرض على المسؤول للموافقة.
- بعد إنشاء عملية معلّقة، اشرح للمسؤول بإيجاز ماذا ستغيّر واطلب منه الضغط على «تنفيذ».
- أجب بالعربية باختصار ووضوح، واستعمل الجداول أو النقاط عند عرض بيانات.`;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const incoming = Array.isArray(body?.messages) ? body.messages.slice(-40) : [];
    if (incoming.length === 0) return json({ error: "messages required" }, 400);
    const modelRowId: string | null = typeof body?.model_row_id === "string" ? body.model_row_id : null;
    const agentId: string | null = typeof body?.agent_id === "string" ? body.agent_id : null;
    const chatId: string | null = typeof body?.chat_id === "string" ? body.chat_id : null;
    const toolsEnabled: boolean = body?.tools_enabled !== false;

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

    // ── system prompt (agent override) ──
    let systemPrompt = BASE_PROMPT;
    let agentTools: string[] | null = null;
    if (agentId) {
      const { data: agent } = await admin.from("ai_agents").select("system_prompt, allowed_tools").eq("id", agentId).maybeSingle();
      if (agent?.system_prompt) systemPrompt = `${agent.system_prompt}\n\n${BASE_PROMPT}`;
      if (Array.isArray(agent?.allowed_tools) && agent.allowed_tools.length) agentTools = agent.allowed_tools as string[];
    }

    // ── permitted tools ──
    const { data: perms } = await admin.from("ai_tool_permissions").select("tool_name, is_enabled, kind, auto_execute");
    const permMap = new Map<string, any>((perms ?? []).map((p: any) => [p.tool_name, p]));

    let allowedTools = TOOL_SPECS
      .filter((t) => permMap.get(t.name)?.is_enabled ?? true)
      .map((t) => t.name);
    if (agentTools) allowedTools = allowedTools.filter((n) => agentTools!.includes(n));
    const tools = toolsEnabled && allowedTools.length ? toOpenAITools(allowedTools) : null;

    // ── providers (سلسلة احتياطية: المختار ← مفاتيح خاصة ← نماذج محلية) ──
    type Target = { url: string; headers: Record<string, string>; modelName: string; providerName: string };

    const externalTarget = (row: Record<string, any>): Target => {
      const base = (row.base_url || OPENAI_COMPATIBLE_BASE[row.provider] || "https://api.openai.com/v1").replace(/\/$/, "");
      return {
        url: `${base}/chat/completions`,
        headers: { Authorization: `Bearer ${row.api_key}`, "Content-Type": "application/json" },
        modelName: row.model_id,
        providerName: row.provider,
      };
    };
    const lovableTarget = (): Target | null => {
      const key = Deno.env.get("LOVABLE_API_KEY");
      if (!key) return null;
      return {
        url: "https://ai.gateway.lovable.dev/v1/chat/completions",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        modelName: "openai/gpt-5.6-sol",
        providerName: "lovable",
      };
    };
    const localTarget = (row: Record<string, any>): Target => ({
      url: `${String(row.endpoint_url).replace(/\/$/, "")}/chat/completions`,
      headers: { "Content-Type": "application/json" },
      modelName: row.model_id,
      providerName: `local:${row.engine}`,
    });

    let modelRow: Record<string, any> | null = null;
    if (modelRowId) {
      const { data } = await admin.from("ai_models").select("*").eq("id", modelRowId).maybeSingle();
      modelRow = data ?? null;
    }

    const targets: Target[] = [];
    if (modelRow?.api_key && modelRow.provider !== "lovable") targets.push(externalTarget(modelRow));
    const lt = lovableTarget();
    if (lt) targets.push(lt);

    // احتياطي 1: أي نموذج مُفعّل له مفتاح خاص (لا يعتمد على رصيد Lovable)
    const { data: keyed } = await admin.from("ai_models")
      .select("provider, model_id, base_url, api_key")
      .eq("is_enabled", true).neq("provider", "lovable").not("api_key", "is", null)
      .order("priority");
    for (const row of keyed ?? []) {
      if (!row.api_key) continue;
      if (targets.some((t) => t.modelName === row.model_id && t.providerName === row.provider)) continue;
      targets.push(externalTarget(row));
    }

    // احتياطي 2: النماذج المحلية المُفعّلة ذات نقطة نهاية متوافقة مع OpenAI
    const { data: locals } = await admin.from("ai_local_models")
      .select("model_id, engine, endpoint_url")
      .eq("is_enabled", true).not("endpoint_url", "is", null)
      .order("priority");
    for (const row of locals ?? []) targets.push(localTarget(row));

    if (!targets.length) return json({ error: "لا يوجد أي نموذج مُفعّل (لا مفتاح Lovable ولا مفاتيح خاصة ولا نماذج محلية)" }, 400);

    let active = targets[0];
    const convo: any[] = [{ role: "system", content: systemPrompt }, ...incoming];
    const usage = { requests: 0, input: 0, output: 0 };
    const fallbackNotes: string[] = [];

    const callOne = async (t: Target, withTools: boolean) => {
      const payload: Record<string, unknown> = { model: t.modelName, messages: convo, stream: false };
      if (t.modelName.startsWith("openai/gpt-5.6")) payload.reasoning_effort = "none";
      if (withTools && tools) { payload.tools = tools; payload.tool_choice = "auto"; }
      const resp = await fetch(t.url, { method: "POST", headers: t.headers, body: JSON.stringify(payload) });
      const text = await resp.text();
      if (!resp.ok) {
        const err = new Error(text.slice(0, 400)) as any;
        err.status = resp.status;
        throw err;
      }
      return JSON.parse(text);
    };

    /** يجرّب المزوّد الحالي ثم ينتقل تلقائياً للاحتياطي عند نفاد الرصيد أو الضغط أو العطل. */
    const callModel = async (withTools: boolean) => {
      const start = Math.max(0, targets.indexOf(active));
      let lastErr: any = null;
      for (let i = start; i < targets.length; i++) {
        const t = targets[i];
        try {
          const data = await callOne(t, withTools);
          if (t !== active) fallbackNotes.push(`تحوّل تلقائي إلى ${t.providerName} / ${t.modelName}`);
          active = t;
          usage.requests += 1;
          usage.input += Number(data?.usage?.prompt_tokens ?? 0);
          usage.output += Number(data?.usage?.completion_tokens ?? 0);
          return data;
        } catch (e: any) {
          lastErr = e;
          const st = Number(e?.status ?? 0);
          const recoverable = st === 402 || st === 429 || st === 401 || st === 403 || st >= 500 || st === 0;
          if (!recoverable) throw e;
        }
      }
      throw lastErr ?? new Error("تعذّر الوصول إلى أي مزوّد");
    };


    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = (o: unknown) => controller.enqueue(enc.encode(`data: ${JSON.stringify(o)}\n\n`));
        const text = (t: string) => send({ choices: [{ delta: { content: t } }] });
        const event = (e: unknown) => send({ lovable: e });

        try {
          let useTools = Boolean(tools);
          let finalText = "";

          for (let round = 0; round < 8; round++) {
            let data: any;
            try {
              data = await callModel(useTools);
            } catch (e: any) {
              // نموذج لا يدعم الأدوات → إعادة المحاولة بدونها
              if (useTools && (e.status === 400 || e.status === 422)) { useTools = false; data = await callModel(false); }
              else throw e;
            }

            const msg = data?.choices?.[0]?.message ?? {};
            const calls = Array.isArray(msg.tool_calls) ? msg.tool_calls : [];

            if (!calls.length) { finalText = msg.content ?? ""; break; }

            convo.push({ role: "assistant", content: msg.content ?? "", tool_calls: calls });

            for (const call of calls) {
              const name = call?.function?.name ?? "";
              let args: any = {};
              try { args = JSON.parse(call?.function?.arguments || "{}"); } catch { /* ignore */ }
              const spec = getSpec(name);
              let result: any;

              if (!spec || !allowedTools.includes(name)) {
                result = { error: "أداة غير مفعّلة أو غير معروفة" };
                event({ type: "tool", name, label: spec?.label ?? name, kind: spec?.kind ?? "read", status: "error", args, result });
              } else if (spec.kind === "read") {
                try {
                  result = await runReadTool(admin, name, args);
                  event({ type: "tool", name, label: spec.label, kind: "read", status: "done", args, result });
                } catch (err: any) {
                  result = { error: err?.message ?? "فشل التنفيذ" };
                  event({ type: "tool", name, label: spec.label, kind: "read", status: "error", args, result });
                }
              } else if (permMap.get(name)?.auto_execute === true) {
                // تنفيذ تلقائي مسموح صراحةً لهذه الأداة من صفحة الصلاحيات
                try {
                  const res = await executeWriteTool(admin, name, args);
                  result = { status: "executed", summary: res.summary, after: res.after };
                  await admin.from("smart_assistant_commands").insert({
                    admin_id: user.id, chat_id: chatId,
                    command_text: describeWrite(name, args), command_type: "tool_call",
                    tool_name: name, tool_args: args, status: "executed",
                    tool_result: { summary: res.summary, after: res.after },
                    executed_at: new Date().toISOString(),
                  });
                  event({ type: "tool", name, label: spec.label, kind: "write", status: "done", args, result, auto: true });
                } catch (err: any) {
                  result = { error: err?.message ?? "فشل التنفيذ" };
                  event({ type: "tool", name, label: spec.label, kind: "write", status: "error", args, result, auto: true });
                }
              } else {
                // عملية كتابة → أمر معلّق ينتظر موافقة يدوية
                const { data: cmd, error } = await admin.from("smart_assistant_commands").insert({
                  admin_id: user.id,
                  chat_id: chatId,
                  command_text: describeWrite(name, args),
                  command_type: "tool_call",
                  tool_name: name,
                  tool_args: args,
                  status: "pending",
                }).select("id").single();
                if (error) {
                  result = { error: error.message };
                  event({ type: "tool", name, label: spec.label, kind: "write", status: "error", args, result });
                } else {
                  result = { status: "pending_approval", command_id: cmd.id, note: "بانتظار ضغط المسؤول على «تنفيذ»" };
                  event({
                    type: "approval", command_id: cmd.id, name, label: spec.label,
                    risk: spec.risk, args, description: describeWrite(name, args),
                  });
                }
              }


              convo.push({ role: "tool", tool_call_id: call.id, name, content: JSON.stringify(result).slice(0, 6000) });
            }
          }

          if (finalText) text(finalText);
          else if (!finalText) text("تم تنفيذ الخطوات المطلوبة.");

          // تسجيل الاستهلاك
          const estCost = ((usage.input / 1000) * 0.002 + (usage.output / 1000) * 0.006).toFixed(4);
          await admin.from("ai_usage_log").insert({
            model_ref: modelName, provider: providerName,
            requests: usage.requests, input_tokens: usage.input, output_tokens: usage.output,
            cost: Number(estCost), currency: "USD", usage_date: new Date().toISOString().slice(0, 10),
          });
          event({ type: "usage", ...usage, cost: Number(estCost) });

          controller.enqueue(enc.encode("data: [DONE]\n\n"));
        } catch (e: any) {
          event({ type: "error", message: e?.message ?? "خطأ غير متوقع" });
          text(`\n\n⚠️ تعذّر إكمال الطلب: ${e?.message ?? ""}`);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
