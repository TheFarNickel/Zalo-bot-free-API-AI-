import axios from "axios";
import { logger } from "./index.js";
import { RAW_PROVIDERS } from "./providers.js";
import { LLM } from "./config.js";

function maskKey(key) {
  if (!key) return "?";
  return key.length <= 4 ? "***" : `***${key.slice(-4)}`;
}

export const providers = RAW_PROVIDERS.map((p) => ({
  timeoutMs: LLM.defaultTimeoutMs,
  extraHeaders: {},
  resolveAuth: (key) => ({ baseURL: p.baseURL, token: key }),
  ...p,
  keys: p.keyless ? ["__keyless__"] : p.keys,
})).filter((p) => p.keyless || p.keys.length > 0);

const stats = new Map();
function statKey(providerName, model) {
  return `${providerName}/${model}`;
}
function bumpStat(providerName, model, field) {
  const k = statKey(providerName, model);
  const entry = stats.get(k) ?? { success: 0, quotaHit: 0, error: 0 };
  entry[field]++;
  stats.set(k, entry);
}
export function getStatsSorted() {
  return [...stats.entries()]
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.success - a.success);
}
export function printStats() {
  const rows = getStatsSorted();
  if (rows.length === 0) return logger.info("stats", "chưa có dữ liệu gọi AI nào");
  const lines = rows.map(
    (r) => `${r.name}: ${r.success} ok, ${r.quotaHit} hết quota, ${r.error} lỗi`
  );
  logger.info("stats", `\n${lines.join("\n")}`);
}

const cooldownUntil = new Map();
const COOLDOWN_MS = LLM.cooldownMs;
function cooldownKey(providerName, key, model) {
  return `${providerName}/${maskKey(key)}/${model}`;
}
function isOnCooldown(providerName, key, model) {
  const until = cooldownUntil.get(cooldownKey(providerName, key, model));
  return until && Date.now() < until;
}
function setCooldown(providerName, key, model) {
  cooldownUntil.set(cooldownKey(providerName, key, model), Date.now() + COOLDOWN_MS);
}

const nextKeyIndex = new Map();
function rotatedKeys(provider) {
  const start = nextKeyIndex.get(provider.name) ?? 0;
  const { keys } = provider;
  nextKeyIndex.set(provider.name, (start + 1) % keys.length);
  return keys.map((_, i) => keys[(start + i) % keys.length]);
}

async function callModel(provider, key, model, messages) {
  const { baseURL, token } = provider.resolveAuth(key);
  const headers = { "Content-Type": "application/json", ...provider.extraHeaders };

  if (!provider.keyless) headers.Authorization = `Bearer ${token}`;

  const res = await axios.post(
    `${baseURL}/chat/completions`,
    { model, messages },
    { headers, timeout: provider.timeoutMs }
  );
  return res.data.choices[0].message.content;
}

export async function callSpecificModel(providerName, modelOverride, messages) {
  const provider = providers.find((p) => p.name === providerName);
  if (!provider) {
    throw new Error(`Không tìm thấy provider "${providerName}" (chưa cấu hình key trong .env, hoặc gõ sai tên)`);
  }

  const model = modelOverride || provider.models.chat?.[0] || Object.values(provider.models).flat()[0];
  if (!model) throw new Error(`Provider "${providerName}" không có model nào để dùng`);

  const [key] = rotatedKeys(provider);
  const label = provider.keyless ? `${providerName}(keyless)` : `${providerName}(${maskKey(key)})`;
  const start = Date.now();

  try {
    const reply = await callModel(provider, key, model, messages);
    bumpStat(provider.name, model, "success");
    return { ok: true, label, model, elapsedMs: Date.now() - start, reply };
  } catch (err) {
    const status = err.response?.status;
    bumpStat(provider.name, model, status === 429 ? "quotaHit" : "error");
    const error = status === 429 ? "hết quota (429)" : status ? `HTTP ${status}` : err.message;
    return { ok: false, label, model, elapsedMs: Date.now() - start, error };
  }
}

export async function testAllProviders() {
  const results = [];
  for (const provider of providers) {
    logger.info("test", `đang test provider "${provider.name}"...`);
    const result = await callSpecificModel(provider.name, null, [
      { role: "user", content: "Reply with exactly one word: ok" },
    ]);
    results.push(result);
  }
  return results;
}

export async function askLLM(messages, department = "chat") {
  if (providers.length === 0) {
    throw new Error("Chưa có provider nào — kiểm tra lại API key trong .env");
  }

  const errors = [];

  for (const provider of providers) {
    const models = provider.models[department] ?? provider.models.chat ?? [];

    for (const key of rotatedKeys(provider)) {
      const label = provider.keyless ? `${provider.name}(keyless)` : `${provider.name}(${maskKey(key)})`;

      for (const model of models) {
        if (isOnCooldown(provider.name, key, model)) {
          logger.info("llm", `bỏ qua ${label}/${model} (đang cooldown)`);
          continue;
        }

        try {
          logger.info("llm", `[${department}] đang gọi ${label}/${model}...`);
          const reply = await callModel(provider, key, model, messages);
          bumpStat(provider.name, model, "success");
          logger.info("llm", `${label}/${model} trả lời thành công`);
          return reply;
        } catch (err) {
          const status = err.response?.status;
          if (status === 429) {
            setCooldown(provider.name, key, model);
            bumpStat(provider.name, model, "quotaHit");
            logger.warn("llm", `${label}/${model} hết quota (429) -> thử tiếp`);
          } else {
            bumpStat(provider.name, model, "error");
            logger.error("llm", `${label}/${model} lỗi (${status ?? "?"}): ${err.message}`);
          }
          errors.push(`${label}/${model}: ${err.message ?? status}`);
        }
      }
    }
  }

  printStats();
  throw new Error(`[${department}] Tất cả model/provider/account đều fail:\n${errors.join("\n")}`);
}
