import { db, nextId } from "../db/index.js";

function keywords(text) {
  const source = String(text || "");
  const base = source
    .toLowerCase()
    .split(/[\s,，。；;、!?！？]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const chinese = Array.from(source.matchAll(/[\u4e00-\u9fff]{2,}/g))
    .flatMap(([word]) => {
      const chars = [...word];
      const pairs = chars.slice(0, -1).map((char, index) => `${char}${chars[index + 1]}`);
      return [...pairs, ...chars];
    });
  return [...new Set([...base, ...chinese])];
}

function scoreEntry(entry, query) {
  const source = `${entry.title || ""} ${entry.content || ""} ${(entry.tags || []).join(" ")}`.toLowerCase();
  const words = keywords(query);
  return words.reduce((score, word) => score + (source.includes(word) ? 1 : 0), 0);
}

export function listKnowledgeEntries() {
  return db.knowledgeEntries || [];
}

export function upsertKnowledgeEntry(payload = {}) {
  db.knowledgeEntries ||= [];
  const id = String(payload.id || "").trim();
  const item = id ? db.knowledgeEntries.find((entry) => entry.id === id) : null;
  const next = item || {
    id: nextId("kb", db.knowledgeEntries),
    createdAt: new Date().toISOString()
  };
  next.type = String(payload.type || next.type || "note").trim();
  next.title = String(payload.title || next.title || "").trim();
  next.content = String(payload.content || next.content || "").trim();
  next.tags = Array.isArray(payload.tags)
    ? payload.tags.map(String).map((tag) => tag.trim()).filter(Boolean)
    : String(payload.tags || next.tags?.join(",") || "").split(/[，,]/).map((tag) => tag.trim()).filter(Boolean);
  next.updatedAt = new Date().toISOString();
  if (!next.title || !next.content) {
    throw new Error("知识库标题和内容不能为空");
  }
  if (!item) db.knowledgeEntries.unshift(next);
  return next;
}

export function searchKnowledge(query, limit = 3) {
  const entries = listKnowledgeEntries()
    .map((entry) => ({ ...entry, score: scoreEntry(entry, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  if (entries.length) return entries;
  const fallback = String(db.settings.knowledgeBase || "").trim();
  return fallback ? [{
    id: "settings_knowledge_base",
    type: "legacy_text",
    title: "企业知识库文本",
    content: fallback,
    tags: ["企业知识库"],
    score: 1
  }] : [];
}
