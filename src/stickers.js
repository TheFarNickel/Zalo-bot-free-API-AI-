import { askLLM } from "./llm.js";
import { logger } from "./index.js";

const STICKERS = {
  chao: ["b0804fe872ad9bf3c2bc", "f665312e0d6be435bd7a"],
  chaoBuoiSang: ["87c561ed5da8b4f6edb9"],
  xinLoi: ["1391edf9d0bc39e260ad", "57bfd8e6e4a30dfd54b2", "f454351f095ae004b94b"],
  camOn: ["1c66e50ed84b3115685a", "518abaa286e76fb936f6"],
  tuChoi: ["f5eb0f8332c6db9882d7", "19d972884ecda793fedc"],
  cauCuu: ["2ddcdab4e7f10eaf57e0"],
  tramCam: ["e5eb11832cc6c5989cd7"],
  khen: ["5bccaaa497e17ebf27f0"],
  deDoa: ["1342e32ade6f37316e7e"],
  batLuc: ["a155593d64788d26d469", "a78c38ee04abedf5b4ba"],
  quayXe: ["a57a4d177052990cc043"],
  met: ["29f9c394fed1178f4ec0"],
  xaLanh: ["86146d79503cb962e02d"],
  tamBiet: ["77089220ae65473b1e74", "62f71cb220f7c9a990e6"],
  henGapLai: ["26a3c28bfece17904edf"],
  daHieu: ["1f4fff67c3222a7c7333"],
  hoiTham: ["b9cad39befde06805fcf"],
  daXong: ["d5efb9be85fb6ca535ea"],
  xaGiao: ["d5efb9be85fb6ca535ea", "a1d5788444c1ad9ff4d0", "fe0420551c10f54eac01", "41e683b7bff256ac0fe3", "db371b662723ce7d9732"],
  suyNghi: ["fa70bb2287676e393776"],
  ok: ["3de775b549f0a0aef9e1"],
  soc: ["12319168ad2d44731d3c", "b7ed41b67df394adcde2", "c71cc847f4021d5c4413"],
  cuoiVl: ["8154750f494aa014f95b", "bb580c373072d92c8063"],
  buon: ["1add61985dddb483edcc", "035d9d3fa17a4824116b"],
  oiGioiOi: ["e34c622e5e6bb735ee7a"],
};

const STICKER_MEANINGS = { //1 số sticker thông dụng
  chao: "chào hỏi bình thường",
  chaoBuoiSang: "chào buổi sáng",
  xinLoi: "xin lỗi",
  camOn: "cảm ơn",
  tuChoi: "từ chối một yêu cầu",
  cauCuu: "cầu cứu, khẩn cấp",
  tramCam: "buồn bã, trầm cảm, tiêu cực",
  khen: "khen ngợi, công nhận ai đó giỏi",
  deDoa: "hù doạ/đe doạ kiểu đùa",
  batLuc: "bất lực, chịu thua, hết cách (kể cả khi AI bị lỗi không trả lời được)",
  quayXe: "đổi ý đột ngột, quay xe",
  met: "mệt mỏi, đuối sức",
  xaLanh: "xa lánh, né tránh, ngại",
  tamBiet: "tạm biệt, kết thúc trò chuyện",
  henGapLai: "hẹn gặp lại lần sau",
  daHieu: "đã hiểu, ok đã nắm được",
  hoiTham: "hỏi thăm ai đó theo kiểu mệt mỏi",
  daXong: "đã hoàn thành xong 1 việc gì đó",
  xaGiao: "xã giao chung chung, không có cảm xúc nổi bật, dùng khi không chắc",
  suyNghi: "đang suy nghĩ, cân nhắc",
  ok: "đồng ý, ok",
  soc: "sốc, bất ngờ",
  cuoiVl: "cười lớn, hài hước, troll",
  buon: "buồn",
  oiGioiOi: "ngạc nhiên kiểu than trời",
};

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const CATEGORY_KEYS = Object.keys(STICKERS);

const STICKER_ROUTER_PROMPT = {
  role: "system",
  content:
    "Bạn là bộ chọn sticker theo CẢM XÚC/NGỮ CẢNH của 1 câu trả lời chat tiếng Việt. " +
    "Đọc câu trả lời rồi chọn ĐÚNG 1 nhãn phù hợp nhất trong danh sách sau, trả lời DUY NHẤT " +
    "tên nhãn (không giải thích, không dấu câu):\n" +
    CATEGORY_KEYS.map((k) => `${k}: ${STICKER_MEANINGS[k]}`).join("\n") +
    "\nNếu không chắc nhãn nào hợp, chọn 'xaGiao'.",
};

async function pickCategoryByAI(replyText) {
  try {
    const raw = await askLLM(
      [STICKER_ROUTER_PROMPT, { role: "user", content: (replyText || "").slice(0, 500) }],
      "chat"
    );
    const guess = raw.trim().replace(/[^a-zA-Z]/g, "");
    const match = CATEGORY_KEYS.find((k) => k.toLowerCase() === guess.toLowerCase());
    if (match) return match;
    logger.warn("sticker", `AI trả về nhãn không hợp lệ "${raw}" -> fallback "xaGiao"`);
  } catch (err) {
    logger.warn("sticker", `AI chọn sticker lỗi (${err.message}) -> fallback "xaGiao"`);
  }
  return "xaGiao";
}

export async function pickStickerFor({ department, isError, replyText }) {
  if (isError) return pick(STICKERS.batLuc);
  if (department === "image") return pick(STICKERS.daXong);

  const category = await pickCategoryByAI(replyText);
  return pick(STICKERS[category]);
}
