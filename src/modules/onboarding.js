import { store } from "../store.js";

const quotaLabels = {
  contentSearches: "内容搜索",
  videoDrafts: "脚本草稿",
  videoRenders: "视频生成"
};

function emptySession() {
  return {
    userId: null,
    username: "",
    userType: null,
    role: "",
    displayName: "",
    expiresAt: "",
    quota: {},
    loggedInAt: null
  };
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function findUserByUsername(username) {
  const normalized = String(username || "").trim().toLowerCase();
  return store.users.find((item) => item.username.toLowerCase() === normalized);
}

function findUserById(userId) {
  return store.users.find((item) => item.id === userId);
}

function isExpired(user) {
  return Boolean(user.expiresAt) && user.expiresAt < todayText();
}

function normalizeQuota(raw = {}) {
  return Object.fromEntries(Object.entries(quotaLabels).map(([key, label]) => {
    const quota = raw[key] || {};
    const limit = Math.max(0, Number(quota.limit ?? 0));
    const used = Math.max(0, Number(quota.used ?? 0));
    return [key, {
      key,
      label,
      limit,
      used,
      remaining: Math.max(0, limit - used)
    }];
  }));
}

function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    userType: user.userType,
    role: user.role,
    expiresAt: user.expiresAt,
    enabled: Boolean(user.enabled),
    expired: isExpired(user),
    quota: normalizeQuota(user.quotas)
  };
}

function sessionForUser(user) {
  return {
    userId: user.id,
    username: user.username,
    userType: user.userType,
    role: user.role,
    displayName: user.displayName,
    expiresAt: user.expiresAt,
    quota: normalizeQuota(user.quotas),
    loggedInAt: new Date().toISOString()
  };
}

function refreshCurrentSession() {
  const user = findUserById(store.session.userId);
  if (!user) {
    store.session = emptySession();
    return store.session;
  }
  store.session = {
    ...store.session,
    username: user.username,
    userType: user.userType,
    role: user.role,
    displayName: user.displayName,
    expiresAt: user.expiresAt,
    quota: normalizeQuota(user.quotas)
  };
  return store.session;
}

export function assertActiveSession() {
  const user = findUserById(store.session.userId);
  if (!user) {
    throw new Error("请先登录后再使用系统");
  }
  if (!user.enabled) {
    throw new Error("当前账号已停用，请联系管理员");
  }
  if (isExpired(user)) {
    logout();
    throw new Error("当前账号已到期，请联系管理员续期");
  }
  return user;
}

export function consumeQuota(key, amount = 1) {
  const user = assertActiveSession();
  if (!quotaLabels[key]) {
    throw new Error("额度类型不存在");
  }
  const quota = user.quotas[key] || { limit: 0, used: 0 };
  const consumeAmount = Math.max(1, Number(amount || 1));
  const remaining = Math.max(0, Number(quota.limit || 0) - Number(quota.used || 0));
  if (remaining < consumeAmount) {
    throw new Error(`${quotaLabels[key]}额度不足，请联系管理员增加额度`);
  }
  quota.used = Number(quota.used || 0) + consumeAmount;
  user.quotas[key] = quota;
  refreshCurrentSession();
  return normalizeQuota(user.quotas)[key];
}

// 登录与商户入驻模块：只负责账号/session、使用期限额度、商户资质材料状态。
export function login(payload) {
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  const expectedUserType = String(payload.userType || "").trim();
  const user = findUserByUsername(username);
  if (!username || !password) {
    throw new Error("请输入账号和密码");
  }
  if (!user || user.password !== password) {
    throw new Error("账号或密码不正确");
  }
  if (expectedUserType && user.userType !== expectedUserType) {
    throw new Error("账号身份与当前选择不匹配");
  }
  if (!user.enabled) {
    throw new Error("当前账号已停用，请联系管理员");
  }
  if (isExpired(user)) {
    throw new Error("当前账号已到期，请联系管理员续期");
  }

  store.session = sessionForUser(user);
  return store.session;
}

export function logout() {
  store.session = emptySession();
  return store.session;
}

export function getSession() {
  return refreshCurrentSession();
}

export function getUsers() {
  const current = assertActiveSession();
  if (current.role !== "admin") {
    throw new Error("只有管理员可以查看用户额度配置");
  }
  return store.users.map(publicUser);
}

export function updateUserAccess(payload) {
  const current = assertActiveSession();
  if (current.role !== "admin") {
    throw new Error("只有管理员可以修改用户期限和额度");
  }
  const user = findUserById(String(payload.userId || ""));
  if (!user) {
    throw new Error("用户不存在");
  }
  if (payload.expiresAt !== undefined) {
    user.expiresAt = String(payload.expiresAt || "").trim();
  }
  if (payload.enabled !== undefined) {
    user.enabled = Boolean(payload.enabled);
  }
  const quotas = payload.quotas || {};
  Object.keys(quotaLabels).forEach((key) => {
    if (!quotas[key]) return;
    user.quotas[key] = {
      limit: Math.max(0, Number(quotas[key].limit ?? user.quotas[key]?.limit ?? 0)),
      used: Math.max(0, Number(quotas[key].used ?? user.quotas[key]?.used ?? 0))
    };
  });
  if (store.session.userId === user.id) {
    refreshCurrentSession();
  }
  return publicUser(user);
}

export function getMerchantOnboarding() {
  return store.merchantOnboarding;
}

export function saveMerchantProfile(payload) {
  store.merchantOnboarding.businessName = String(payload.businessName || "").trim();
  store.merchantOnboarding.unifiedSocialCreditCode = String(payload.unifiedSocialCreditCode || "").trim();
  store.merchantOnboarding.contactName = String(payload.contactName || "").trim();
  store.merchantOnboarding.contactPhone = String(payload.contactPhone || "").trim();
  return store.merchantOnboarding;
}

function buildCode(prefix) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  return `${prefix}${stamp}`;
}

function buildReviewDate(days = 5) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return date.toISOString().slice(0, 10);
}

function ensureRequiredMaterials(platform) {
  return platform.materials.filter((item) => item.required).every((item) => item.uploaded);
}

export function submitPlatformReview(platformCode) {
  const platform = store.merchantOnboarding.platforms.find((item) => item.platform === platformCode);
  if (!platform) {
    throw new Error("平台不存在");
  }
  if (!store.merchantOnboarding.businessName || !store.merchantOnboarding.unifiedSocialCreditCode) {
    throw new Error("请先填写企业名称和统一社会信用代码");
  }
  if (!ensureRequiredMaterials(platform)) {
    throw new Error("请先上传该平台必填资料");
  }

  if (!store.merchantOnboarding.merchantCode) {
    store.merchantOnboarding.merchantCode = buildCode("MCH");
  }
  platform.applicationNo = platform.applicationNo || buildCode(`APP_${platform.platform.toUpperCase()}_`);
  platform.status = "reviewing";
  platform.reviewDate = platform.reviewDate || buildReviewDate(5);
  platform.canAuthorize = false;
  platform.authorizationCode = "";

  return {
    merchantCode: store.merchantOnboarding.merchantCode,
    applicationNo: platform.applicationNo,
    platform: platform.platform,
    platformName: platform.platformName,
    status: platform.status,
    canAuthorize: platform.canAuthorize,
    reviewDate: platform.reviewDate,
    message: "平台审核中，审核通过后才能获取授权 code"
  };
}

export function approvePlatformReview(platformCode) {
  const platform = store.merchantOnboarding.platforms.find((item) => item.platform === platformCode);
  if (!platform) {
    throw new Error("平台不存在");
  }
  if (!platform.applicationNo) {
    throw new Error("请先提交平台审核");
  }

  platform.status = "approved";
  platform.canAuthorize = true;
  return {
    merchantCode: store.merchantOnboarding.merchantCode,
    applicationNo: platform.applicationNo,
    platform: platform.platform,
    platformName: platform.platformName,
    status: platform.status,
    canAuthorize: platform.canAuthorize,
    reviewDate: platform.reviewDate,
    message: "平台审核已通过，可以获取授权 code"
  };
}

export function getAuthorizationCode(platformCode) {
  const platform = store.merchantOnboarding.platforms.find((item) => item.platform === platformCode);
  if (!platform) {
    throw new Error("平台不存在");
  }
  if (!platform.canAuthorize) {
    return {
      merchantCode: store.merchantOnboarding.merchantCode,
      applicationNo: platform.applicationNo,
      platform: platform.platform,
      platformName: platform.platformName,
      status: platform.status,
      canAuthorize: false,
      reviewDate: platform.reviewDate,
      authorizationCode: "",
      message: "平台审核中，审核通过后才能获取授权 code"
    };
  }

  platform.authorizationCode = platform.authorizationCode || buildCode(`CODE_${platform.platform.toUpperCase()}_`);
  return {
    merchantCode: store.merchantOnboarding.merchantCode,
    applicationNo: platform.applicationNo,
    platform: platform.platform,
    platformName: platform.platformName,
    status: platform.status,
    canAuthorize: true,
    reviewDate: platform.reviewDate,
    authorizationCode: platform.authorizationCode,
    message: "已生成本地模拟授权 code。真实 code 需由官方平台 OAuth 回调返回。"
  };
}

export function markMaterialUploaded(payload) {
  const platformCode = String(payload.platform || "").trim();
  const materialKey = String(payload.materialKey || "").trim();
  const fileName = String(payload.fileName || "").trim();
  const platform = store.merchantOnboarding.platforms.find((item) => item.platform === platformCode);
  if (!platform) {
    throw new Error("平台不存在");
  }

  const material = platform.materials.find((item) => item.key === materialKey);
  if (!material) {
    throw new Error("材料项不存在");
  }

  material.uploaded = Boolean(fileName);
  material.fileName = fileName;
  platform.status = platform.materials.filter((item) => item.required).every((item) => item.uploaded) ? "ready" : "pending";
  return platform;
}
