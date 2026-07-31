import axios from "axios";
import crypto from "crypto";
import { logger } from "./index.js";
import { IMAGE } from "./config.js";

const imageCache = new Map();
const CACHE_TTL_MS = IMAGE.cacheTtlMs;
const TIMEOUT_MS = 30_000;

function cleanupExpired() {
  const now = Date.now();
  for (const [id, entry] of imageCache) {
    if (now > entry.expiresAt) imageCache.delete(id);
  }
}

async function tryPollinations(prompt) {
  const encoded = encodeURIComponent(prompt.trim().slice(0, 300));
  const seed = Math.floor(Math.random() * 1_000_000);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&seed=${seed}&nologo=true`;
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: TIMEOUT_MS });
  return { buffer: Buffer.from(res.data), contentType: res.headers["content-type"] || "image/png" };
}

const DEEPAI_QUICKSTART_KEY = "quickstart-QUdJIGlzIGNvbWluZy4uLi4K";
async function tryDeepAI(prompt) {
  const res = await axios.post(
    "https://api.deepai.org/api/text2img",
    new URLSearchParams({ text: prompt.trim().slice(0, 300) }),
    { headers: { "api-key": DEEPAI_QUICKSTART_KEY }, timeout: TIMEOUT_MS }
  );
  const imageUrl = res.data?.output_url;
  if (!imageUrl) throw new Error("DeepAI không trả về output_url");

  const imgRes = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: TIMEOUT_MS });
  return { buffer: Buffer.from(imgRes.data), contentType: imgRes.headers["content-type"] || "image/jpeg" };
}

function cloudflareAccounts() {
  const raw = process.env.CLOUDFLARE_KEYS || process.env.CLOUDFLARE_KEY || "";
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}
async function tryCloudflare(prompt) {
  const [accountKey] = cloudflareAccounts();
  if (!accountKey) throw new Error("chưa cấu hình CLOUDFLARE_KEYS trong .env");

  const [accountId, token] = accountKey.split(":");
  const model = "@cf/black-forest-labs/flux-1-schnell";
  const res = await axios.post(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    { prompt: prompt.trim().slice(0, 300) },
    { headers: { Authorization: `Bearer ${token}` }, timeout: TIMEOUT_MS }
  );
  const b64 = res.data?.result?.image;
  if (!b64) throw new Error("Cloudflare không trả về ảnh (result.image rỗng)");
  return { buffer: Buffer.from(b64, "base64"), contentType: "image/jpeg" };
}

const SOURCES = [
  { name: "Pollinations", fn: tryPollinations },
  { name: "DeepAI", fn: tryDeepAI },
  { name: "Cloudflare Workers AI", fn: tryCloudflare },
];

export async function generateImage(prompt) {
  cleanupExpired();
  const errors = [];

  for (const source of SOURCES) {
    const start = Date.now();
    try {
      logger.info("image", `thử nguồn "${source.name}"...`);
      const { buffer, contentType } = await source.fn(prompt);
      logger.info("image", `"${source.name}" thành công sau ${Date.now() - start}ms`);

      const id = crypto.randomBytes(8).toString("hex");
      imageCache.set(id, { buffer, contentType, expiresAt: Date.now() + CACHE_TTL_MS });
      return { id, caption: `🎨 "${prompt.trim().slice(0, 200)}"` };
    } catch (err) {
      const elapsed = Date.now() - start;
      const reason =
        err.code === "ECONNABORTED"
          ? `quá thời gian (>${TIMEOUT_MS}ms)`
          : err.response?.status
          ? `HTTP ${err.response.status}`
          : err.message;
      logger.warn("image", `"${source.name}" thất bại sau ${elapsed}ms (${reason}) -> thử nguồn kế tiếp`);
      errors.push(`${source.name}: ${reason}`);
    }
  }

  throw new Error(`Tất cả nguồn tạo ảnh đều fail:\n${errors.join("\n")}`);
}

export function getCachedImage(id) {
  const entry = imageCache.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    imageCache.delete(id);
    return null;
  }
  return entry;
}
