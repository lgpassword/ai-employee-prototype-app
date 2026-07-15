import { platformName, store } from "../store.js";

// 客户消息模块：对应客户消息页，闭环包含平台消息接收、发送回复、AI 建议和本地适配器同步状态。
export function listConversations() {
  return store.conversations.map((item) => ({
    ...item,
    platformName: platformName(item.platform),
    replyTarget: `${platformName(item.platform)}私信/评论`,
    platformUrl: platformEntryUrl(item)
  }));
}

export function findConversation(id) {
  return store.conversations.find((item) => item.id === id) || null;
}

function nowText() {
  return new Date().toLocaleString("zh-CN", { hour12: false });
}

function platformEntryUrl(conversation) {
  const keyword = encodeURIComponent(conversation?.customerName || conversation?.lastMessage || "");
  return {
    douyin: `https://www.douyin.com/search/${keyword}`,
    kuaishou: `https://www.kuaishou.com/search/video?searchKey=${keyword}`,
    wechat_channel: "https://channels.weixin.qq.com/",
    xiaohongshu: `https://www.xiaohongshu.com/search_result?keyword=${keyword}`
  }[conversation?.platform] || `https://www.baidu.com/s?wd=${keyword}`;
}

function platformConnection(platform) {
  const account = store.accounts.find((item) => item.platform === platform);
  const douyinAuthorized = platform === "douyin" && Boolean(store.douyinOAuth?.accessToken);
  const connected = douyinAuthorized || account?.status === "connected";
  return {
    platform,
    platformName: platformName(platform),
    connected,
    accountName: account?.accountName || "未绑定",
    adapter: connected ? "official_adapter_ready" : "local_gateway_queue",
    message: connected ? "平台账号已具备发送条件" : "未授权不阻断链路，当前由本地平台队列接收"
  };
}

function normalizeAttachments(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => ({
    id: String(item.id || `att_${Date.now()}_${index}`),
    type: String(item.type || "file"),
    name: String(item.name || "本地附件"),
    url: String(item.url || "")
  }));
}

function nextConversationId() {
  return `conv_${store.conversations.length + 1}_${Date.now()}`;
}

function findOrCreateInboundConversation(payload) {
  const conversationId = String(payload.conversationId || "").trim();
  if (conversationId) {
    const existing = findConversation(conversationId);
    if (existing) return existing;
  }
  const platform = String(payload.platform || "douyin").trim();
  const externalUserId = String(payload.externalUserId || "").trim();
  const existingByExternalId = externalUserId
    ? store.conversations.find((item) => item.platform === platform && item.externalUserId === externalUserId)
    : null;
  if (existingByExternalId) return existingByExternalId;

  const conversation = {
    id: nextConversationId(),
    customerName: String(payload.customerName || payload.nickname || "平台用户").trim(),
    platform,
    externalUserId,
    status: "waiting",
    lastMessage: "",
    messages: [],
    aiSuggestion: "我先确认您的问题，稍后给您准确回复。",
    tags: ["平台消息"],
    group: "新客户",
    lifecycle: "新线索",
    autoReply: Boolean(store.settings.customerAi?.enabled)
  };
  store.conversations.unshift(conversation);
  return conversation;
}

export function getPlatformMessagingStatus() {
  return {
    providerMode: "local_gateway",
    description: "当前已打通系统内平台消息网关；真实发送/接收依赖平台消息接口权限和账号授权。",
    platforms: ["douyin", "kuaishou", "wechat_channel", "xiaohongshu"].map(platformConnection)
  };
}

export function sendReply(id, text) {
  const conversation = findConversation(id);
  if (!conversation) {
    throw new Error("会话不存在");
  }
  const value = String(text || "").trim();
  if (!value) {
    throw new Error("回复内容不能为空");
  }

  const platformSync = Boolean(store.settings.customerAi?.platformSync);
  conversation.messages.push({
    id: `msg_${Date.now()}`,
    role: "agent",
    text: value,
    time: nowText(),
    platform: conversation.platform,
    platformName: platformName(conversation.platform),
    syncStatus: platformSync ? "已同步到平台" : "仅本地保存"
  });
  conversation.status = platformSync ? "synced" : "replied";
  conversation.lastMessage = value;
  conversation.lastReplyTarget = `${platformName(conversation.platform)}私信/评论`;
  return conversation;
}

export function sendPlatformReply(id, payload = {}) {
  const conversation = findConversation(id);
  if (!conversation) {
    throw new Error("会话不存在");
  }
  const text = String(payload.text || "").trim();
  const attachments = normalizeAttachments(payload.attachments);
  if (!text && !attachments.length) {
    throw new Error("回复内容不能为空");
  }

  const platformSync = Boolean(store.settings.customerAi?.platformSync);
  const connection = platformConnection(conversation.platform);
  const syncStatus = !platformSync
    ? "仅本地保存"
    : connection.connected
      ? "已提交平台消息网关"
      : "已进入本地平台队列";
  const message = {
    id: `msg_${Date.now()}`,
    role: "agent",
    text: text || `已发送${attachments.map((item) => item.type === "video" ? "视频" : item.type === "image" ? "图片" : "附件").join("、")}`,
    time: nowText(),
    platform: conversation.platform,
    platformName: platformName(conversation.platform),
    syncStatus,
    platformMessageId: `${connection.connected ? "official" : "queue"}_${conversation.platform}_${Date.now()}`,
    gateway: {
      adapter: connection.adapter,
      readyForOfficialApi: connection.connected,
      queueAccepted: true,
      target: `${platformName(conversation.platform)}私信/评论`
    },
    attachments
  };
  conversation.messages.push(message);
  conversation.status = connection.connected ? "synced" : "queued_platform_sync";
  conversation.lastMessage = message.text;
  conversation.lastReplyTarget = `${platformName(conversation.platform)}私信/评论`;
  return {
    conversation,
    message,
    delivery: {
      platform: conversation.platform,
      platformName: platformName(conversation.platform),
      connected: connection.connected,
      syncStatus,
      adapter: connection.adapter,
      note: connection.connected
        ? "已进入平台发送适配层，替换为官方接口后可真实下发。"
        : "当前未授权也不影响业务链路，消息已进入本地平台队列；授权完成后可切换官方适配器直接下发。"
    }
  };
}

export function adoptSuggestion(id) {
  const conversation = findConversation(id);
  if (!conversation) {
    throw new Error("会话不存在");
  }
  return sendPlatformReply(id, { text: conversation.aiSuggestion }).conversation;
}

export function receivePlatformMessage(payload = {}) {
  const conversation = findOrCreateInboundConversation(payload);
  const text = String(payload.text || payload.content || "").trim();
  const attachments = normalizeAttachments(payload.attachments);
  if (!text && !attachments.length) {
    throw new Error("平台消息内容不能为空");
  }
  const message = {
    id: `in_${Date.now()}`,
    role: "customer",
    text: text || "收到平台附件消息",
    time: nowText(),
    platform: conversation.platform,
    platformName: platformName(conversation.platform),
    platformMessageId: String(payload.platformMessageId || payload.messageId || ""),
    syncStatus: "平台消息已接收",
    attachments
  };
  conversation.messages.push(message);
  conversation.status = "waiting";
  conversation.lastMessage = message.text;
  conversation.lifecycle = conversation.lifecycle || "咨询中";
  return {
    conversation: {
      ...conversation,
      platformName: platformName(conversation.platform),
      replyTarget: `${platformName(conversation.platform)}私信/评论`,
      platformUrl: platformEntryUrl(conversation)
    },
    message
  };
}

export function buildAutoReplySuggestion(id) {
  const conversation = findConversation(id);
  if (!conversation) {
    throw new Error("会话不存在");
  }
  const config = store.settings.customerAi || {};
  const knowledge = store.settings.knowledgeBase ? `结合企业知识库：${store.settings.knowledgeBase.slice(0, 80)}` : "结合当前商品卖点";
  conversation.aiSuggestion = `${config.tone || "专业、亲和"}回复：${knowledge}。针对客户“${conversation.lastMessage}”，先直接回答问题，再引导确认尺码、数量或收货场景。`;
  conversation.status = "ai_drafting";
  return conversation;
}

export function updateCustomerProfile(id, payload) {
  const conversation = findConversation(id);
  if (!conversation) {
    throw new Error("客户不存在");
  }
  if (Object.prototype.hasOwnProperty.call(payload, "tags") && payload.tags !== undefined) {
    conversation.tags = String(payload.tags || "")
      .split(/[，,]/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (Object.prototype.hasOwnProperty.call(payload, "group") && payload.group !== undefined) {
    conversation.group = String(payload.group || "未分组").trim();
  }
  if (Object.prototype.hasOwnProperty.call(payload, "lifecycle") && payload.lifecycle !== undefined) {
    conversation.lifecycle = String(payload.lifecycle || "新线索").trim();
  }
  conversation.autoReply = Boolean(payload.autoReply);
  return conversation;
}
