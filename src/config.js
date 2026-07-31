export const BOT = {
  displayName: " ", //nếu sử dụng bot trong gr thì nên set tên bot để nó tự bỏ qua @
};

export const ADMIN = {
  ownerNames: [" "],   //tên acc zalo, set để acc đó sử dụng được lệnh /test <providers> <model>, /testall
};

export const IDENTITY = {
  creatorName: "FarN", //tên người làm bot

  creatorAliases: ["FarN", "FarNickel", "Far N", "Far Nickel", "farn", "farnickel"],

  collaboratorName: "Sunkenquill", //collaborator
};

export const MEMORY = {
  maxTurns: 10, //số lượng chat nhớ nhiều nhất (càng nhiều càng tốn quota)
};

export const LLM = {
  cooldownMs: 60 * 1000,

  defaultTimeoutMs: 20_000,
};

export const ZALO = {
  maxMessageLength: 2000,

  typingIntervalMs: 4000,
};

export const IMAGE = {
  cacheTtlMs: 10 * 60 * 1000,
};
