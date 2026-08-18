/**
 * Unified AI Provider
 * ───────────────────
 * Prioritizes user-supplied keys to save Lovable AI credits:
 *   1. Google Gemini direct (GEMINI1 / GEMINI2 / GEMINI_API_KEY)
 *   2. Anthropic direct (ANTROPIVapikey / ANTHROPIC_API_KEY)
 *   3. Lovable AI Gateway (LOVABLE_API_KEY) — fallback
 *
 * Exposes an OpenAI-compatible response shape so existing call sites
 * can migrate with minimal changes.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CallAIOptions {
  messages: ChatMessage[];
  model?: string; // logical model, mapped per provider
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface CallAIResult {
  content: string;
  provider: "gemini" | "anthropic" | "lovable";
  model: string;
  raw?: unknown;
}

function pickKey(...names: string[]): string | null {
  for (const n of names) {
    const v = Deno.env.get(n);
    if (v && v.trim() !== "") return v.trim();
  }
  return null;
}

function mapGeminiModel(model?: string): string {
  if (!model) return "gemini-3.6-flash";
  if (model.startsWith("google/")) return model.replace("google/", "");
  if (model.includes("gemini")) return model;
  return "gemini-3.6-flash";
}

function mapAnthropicModel(model?: string): string {
  // Sensible default; upgrade only when explicitly requested
  return "claude-3-5-haiku-20241022";
}

async function callGemini(key: string, opts: CallAIOptions): Promise<CallAIResult> {
  const model = mapGeminiModel(opts.model);
  const systemMsgs = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 2048,
      ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };
  if (systemMsgs) body.systemInstruction = { parts: [{ text: systemMsgs }] };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini ${res.status}: ${t}`);
  }
  const data = await res.json();
  const content =
    data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("") ?? "";
  return { content, provider: "gemini", model, raw: data };
}

async function callAnthropic(key: string, opts: CallAIOptions): Promise<CallAIResult> {
  const model = mapAnthropicModel(opts.model);
  const system = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const messages = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role, content: m.content }));

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens ?? 2048,
      temperature: opts.temperature ?? 0.7,
      ...(system ? { system } : {}),
      messages,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Anthropic ${res.status}: ${t}`);
  }
  const data = await res.json();
  const content = data?.content?.map((c: any) => c.text).filter(Boolean).join("") ?? "";
  return { content, provider: "anthropic", model, raw: data };
}

async function callLovable(key: string, opts: CallAIOptions): Promise<CallAIResult> {
  const model = opts.model || "google/gemini-3.6-flash";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 2048,
      ...(opts.jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LovableGateway ${res.status}: ${t}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return { content, provider: "lovable", model, raw: data };
}

/**
 * Call the best available AI provider.
 * Order: Gemini → Anthropic → Lovable Gateway.
 * On provider failure, falls back to the next available.
 */
export async function callAI(opts: CallAIOptions): Promise<CallAIResult> {
  const errors: string[] = [];

  const geminiKey = pickKey("GeminiAPIK", "GEMINI1", "GEMINI2", "GENINI2", "GEMINI_API_KEY", "GOOGLE_AI_API_KEY");
  if (geminiKey) {
    try {
      return await callGemini(geminiKey, opts);
    } catch (e) {
      errors.push(`gemini: ${(e as Error).message}`);
    }
  }

  const anthropicKey = pickKey("ANTROPIVapikey", "ANTHROPIC_API_KEY", "ANTROPIV_API_KEY");
  if (anthropicKey) {
    try {
      return await callAnthropic(anthropicKey, opts);
    } catch (e) {
      errors.push(`anthropic: ${(e as Error).message}`);
    }
  }

  const lovableKey = pickKey("LOVABLE_API_KEY");
  if (lovableKey) {
    try {
      return await callLovable(lovableKey, opts);
    } catch (e) {
      errors.push(`lovable: ${(e as Error).message}`);
    }
  }

  throw new Error(
    `No AI provider succeeded. Configure GEMINI1, ANTROPIVapikey, or LOVABLE_API_KEY. Details: ${errors.join(" | ")}`,
  );
}

/**
 * OpenAI-compatible wrapper for drop-in replacement of existing
 * `fetch(gateway/chat/completions)` calls.
 * Returns `{ choices: [{ message: { content } }] }`.
 */
export async function callAIOpenAICompatible(opts: CallAIOptions) {
  const r = await callAI(opts);
  return {
    choices: [{ message: { role: "assistant", content: r.content } }],
    _provider: r.provider,
    _model: r.model,
  };
}

// ─── Streaming (OpenAI-compatible SSE output) ───

function sseChunk(delta: string): string {
  const payload = {
    choices: [{ delta: { content: delta }, index: 0, finish_reason: null }],
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

async function streamGemini(key: string, opts: CallAIOptions): Promise<Response> {
  const model = mapGeminiModel(opts.model);
  const systemMsgs = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n");
  const contents = opts.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: opts.temperature ?? 0.7,
      maxOutputTokens: opts.maxTokens ?? 2048,
    },
  };
  if (systemMsgs) body.systemInstruction = { parts: [{ text: systemMsgs }] };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    throw new Error(`GeminiStream ${res.status}: ${t}`);
  }

  // Convert Gemini SSE → OpenAI-compatible SSE
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buf = "";
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() || "";
          for (const p of parts) {
            const line = p.trim();
            if (!line.startsWith("data:")) continue;
            const json = line.slice(5).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const obj = JSON.parse(json);
              const text = obj?.candidates?.[0]?.content?.parts
                ?.map((x: any) => x.text)
                .filter(Boolean)
                .join("") ?? "";
              if (text) controller.enqueue(encoder.encode(sseChunk(text)));
            } catch { /* skip */ }
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream" } });
}

async function streamLovable(key: string, opts: CallAIOptions): Promise<Response> {
  const model = opts.model || "google/gemini-3.6-flash";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.7,
      stream: true,
    }),
  });
  if (!res.ok || !res.body) {
    const t = await res.text().catch(() => "");
    const err: any = new Error(`LovableStream ${res.status}: ${t}`);
    err.status = res.status;
    throw err;
  }
  return new Response(res.body, { headers: { "Content-Type": "text/event-stream" } });
}

/**
 * Streaming AI call — returns a Response whose body is OpenAI-compatible SSE.
 * Order: Gemini direct → Lovable Gateway.
 * (Anthropic streaming omitted for simplicity; add on demand.)
 */
export async function callAIStream(opts: CallAIOptions): Promise<Response> {
  const errors: string[] = [];
  const geminiKey = pickKey("GeminiAPIK", "GEMINI1", "GEMINI2", "GENINI2", "GEMINI_API_KEY", "GOOGLE_AI_API_KEY");
  if (geminiKey) {
    try {
      return await streamGemini(geminiKey, opts);
    } catch (e) {
      errors.push(`gemini: ${(e as Error).message}`);
    }
  }
  const lovableKey = pickKey("LOVABLE_API_KEY");
  if (lovableKey) {
    return await streamLovable(lovableKey, opts);
  }
  throw new Error(`No streaming AI provider available. ${errors.join(" | ")}`);
}

