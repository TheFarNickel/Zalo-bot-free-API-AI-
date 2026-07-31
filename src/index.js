import "dotenv/config";
import express from "express";
import axios from "axios";
import { handleMessage } from "./bot.js";
import { getCachedImage } from "./image.js";
import { pickStickerFor } from "./stickers.js";
import { ZALO, BOT } from "./config.js";

function log(level, scope, message) {
  console.log(`[${new Date().toISOString()}] [${level}] [${scope}] ${message}`);
}
export const logger = {
  info: (scope, msg) => log("INFO", scope, msg),
  warn: (scope, msg) => log("WARN", scope, msg),
  error: (scope, msg) => log("ERROR", scope, msg),
};

function logConversation(chatId, speaker, text) {
  const preview = (text ?? "").replace(/\s+/g, " ").slice(0, 300);
  log("CHAT", `chat ${chatId}`, `${speaker}: ${preview}`);
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const ZALO_BASE_URL = `https://bot-api.zaloplatforms.com/bot${BOT_TOKEN}`;

const MAX_MESSAGE_LENGTH = ZALO.maxMessageLength;

async function callZaloApi(method, body, scope) {
  let res;
  try {
    res = await axios.post(`${ZALO_BASE_URL}/${method}`, body);
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    logger.error(scope, `${method} lỗi HTTP ${err.response?.status ?? "?"}: ${detail}`);
    throw err;
  }

  if (res.data?.ok !== true) {
    const detail = JSON.stringify(res.data);
    logger.error(scope, `${method} bị Zalo từ chối dù HTTP 200: ${detail}`);
    throw new Error(`Zalo từ chối ${method}: ${detail}`);
  }

  logger.info(scope, `${method} thành công (message_id: ${res.data?.result?.message_id ?? "?"})`);
  return res.data;
}

export async function sendMessage(chatId, text) {
  if (text.length <= MAX_MESSAGE_LENGTH) {
    logger.info("zalo-api", `sendMessage tới chat ${chatId}, độ dài ${text.length} ký tự`);
    return callZaloApi("sendMessage", { chat_id: chatId, text }, "zalo-api");
  }

  const totalChunksEstimate = Math.ceil(text.length / MAX_MESSAGE_LENGTH) + 1;
  const prefixReserve = `(${totalChunksEstimate}/${totalChunksEstimate})\n`.length;
  const chunkSize = MAX_MESSAGE_LENGTH - prefixReserve;

  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  logger.warn(
    "zalo-api",
    `tin nhắn dài ${text.length} ký tự, vượt giới hạn ${MAX_MESSAGE_LENGTH} -> chia thành ${chunks.length} tin`
  );

  let lastResult;
  for (let i = 0; i < chunks.length; i++) {
    const prefix = chunks.length > 1 ? `(${i + 1}/${chunks.length})\n` : "";
    const toSend = prefix + chunks[i];
    if (toSend.length > MAX_MESSAGE_LENGTH) {
      logger.warn("zalo-api", `đoạn ${i + 1} vẫn dư ${toSend.length - MAX_MESSAGE_LENGTH} ký tự sau khi trừ tiền tố, cắt cứng`);
    }
    lastResult = await callZaloApi(
      "sendMessage",
      { chat_id: chatId, text: toSend.slice(0, MAX_MESSAGE_LENGTH) },
      "zalo-api"
    );
  }
  return lastResult;
}

export async function sendPhoto(chatId, photoUrl, caption) {
  logger.info("zalo-api", `sendPhoto tới chat ${chatId}, url: ${photoUrl}`);
  return callZaloApi("sendPhoto", { chat_id: chatId, photo: photoUrl, caption }, "zalo-api");
}

export async function sendSticker(chatId, stickerId) {
  logger.info("zalo-api", `sendSticker tới chat ${chatId}, sticker: ${stickerId}`);
  return callZaloApi("sendSticker", { chat_id: chatId, sticker: stickerId }, "zalo-api");
}

export async function sendTyping(chatId) {
  try {
    await callZaloApi("sendChatAction", { chat_id: chatId, action: "typing" }, "zalo-api");
  } catch (err) {
    logger.warn("zalo-api", `sendChatAction lỗi (bỏ qua, không quan trọng): ${err.message}`);
  }
}

async function deliverReply(chatId, reply) {
  if (!reply) return;

  if (reply.type === "photo") {
    await sendPhoto(chatId, reply.url, reply.caption);
  } else {
    await sendMessage(chatId, reply.content);
  }

  try {
    const sticker = await pickStickerFor({
      department: reply.department,
      isError: reply.isError,
      replyText: reply.content ?? reply.caption,
    });
    await sendSticker(chatId, sticker);
  } catch (err) {
    logger.warn("zalo-api", `sendSticker lỗi (bỏ qua, không quan trọng): ${err.message}`);
  }
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const MENTION_PATTERN = new RegExp(`^@\\s*${escapeRegExp(BOT.displayName)}\\s*`, "i");

function stripMention(text) {
  const stripped = text.replace(MENTION_PATTERN, "").trim();
  if (stripped !== text.trim()) {
    logger.info("webhook", `bóc mention: "${text}" -> "${stripped || "(rỗng)"}"`);
  }

  return stripped || "Chào bạn";
}

const app = express();
app.use(express.json());

app.post("/webhook", async (req, res) => {
  const incomingSecret = req.header("X-Bot-Api-Secret-Token");
  if (incomingSecret !== process.env.WEBHOOK_SECRET) {
    logger.warn("webhook", "request có secret token sai, bị từ chối");
    return res.sendStatus(401);
  }

  res.sendStatus(200);

  try {
    const message = req.body?.message;

    if (!message) {
      logger.warn("webhook", `nhận request không có "message" — payload: ${JSON.stringify(req.body)}`);
      return;
    }

    if (!message.text) {
      logger.warn(
        "webhook",
        `nhận tin KHÔNG PHẢI text từ chat ${message.chat?.id} (event: ${req.body?.event_name}) — nguyên req.body: ${JSON.stringify(req.body)}`
      );
      const chatId = message.chat?.id;
      if (chatId) {
        await sendMessage(
          chatId,
          "Bot chưa đọc được file/ảnh bạn gửi đâu 😅 (Zalo Bot hiện chưa hỗ trợ nhận file). Bạn dán thẳng nội dung text vào chat giúp mình nhé, ban Phân tích vẫn xử lý được nội dung dài bình thường."
        );
      }
      return;
    }

    const chatId = message.chat.id;
    const displayName = message.from?.display_name?.trim() || `Người dùng (id ${message.from?.id ?? "?"})`;
    const cleanedText = stripMention(message.text);
    logConversation(chatId, displayName, cleanedText);
    logger.info("webhook", `nhận tin từ chat ${chatId} (${displayName})`);

    sendTyping(chatId);
    const typingInterval = setInterval(() => sendTyping(chatId), ZALO.typingIntervalMs);

    let reply;
    try {
      reply = await handleMessage(cleanedText, chatId, message.from?.display_name);
    } finally {
      clearInterval(typingInterval);
    }

    if (!reply) {
      logger.warn("webhook", `handleMessage không trả về gì cho chat ${chatId} (reply rỗng)`);
      return;
    }

    logger.info(
      "webhook",
      `chuẩn bị gửi (${reply.type}) cho chat ${chatId}, nội dung: "${(reply.content ?? reply.caption ?? "").slice(0, 80)}..."`
    );

    try {
      await deliverReply(chatId, reply);
      logConversation(chatId, "Bot", reply.content ?? reply.caption);
      logger.info("webhook", `ĐÃ XÁC NHẬN gửi thành công cho chat ${chatId} (${reply.type})`);
    } catch (err) {
      logger.error("webhook", `GỬI THẤT BẠI cho chat ${chatId}: ${err.message}`);
    }
  } catch (err) {
    logger.error("webhook", `lỗi xử lý: ${err.message}`);
  }
});

app.get("/", (_req, res) => res.send("Zalo bot is running"));

app.get("/img/:id", (req, res) => {
  const entry = getCachedImage(req.params.id);
  if (!entry) return res.sendStatus(404);
  res.set("Content-Type", entry.contentType);
  res.send(entry.buffer);
});

const port = process.env.PORT || 3000;
app.listen(port, () => logger.info("server", `chạy ở port ${port}`));
