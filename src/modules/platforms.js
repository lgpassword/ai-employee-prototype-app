import { db, nextId, platformName } from "../db/index.js";

const capabilities = {
  douyin: ["内容搜索", "账号同步", "评论/私信队列", "视频发布待审批"],
  kuaishou: ["内容搜索跳转", "消息本地队列", "发布计划"],
  xiaohongshu: ["内容搜索跳转", "商品种草分析", "发布计划"],
  wechat_channel: ["账号状态", "客户线索", "发布计划"]
};

export function getPlatformCapabilityMatrix() {
  return Object.entries(capabilities).map(([platform, items]) => {
    const account = db.accounts.find((candidate) => candidate.platform === platform);
    return {
      platform,
      platformName: platformName(platform),
      status: account?.status || "disconnected",
      capabilities: items.map((name) => ({
        name,
        status: account?.status === "connected" || platform === "douyin" && db.douyinOAuth?.accessToken ? "ready" : "local_or_pending"
      }))
    };
  });
}

export function listPlatformSyncRecords() {
  return db.platformSyncRecords || [];
}

export function recordPlatformSync(payload = {}) {
  db.platformSyncRecords ||= [];
  const item = {
    id: nextId("sync", db.platformSyncRecords),
    platform: String(payload.platform || "douyin").trim(),
    platformName: platformName(String(payload.platform || "douyin").trim()),
    action: String(payload.action || "sync").trim(),
    source: String(payload.source || "manual").trim(),
    status: String(payload.status || "recorded").trim(),
    detail: payload.detail || {},
    createdAt: new Date().toISOString()
  };
  db.platformSyncRecords.unshift(item);
  return item;
}
