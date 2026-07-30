/**
 * Catalog of global AI providers + their API-key pages.
 * Logos are resolved from the provider domain (real brand favicons, no key needed).
 */
export type ProviderInfo = {
  id: string;
  label: string;
  domain: string;
  keysUrl: string;
};

export const AI_PROVIDERS: ProviderInfo[] = [
  { id: "openai", label: "OpenAI", domain: "openai.com", keysUrl: "https://platform.openai.com/api-keys" },
  { id: "google", label: "Google Gemini", domain: "ai.google.dev", keysUrl: "https://aistudio.google.com/app/apikey" },
  { id: "anthropic", label: "Anthropic Claude", domain: "anthropic.com", keysUrl: "https://console.anthropic.com/settings/keys" },
  { id: "xai", label: "xAI Grok", domain: "x.ai", keysUrl: "https://console.x.ai" },
  { id: "mistral", label: "Mistral AI", domain: "mistral.ai", keysUrl: "https://console.mistral.ai/api-keys" },
  { id: "deepseek", label: "DeepSeek", domain: "deepseek.com", keysUrl: "https://platform.deepseek.com/api_keys" },
  { id: "qwen", label: "Qwen (Alibaba)", domain: "alibabacloud.com", keysUrl: "https://dashscope.console.aliyun.com" },
  { id: "cohere", label: "Cohere", domain: "cohere.com", keysUrl: "https://dashboard.cohere.com/api-keys" },
  { id: "perplexity", label: "Perplexity", domain: "perplexity.ai", keysUrl: "https://www.perplexity.ai/settings/api" },
  { id: "groq", label: "Groq", domain: "groq.com", keysUrl: "https://console.groq.com/keys" },
  { id: "together", label: "Together AI", domain: "together.ai", keysUrl: "https://api.together.ai/settings/api-keys" },
  { id: "fireworks", label: "Fireworks AI", domain: "fireworks.ai", keysUrl: "https://fireworks.ai/api-keys" },
  { id: "openrouter", label: "OpenRouter", domain: "openrouter.ai", keysUrl: "https://openrouter.ai/keys" },
  { id: "meta", label: "Meta Llama", domain: "llama.com", keysUrl: "https://llama.developer.meta.com" },
  { id: "nvidia", label: "NVIDIA NIM", domain: "nvidia.com", keysUrl: "https://build.nvidia.com" },
  { id: "azure", label: "Azure OpenAI", domain: "azure.microsoft.com", keysUrl: "https://portal.azure.com" },
  { id: "amazon", label: "Amazon Bedrock", domain: "aws.amazon.com", keysUrl: "https://console.aws.amazon.com/bedrock" },
  { id: "moonshot", label: "Moonshot Kimi", domain: "moonshot.cn", keysUrl: "https://platform.moonshot.cn/console/api-keys" },
  { id: "zhipu", label: "Zhipu GLM", domain: "zhipuai.cn", keysUrl: "https://open.bigmodel.cn" },
  { id: "minimax", label: "MiniMax", domain: "minimax.io", keysUrl: "https://www.minimax.io/platform" },
  { id: "stability", label: "Stability AI", domain: "stability.ai", keysUrl: "https://platform.stability.ai/account/keys" },
  { id: "elevenlabs", label: "ElevenLabs", domain: "elevenlabs.io", keysUrl: "https://elevenlabs.io/app/settings/api-keys" },
  { id: "runway", label: "Runway", domain: "runwayml.com", keysUrl: "https://dev.runwayml.com" },
  { id: "kling", label: "Kling AI", domain: "klingai.com", keysUrl: "https://klingai.com" },
  { id: "leonardo", label: "Leonardo AI", domain: "leonardo.ai", keysUrl: "https://app.leonardo.ai/api-access" },
  { id: "flux", label: "FLUX (BFL)", domain: "bfl.ai", keysUrl: "https://dashboard.bfl.ai" },
  { id: "replicate", label: "Replicate", domain: "replicate.com", keysUrl: "https://replicate.com/account/api-tokens" },
  { id: "huggingface", label: "Hugging Face", domain: "huggingface.co", keysUrl: "https://huggingface.co/settings/tokens" },
  { id: "voyage", label: "Voyage AI", domain: "voyageai.com", keysUrl: "https://dash.voyageai.com" },
  { id: "jina", label: "Jina AI", domain: "jina.ai", keysUrl: "https://jina.ai/api-dashboard" },
  { id: "assemblyai", label: "AssemblyAI", domain: "assemblyai.com", keysUrl: "https://www.assemblyai.com/app/api-keys" },
  { id: "deepgram", label: "Deepgram", domain: "deepgram.com", keysUrl: "https://console.deepgram.com" },
  { id: "cursor", label: "Cursor", domain: "cursor.com", keysUrl: "https://cursor.com/settings" },
  { id: "lovable", label: "Lovable AI Gateway", domain: "lovable.dev", keysUrl: "https://docs.lovable.dev" },
];

export function providerInfo(id?: string | null): ProviderInfo | undefined {
  if (!id) return undefined;
  return AI_PROVIDERS.find((p) => p.id === id.toLowerCase());
}

export function providerLogo(id?: string | null, domainFallback?: string): string {
  const domain = providerInfo(id)?.domain || domainFallback || "openai.com";
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

/** Local (self-hosted) engines */
export const LOCAL_ENGINES = [
  { id: "ollama", label: "Ollama", domain: "ollama.com", install: "https://ollama.com/download" },
  { id: "lmstudio", label: "LM Studio", domain: "lmstudio.ai", install: "https://lmstudio.ai" },
  { id: "a1111", label: "Stable Diffusion A1111", domain: "github.com", install: "https://github.com/AUTOMATIC1111/stable-diffusion-webui" },
  { id: "llamacpp", label: "llama.cpp", domain: "github.com", install: "https://github.com/ggml-org/llama.cpp" },
  { id: "vllm", label: "vLLM", domain: "vllm.ai", install: "https://docs.vllm.ai" },
  { id: "jan", label: "Jan", domain: "jan.ai", install: "https://jan.ai" },
  { id: "gpt4all", label: "GPT4All", domain: "nomic.ai", install: "https://gpt4all.io" },
  { id: "koboldcpp", label: "KoboldCpp", domain: "github.com", install: "https://github.com/LostRuins/koboldcpp" },
];
