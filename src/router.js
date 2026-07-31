const KEYWORDS = {
  image: [
    "vẽ", "tạo ảnh", "tạo hình", "generate image", "draw", "hình ảnh",
    "ảnh về", "vẽ cho", "sinh ảnh", "vẽ hình",
  ],
  code: [
    "code", "hàm", "function", "bug", "lỗi code", "viết chương trình",
    "sửa code", "debug", "javascript", "python", "sql", "html", "css",
    "thuật toán", "compile", "syntax", "regex", "api",
  ],
  analysis: [
    "phân tích", "so sánh", "thống kê", "báo cáo", "đánh giá",
    "xu hướng", "dữ liệu", "tổng hợp", "chiến lược", "nghiên cứu",
  ],
};

export function classifyDepartment(text) {
  const normalized = text.toLowerCase();
  let bestDept = "chat";
  let bestScore = 0;

  for (const [dept, keywords] of Object.entries(KEYWORDS)) {
    const score = keywords.filter((kw) => normalized.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestDept = dept;
    }
  }

  return bestDept;
}
