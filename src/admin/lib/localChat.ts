/**
 * تشغيل النماذج المحلية مباشرة من المتصفح / نسخة الحاسوب — بدون أي وسيط ولا مفتاح API.
 * يدعم أي خادم متوافق مع OpenAI (Ollama, LM Studio, llama.cpp, vLLM ...).
 */

export type LocalMsg = { role: "system" | "user" | "assistant"; content: string };

/** توحيد العنوان: نقبل الجذر أو المسار الكامل. */
export function normalizeBase(endpoint: string): string {
  let url = (endpoint || "").trim().replace(/\/+$/, "");
  if (!url) url = "http://localhost:11434";
  url = url.replace(/\/chat\/completions$/, "");
  if (!/\/v1$/.test(url)) url = `${url}/v1`;
  return url;
}

/** فحص سريع لتوفّر الخادم المحلي. */
export async function pingLocal(endpoint: string, timeoutMs = 4000): Promise<{ ok: boolean; ms: number; error?: string }> {
  const base = normalizeBase(endpoint);
  const started = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`${base}/models`, { signal: controller.signal });
    return { ok: r.ok, ms: Math.round(performance.now() - started), error: r.ok ? undefined : `HTTP ${r.status}` };
  } catch (e: any) {
    return { ok: false, ms: Math.round(performance.now() - started), error: e?.message || "Failed to fetch" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * بث الرد من نموذج محلي بصيغة SSE المتوافقة مع OpenAI.
 * @param onDelta يُستدعى مع كل جزء نصّي جديد.
 */
export async function streamLocalChat(opts: {
  endpoint: string;
  model: string;
  messages: LocalMsg[];
  signal?: AbortSignal;
  onDelta: (delta: string) => void;
}): Promise<string> {
  const base = normalizeBase(opts.endpoint);
  const resp = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: opts.signal,
    body: JSON.stringify({ model: opts.model, messages: opts.messages, stream: true }),
  });

  if (!resp.ok || !resp.body) {
    const txt = await resp.text().catch(() => "");
    throw new Error(txt.slice(0, 300) || `HTTP ${resp.status}`);
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() || "";
    for (const line of parts) {
      const l = line.trim();
      if (!l.startsWith("data:")) continue;
      const json = l.slice(5).trim();
      if (!json || json === "[DONE]") continue;
      try {
        const obj = JSON.parse(json);
        const delta = obj?.choices?.[0]?.delta?.content ?? obj?.message?.content ?? "";
        if (delta) { full += delta; opts.onDelta(delta); }
      } catch { /* جزء غير مكتمل */ }
    }
  }

  return full;
}

/** رسالة خطأ عربية واضحة للمستخدم. */
export function localErrorHint(msg: string, endpoint: string): string {
  const base = normalizeBase(endpoint);
  if (/failed to fetch|networkerror|load failed/i.test(msg)) {
    return `تعذّر الاتصال بالخادم المحلي (${base}). تأكد أن Ollama أو LM Studio يعمل على جهازك، وأن CORS مسموح (مثال: OLLAMA_ORIGINS=*).`;
  }
  return msg;
}
