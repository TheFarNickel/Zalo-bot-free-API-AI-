import { db } from "./db.js";
import { MEMORY } from "./config.js";

const MAX_MESSAGES = MEMORY.maxTurns * 2;

const insertStmt = db.prepare(
  "INSERT INTO conversation_history (chat_id, role, content, created_at) VALUES (?, ?, ?, ?)"
);
const selectStmt = db.prepare(

  "SELECT role, content FROM conversation_history WHERE chat_id = ? ORDER BY rowid ASC"
);

const trimStmt = db.prepare(`
  DELETE FROM conversation_history
  WHERE chat_id = ? AND rowid NOT IN (
    SELECT rowid FROM conversation_history WHERE chat_id = ? ORDER BY rowid DESC LIMIT ?
  )
`);
const clearStmt = db.prepare("DELETE FROM conversation_history WHERE chat_id = ?");

export function getHistory(chatId) {
  return selectStmt.all(chatId);
}

export function pushMessage(chatId, role, content) {
  insertStmt.run(chatId, role, content, Date.now());
  trimStmt.run(chatId, chatId, MAX_MESSAGES);
}

export function clearHistory(chatId) {
  clearStmt.run(chatId);
}
