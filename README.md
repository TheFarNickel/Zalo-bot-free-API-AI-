# Zalo AI Bot
<p align="center">
<img src="https://img.shields.io/badge/-JavaScript-black?style=flat-square&logo=javascript"/>
<img src="https://img.shields.io/badge/-Nodejs-black?style=flat-square&logo=Node.js"/>
<img src="https://img.shields.io/badge/-MySQL-black?style=flat-square&logo=mysql"/>
</p>
Bot AI dành cho Zalo được xây dựng bằng Node.js (chủ yếu support nhiều cho tiếng Việt)
Hỗ trợ nhiều nhà cung cấp AI, tự động chuyển provider khi lỗi hoặc hết quota, ghi nhớ hội thoại, tạo ảnh và nhiều tính năng khác.
Xem https://bot.zapps.me/docs/create-bot/ để biết cách tạo bot và vài thứ khác. Ngoài ra, bạn không cần đổi gì trong code

## 1. Local host

```bash
npm install
cp .env.example .env
```

Điền `BOT_TOKEN` (lấy khi tạo bot ở https://zalo.me/s/botcreator/) và tự đặt `WEBHOOK_SECRET` (chuỗi bất kỳ ≥ 8 ký tự) vào file `.env`.

## 2. Next

```bash
npm run dev
```

Local chưa có domain public nên Zalo không gọi webhook vào máy được. Dùng 1 trong 2 cách:

- **ngrok**: `ngrok http 3000` → lấy URL dạng `https://xxxx.ngrok-free.app` → dùng URL đó + `/webhook` khi gọi `setWebhook`.
- **Cloudflare Tunnel**: tương tự ngrok, miễn phí và ổn định hơn cho dùng lâu dài.

## 3. Đăng ký webhook

Gọi 1 lần (thay TOKEN, URL, SECRET):

```bash
curl -X POST "https://bot-api.zaloplatforms.com/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://xxxx.ngrok-free.app/webhook","secret_token":"<WEBHOOK_SECRET>"}'
```

Nhắn tin cho bot trên Zalo để test — bot sẽ trả lời qua webhook vừa set.
## 3,5. Host trên railway (nên sử dụng)
- Tôi nhớ nó auto tạo biến môi trường trên railway, nếu không thì tự tạo nhé:]
## 4. Thêm provider AI / nhiều account cho 1 provider

`src/llm.js` hỗ trợ **nhiều key (nhiều API) cho cùng 1 provider** . Điền các key cách nhau bằng dấu phẩy trong `.env`:

```
GEMINI_API_KEYS=API1,API2
GROQ_API_KEYS=API1,API2
OPENROUTER_API_KEYS=API1,API2
CEREBRAS_API_KEYS=API1,API2
NVIDIA_API_KEYS=API1,API2
MISTRAL_API_KEYS=API1,API2
...

# Cloudflare Workers AI cần account_id RIÊNG cho từng account, nên mỗi key phải
# điền theo dạng "accountId:apiToken":
CLOUDFLARE_KEYS=account_id_1:token_1,account_id_2:token_2
```

Chỉ điền 1 key vẫn dùng được bình thường (biến số ít `GROQ_API_KEY`...). Provider nào không điền key nào thì tự động bị bỏ qua.

Bot sẽ tự **xoay vòng API** mỗi lần trả lời, và khi 1 account bị
hết quota (429) thì thử hết các model của account đó trước khi nhảy sang API
kế — API vừa hết quota sẽ nghỉ 60 giây trước khi được thử lại. Thống kê theo
provider+model (không tách theo API) được in ra console để dễ đọc.

**Lưu ý khi thêm provider mới**: hầu hết dịch vụ AI free hiện nay có endpoint kiểu
OpenAI-compatible (`POST {baseURL}/chat/completions`) nên chỉ cần thêm 1 object vào
mảng `providers` là chạy được. Riêng provider nào cần thêm thông tin khác ngoài
API key (như Cloudflare cần `account_id`) thì viết thêm hàm `resolveAuth(key)` cho
provider đó, xem Cloudflare làm ví dụ.

## 5. Lưu dữ liệu bền — gắn Railway Volume (BẮT BUỘC nếu không muốn mất dữ liệu và host trên railway)

Lịch sử hội thoại lưu trong file SQLite (`src/db.js`).
Nhưng filesystem mặc định của Railway **KHÔNG bền** — mỗi lần redeploy, file đó
biến mất y hệt như hồi còn lưu RAM. Cần gắn thêm 1 Volume (ổ đĩa bền):

1. Chuột phải vào project trên Railway → chọn **Attach Volume** → tab **Settings**.
2. Nếu hiện **Create volume** là ok.
3. Đặt **Mount Path** là `/data` (đúng chữ này, không có gì khác).
4. Vào tab **Variables**, thêm biến `DB_PATH=/data/bot.db`.
5. Redeploy lại service 1 lần.

Từ giờ, mỗi lần push code mới/redeploy, lịch sử hội thoại
vẫn còn nguyên — chỉ file code được cập nhật, dữ liệu trong Volume không bị đụng.


## 6. Cấu trúc project (`src/`)

src 
- ├── index.js # Khởi tạo Express 
- ├── bot.js # Xử lý tin nhắn 
- ├── llm.js # Gọi AI 
- ├── router.js # Phân loại yêu cầu 
- ├── providers.js # Danh sách AI 
- ├── image.js # Tạo ảnh 
- ├── stickers.js # Sticker 
- ├── db.js # SQLite 
- ├── memory.js # Bộ nhớ hội thoại 
- ├── admin.js # Lệnh quản trị 
- └── config.js # Cấu hình

## 7.Lưu ý
- Tôi chx test kỹ cái này đâu:]]]
