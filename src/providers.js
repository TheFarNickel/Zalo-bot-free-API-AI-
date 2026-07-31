function parseKeys(pluralEnvVal, singularEnvVal) {
  const raw = pluralEnvVal || singularEnvVal || "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}

const EXISTING_PROVIDERS = [ //khá cũ rồi, có thể bị lỗi thời và không đúng tên model, 1 số provider có thể hết free (nên tự kiếm tra nhé, tôi lười kiểm)
  {
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    keys: parseKeys(process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY),
    models: {
      chat: ["gemini-2.5-flash-lite"],
      code: ["gemini-2.5-flash"],
      analysis: ["gemini-2.5-flash"],
    },
  },
  {
    name: "groq",
    baseURL: "https://api.groq.com/openai/v1",
    keys: parseKeys(process.env.GROQ_API_KEYS, process.env.GROQ_API_KEY),
    models: {
      chat: ["openai/gpt-oss-20b", "qwen/qwen3-32b", "llama-3.1-8b-instant"],
      code: ["qwen/qwen3-32b", "openai/gpt-oss-120b", "llama-3.3-70b-versatile"],
      analysis: ["openai/gpt-oss-120b", "qwen/qwen3-32b", "llama-3.3-70b-versatile"],
    },
  },
  {
    name: "openrouter",
    baseURL: "https://openrouter.ai/api/v1",
    keys: parseKeys(process.env.OPENROUTER_API_KEYS, process.env.OPENROUTER_API_KEY),
    models: {
      chat: ["meta-llama/llama-3.3-70b-instruct:free"],
      code: ["qwen/qwen-2.5-72b-instruct:free"],
      analysis: ["qwen/qwen-2.5-72b-instruct:free"],
    },
  },
  {
    name: "cerebras",
    baseURL: "https://api.cerebras.ai/v1",
    keys: parseKeys(process.env.CEREBRAS_API_KEYS, process.env.CEREBRAS_API_KEY),

    models: {
      chat: ["Z.ai GLM 4.7"],
      code: ["Gemma 4 31B"],
      analysis: ["gpt-oss-120b"],
    },
  },
  {
    name: "nvidia-nim",
    baseURL: "https://integrate.api.nvidia.com/v1",
    keys: parseKeys(process.env.NVIDIA_API_KEYS, process.env.NVIDIA_API_KEY),
    timeoutMs: 90_000,
    models: {
      chat: ["nvidia/llama-3.3-nemotron-super-49b-v1"],
      code: ["meta/llama-3.1-405b-instruct"],
      analysis: ["meta/llama-3.1-405b-instruct"],
    },
  },
  {
    name: "mistral",
    baseURL: "https://api.mistral.ai/v1",
    keys: parseKeys(process.env.MISTRAL_API_KEYS, process.env.MISTRAL_API_KEY),
    models: {
      chat: ["open-mistral-nemo"],
      code: ["mistral-small-latest"],
      analysis: ["mistral-small-latest"],
    },
  },
  {
    name: "cloudflare",
    keys: parseKeys(process.env.CLOUDFLARE_KEYS, process.env.CLOUDFLARE_KEY),
    timeoutMs: 60_000,
    models: {
      chat: ["@cf/zai-org/glm-4.7-flash"],
      code: ["@cf/moonshotai/kimi-k2.7-code"],
      analysis: ["@cf/moonshotai/kimi-k2.6"],
    },
    resolveAuth(key) {
      const [accountId, token] = key.split(":");
      return { baseURL: `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1`, token };
    },
  },
];

const NEW_KEYED_PROVIDERS = [
  {
    name: "github-models",
    baseURL: "https://models.github.ai/inference",
    keys: parseKeys(process.env.GITHUB_MODELS_API_KEYS, process.env.GITHUB_MODELS_API_KEY),

    models: {
      chat: ["openai/gpt-4o", "openai/gpt-4o-mini"],
      code: ["openai/gpt-4.1"],
      analysis: ["openai/gpt-4o", "openai/gpt-4.1"],
    },
  },
  {
    name: "cohere",
    baseURL: "https://api.cohere.ai/compatibility/v1",
    keys: parseKeys(process.env.COHERE_API_KEYS, process.env.COHERE_API_KEY),

    models: {
      chat: ["command-a-plus-05-2026"],
      code: ["command-a-plus-05-2026"],
      analysis: ["command-a-plus-05-2026"],
    },
  },
  {
    name: "zhipu",
    baseURL: "https://open.bigmodel.cn/api/paas/v4",
    keys: parseKeys(process.env.ZHIPU_API_KEYS, process.env.ZHIPU_API_KEY),
    timeoutMs: 60_000,
    models: {
      chat: ["glm-4.5"],
      code: ["glm-4.7-flash"],
      analysis: ["glm-4.7-flash"],
    },
  },
  {
    name: "huggingface",
    baseURL: "https://router.huggingface.co/v1",
    keys: parseKeys(process.env.HUGGINGFACE_API_KEYS, process.env.HUGGINGFACE_API_KEY),

    models: {
      chat: ["Qwen/Qwen3-32B"],
      code: ["Qwen/Qwen3-32B"],
      analysis: ["deepseek-ai/DeepSeek-V3"],
    },
  },
  {
    name: "ollama-cloud",
    baseURL: "https://ollama.com/v1",
    keys: parseKeys(process.env.OLLAMA_API_KEYS, process.env.OLLAMA_API_KEY),
    timeoutMs: 120_000,

    models: {
      chat: ["gpt-oss:20b"],
      code: ["qwen3:32b"],
      analysis: ["gpt-oss:120b"],
    },
  },
  {
    name: "llm7",
    baseURL: "https://api.llm7.io/v1",
    keys: parseKeys(process.env.LLM7_API_KEYS, process.env.LLM7_API_KEY),

    models: {
      chat: ["gpt-oss-20b"],
      code: ["codestral"],
      analysis: ["gpt-oss-120b"],
    },
  },
  {
    name: "opencode-zen",
    baseURL: "https://opencode.ai/zen/v1",
    keys: parseKeys(process.env.OPENCODE_API_KEYS, process.env.OPENCODE_API_KEY),

    models: {
      chat: ["deepseek-v4-flash"],
      code: ["deepseek-v4-flash"],
      analysis: ["deepseek-v4-flash"],
    },
  },
  {
    name: "agnes",
    baseURL: "https://apihub.agnes-ai.com/v1",
    keys: parseKeys(process.env.AGNES_API_KEYS, process.env.AGNES_API_KEY),
    timeoutMs: 60_000,

    models: {
      chat: ["agnes-2.0-flash"],
      code: ["agnes-2.0-flash"],
      analysis: ["agnes-2.0-flash"],
    },
  },
  {
    name: "reka",
    baseURL: "https://api.reka.ai/v1",
    keys: parseKeys(process.env.REKA_API_KEYS, process.env.REKA_API_KEY),

    timeoutMs: 45_000,
    models: {
      chat: ["qwen3.6-flash chat-completions input tokens <=256K band"],
      code: ["qwen3.6-flash chat-completions input tokens <=256K band"],
      analysis: ["qwen3.6-flash chat-completions input tokens <=256K band"],
    },
  },
  {
    name: "routeway",
    baseURL: "https://api.routeway.ai/v1",
    keys: parseKeys(process.env.ROUTEWAY_API_KEYS, process.env.ROUTEWAY_API_KEY),
    extraHeaders: { "User-Agent": "Mozilla/5.0 FreeLLMAPI-Clone/1.0" },
    models: {
      chat: ["auto:free"],
      code: ["auto:free"],
      analysis: ["auto:free"],
    },
  },
  {
    name: "bazaarlink",
    baseURL: "https://bazaarlink.ai/api/v1",
    keys: parseKeys(process.env.BAZAARLINK_API_KEYS, process.env.BAZAARLINK_API_KEY),
    models: {
      chat: ["auto:free"],
      code: ["auto:free"],
      analysis: ["auto:free"],
    },
  },
  {
    name: "ainative",
    baseURL: "https://api.ainative.studio/api/v1",
    keys: parseKeys(process.env.AINATIVE_API_KEYS, process.env.AINATIVE_API_KEY),
    models: {
      chat: ["qwen-2.5-72b"],
      code: ["qwen-2.5-72b"],
      analysis: ["deepseek-v3"],
    },
  },
  {
    name: "aion",
    baseURL: "https://api.aionlabs.ai/v1",
    keys: parseKeys(process.env.AION_API_KEYS, process.env.AION_API_KEY),
    models: {
      chat: ["auto"],
      code: ["auto"],
      analysis: ["auto"],
    },
  },
  {
    name: "requesty",
    baseURL: "https://router.requesty.ai/v1",
    keys: parseKeys(process.env.REQUESTY_API_KEYS, process.env.REQUESTY_API_KEY),
    models: {
      chat: ["auto"],
      code: ["auto"],
      analysis: ["auto"],
    },
  },
  {
    name: "navy",
    baseURL: "https://api.navy/v1",
    keys: parseKeys(process.env.NAVY_API_KEYS, process.env.NAVY_API_KEY),
    extraHeaders: { "User-Agent": "FreeLLMAPI-Clone/1.0" },
    models: {
      chat: ["gpt-4o-mini"],
      code: ["gpt-4o-mini"],
      analysis: ["gpt-4o-mini"],
    },
  },
  {
    name: "nara",
    baseURL: "https://router.bynara.id/v1",
    keys: parseKeys(process.env.NARA_API_KEYS, process.env.NARA_API_KEY),
    models: {
      chat: ["mistral-large"],
      code: ["mistral-large"],
      analysis: ["mistral-medium-3-5"],
    },
  },
  {
    name: "sealion",
    baseURL: "https://api.sea-lion.ai/v1",
    keys: parseKeys(process.env.SEALION_API_KEYS, process.env.SEALION_API_KEY),

    models: {
      chat: ["aisingapore/Gemma-SEA-LION-v4-27B-IT"],
      code: ["aisingapore/Gemma-SEA-LION-v4-27B-IT"],
      analysis: ["aisingapore/Llama-SEA-LION-v3.5-70B-R"],
    },
  },
];

const KEYLESS_PROVIDERS = [
  {
    name: "pollinations",
    baseURL: "https://text.pollinations.ai/openai/v1",
    keyless: true,
    models: {
      chat: ["openai-fast"],
      code: ["openai-fast"],
      analysis: ["openai-fast"],
    },
  },
  {
    name: "ovh",
    baseURL: "https://oai.endpoints.kepler.ai.cloud.ovh.net/v1",
    keyless: true,
    models: {
      chat: ["Meta-Llama-3_3-70B-Instruct"],
      code: ["gpt-oss-120b"],
      analysis: ["gpt-oss-120b"],
    },
  },
  {
    name: "kilo",
    baseURL: "https://api.kilo.ai/api/gateway/v1",
    keyless: true,
    models: {
      chat: ["auto:free"],
      code: ["auto:free"],
      analysis: ["auto:free"],
    },
  },
];

export const RAW_PROVIDERS = [...EXISTING_PROVIDERS, ...NEW_KEYED_PROVIDERS, ...KEYLESS_PROVIDERS];
