import { ADMIN } from "./config.js";

function normalizeName(name) {
  return (name ?? "").trim().toLowerCase();
}

export function isAuthorized(chatId, displayName) {
  const normalized = normalizeName(displayName);
  if (!normalized) return false;
  return ADMIN.ownerNames.some((owner) => normalizeName(owner) === normalized);
}
