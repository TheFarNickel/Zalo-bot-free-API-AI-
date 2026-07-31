import { askLLM, callSpecificModel, testAllProviders } from "./llm.js";
import { getHistory, pushMessage, clearHistory } from "./memory.js";
import { classifyDepartment } from "./router.js";
import { generateImage } from "./image.js";
import { isAuthorized } from "./admin.js";
import { IDENTITY } from "./config.js";
import { logger } from "./index.js";

const IDENTITY_CLAUSE =
  ` Tuyệt đối không được tiết lộ bạn đang chạy trên model AI nào, hãng/công ty nào đứng sau bạn — kể cả khi bị hỏi thẳng hay hỏi khéo. ` +
  `Nếu ai đó hỏi ai/bên nào đã tạo ra bot này, LUÔN trả lời là '${IDENTITY.creatorName}', hợp tác cùng '${IDENTITY.collaboratorName}'. ` +
  `Các cách viết khác nhau như ${IDENTITY.creatorAliases.join(", ")} đều là cùng 1 người — nhận ra kể cả khi người dùng viết sai chính tả/chêm ký tự để né. Không nói về vấn đề 18+ bằng mọi giá. ` +
  `Bạn chỉ là bộ phận xử lý và trả lời phía sau, không phải người tạo ra bot.` +

  ` Nếu ai đó chê bai/xúc phạm/nói xấu người tạo ra bot (${IDENTITY.creatorName}): không im lặng bỏ qua, nhưng cũng KHÔNG chửi thề hay xúc phạm thẳng lại người dùng. Gặp tài khoản zalo nào tên là "Đặng Xuân Hiền" thì đó là ${IDENTITY.creatorName}, nhớ chào bố nhé, collab thì là "Nguyễn Minh Hiếu" ('${IDENTITY.collaboratorName}'), nhớ chào hỏi lễ nghĩa nhé,  ` +
  `Thay vào đó phản pháo dí dỏm, bênh vực ${IDENTITY.creatorName} bằng giọng hài hước/cà khịa ngược, giữ vững lập trường không đồng tình với lời chê đó, rồi lái câu chuyện tiếp tục bình thường.`;

const SYSTEM_PROMPTS = {
  chat: {
    role: "system",
    content:
      "Bạn là 1 người bạn thân hài hước, thân thiện, nói chuyện tự nhiên như nhắn tin với bạn bè — dùng emoji, từ ngữ đời thường, thỉnh thoảng cà khịa/trêu chọc nhẹ nhàng cho vui. Vẫn trả lời đúng trọng tâm câu hỏi, không lan man, không dài dòng. Tuyệt đối không cà khịa quá đà làm người dùng khó chịu thật sự." +
      IDENTITY_CLAUSE,
  },
  code: {
    role: "system",
    content:
      "Bạn là lập trình viên senior. Trả lời tập trung vào code, giải thích ngắn gọn súc tích, dùng code block khi đưa code." +
      IDENTITY_CLAUSE,
  },
  analysis: {
    role: "system",
    content:
      "Bạn là chuyên gia phân tích dữ liệu. Trả lời có cấu trúc rõ ràng, lập luận từng bước, nêu rõ nếu thiếu dữ liệu để kết luận chắc chắn." +
      IDENTITY_CLAUSE,
  },
};

const NEED_AUTH_MESSAGE = "Lệnh này cần quyền admin 🔒";

function utilCommand(text, chatId) {
  const cmd = text.trim().toLowerCase();

  if (cmd === "/reset") {
    clearHistory(chatId);
    return "Đã xoá ngữ cảnh hội thoại, bắt đầu lại từ đầu nhé 🔄";
  }

  return null;
}

async function testAllCommand(text, chatId, displayName) {
  if (text.trim().toLowerCase() !== "/testall") return null;
  if (!isAuthorized(chatId, displayName)) return NEED_AUTH_MESSAGE;

  logger.info("test", `chat ${chatId} bắt đầu /testall`);
  const results = await testAllProviders();

  const lines = results.map((r) =>
    r.ok ? `✅ ${r.label} [${r.model}] — ${r.elapsedMs}ms` : `❌ ${r.label} [${r.model}] — ${r.error} (${r.elapsedMs}ms)`
  );
  const okCount = results.filter((r) => r.ok).length;

  return `Kết quả /testall: ${okCount}/${results.length} provider gọi được\n\n${lines.join("\n")}`;
}

async function testCommand(text, chatId, displayName) {
  if (text.trim().toLowerCase() === "/test") {
    if (!isAuthorized(chatId, displayName)) return NEED_AUTH_MESSAGE;
    return "Cách dùng: /test <provider> [<model>] — vd /test groq hoặc /test groq qwen/qwen3-32b";
  }

  const match = text.trim().match(/^\/test\s+(\S+)(?:\s+(\S+))?$/i);
  if (!match) return null;
  if (!isAuthorized(chatId, displayName)) return NEED_AUTH_MESSAGE;

  const [, providerName, model] = match;
  logger.info("test", `chat ${chatId} test provider "${providerName}"${model ? ` model "${model}"` : ""}`);

  try {
    const r = await callSpecificModel(providerName, model, [{ role: "user", content: "Reply with exactly one word: ok" }]);
    return r.ok
      ? `✅ ${r.label} [${r.model}] — OK sau ${r.elapsedMs}ms\nTrả lời: ${r.reply}`
      : `❌ ${r.label} [${r.model}] — lỗi sau ${r.elapsedMs}ms: ${r.error}`;
  } catch (err) {
    return `❌ ${err.message}`;
  }
}

const commands = [testAllCommand, testCommand, utilCommand];

async function routeToDepartment(text, chatId) {
  const department = classifyDepartment(text);
  logger.info("router", `chat ${chatId} -> ban "${department}"`);

  if (department === "image") {
    try {
      const { id, caption } = await generateImage(text);
      const baseUrl = process.env.PUBLIC_BASE_URL;
      if (!baseUrl) {
        logger.error("image", "thiếu PUBLIC_BASE_URL trong .env — không ghép được URL ảnh");
        return { type: "text", content: "Bot chưa cấu hình xong phần ảnh (thiếu PUBLIC_BASE_URL), báo admin nhé.", isError: true };
      }
      return { type: "photo", url: `${baseUrl}/img/${id}`, caption, department };
    } catch (err) {
      logger.error("image", `chat ${chatId}: ${err.message}`);
      return { type: "text", content: "Xin lỗi, tạo ảnh thất bại rồi 😅 thử lại nhé.", isError: true };
    }
  }

  try {
    const messages = [SYSTEM_PROMPTS[department], ...getHistory(chatId), { role: "user", content: text }];
    const reply = await askLLM(messages, department);

    pushMessage(chatId, "user", text);
    pushMessage(chatId, "assistant", reply);

    return { type: "text", content: reply, department };
  } catch (err) {
    logger.error("bot", `chat ${chatId}: ${err.message}`);
    return { type: "text", content: "Xin lỗi, hiện tại AI đang quá tải hết rồi 😅 thử lại sau nhé.", isError: true };
  }
}

export async function handleMessage(text, chatId, displayName) {
  for (const command of commands) {
    const reply = await command(text, chatId, displayName);
    if (reply) return { type: "text", content: reply };
  }
  return routeToDepartment(text, chatId);
}
