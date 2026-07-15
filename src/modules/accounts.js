import { db, nextId } from "../db/index.js";

// 账号设置模块：对应原型账号设置页，只维护账号连接状态和新增模拟账号。
export function listAccounts() {
  return db.accounts;
}

export function connectAccount(payload) {
  const platform = String(payload.platform || "douyin").trim();
  const accountName = String(payload.accountName || "").trim();
  if (!accountName) {
    throw new Error("账号名称不能为空");
  }

  const item = {
    id: nextId("acc", db.accounts),
    platform,
    platformName: { douyin: "抖音", kuaishou: "快手", xiaohongshu: "小红书", wechat_channel: "视频号" }[platform] || platform,
    accountName,
    status: "connected",
    fans: 0,
    videos: 0
  };
  db.accounts.unshift(item);
  return item;
}

export function toggleAccount(id) {
  const account = db.accounts.find((item) => item.id === id);
  if (!account) {
    throw new Error("账号不存在");
  }
  account.status = account.status === "connected" ? "disconnected" : "connected";
  return account;
}

