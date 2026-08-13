/** قواعد عناوين المزوّدات المتوافقة مع OpenAI (مشتركة بين الوظائف). */
export const OPENAI_COMPATIBLE_BASE: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  together: "https://api.together.xyz/v1",
  openrouter: "https://openrouter.ai/api/v1",
  mistral: "https://api.mistral.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
  xai: "https://api.x.ai/v1",
  fireworks: "https://api.fireworks.ai/inference/v1",
  perplexity: "https://api.perplexity.ai",
  moonshot: "https://api.moonshot.cn/v1",
  zhipu: "https://open.bigmodel.cn/api/paas/v4",
  nvidia: "https://integrate.api.nvidia.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  minimax: "https://api.minimax.io/v1",
  lovable: "https://ai.gateway.lovable.dev/v1",
};

export function providerBase(provider: string, baseUrl?: string | null): string {
  return String(baseUrl || OPENAI_COMPATIBLE_BASE[provider] || "https://api.openai.com/v1").replace(/\/$/, "");
}
