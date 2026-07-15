import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "../db/index.js";

const oauthFile = fileURLToPath(new URL("../../.local/douyin-oauth.json", import.meta.url));
const authorizeEndpoint = "https://open.douyin.com/platform/oauth/connect";
const tokenEndpoint = "https://open.douyin.com/oauth/access_token/";
const refreshEndpoint = "https://open.douyin.com/oauth/refresh_token/";
const userInfoEndpoint = "https://open.douyin.com/oauth/userinfo/";

function loadPersistedOAuth() {
  if (!existsSync(oauthFile)) return;
  try {
    const payload = JSON.parse(readFileSync(oauthFile, "utf8"));
    db.douyinOAuth = {
      ...db.douyinOAuth,
      ...payload,
      account: {
        ...db.douyinOAuth.account,
        ...(payload.account || {})
      }
    };
    syncDouyinAccountFromStore();
  } catch {
    db.douyinOAuth.lastError = "本地抖音授权文件读取失败，请重新保存配置。";
  }
}

loadPersistedOAuth();

async function persistOAuth() {
  await mkdir(dirname(oauthFile), { recursive: true });
  await writeFile(oauthFile, JSON.stringify(db.douyinOAuth, null, 2), "utf8");
}

function env(name) {
  return String(process.env[name] || "").trim();
}

function defaultRedirectUri() {
  const baseUrl = env("PUBLIC_BASE_URL") || `http://127.0.0.1:${env("PORT") || "3201"}`;
  return `${baseUrl.replace(/\/$/, "")}/api/douyin/oauth/callback`;
}

function effectiveConfig() {
  const current = db.douyinOAuth;
  return {
    clientKey: current.clientKey || env("DOUYIN_CLIENT_KEY") || env("DOUYIN_APP_KEY"),
    clientSecret: current.clientSecret || env("DOUYIN_CLIENT_SECRET") || env("DOUYIN_APP_SECRET"),
    redirectUri: current.redirectUri || env("DOUYIN_REDIRECT_URI") || defaultRedirectUri(),
    scope: current.scope || env("DOUYIN_SCOPE") || "user_info",
    optionalScope: current.optionalScope || env("DOUYIN_OPTIONAL_SCOPE")
  };
}

function maskSecret(value, visible = 4) {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= visible) return "*".repeat(text.length);
  return `${"*".repeat(Math.max(4, text.length - visible))}${text.slice(-visible)}`;
}

function expiryFromSeconds(seconds) {
  const value = Number(seconds || 0);
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Date(Date.now() + value * 1000).toISOString();
}

function isFuture(value) {
  const time = Date.parse(value || "");
  return Number.isFinite(time) && time > Date.now();
}

function hasToken() {
  return Boolean(db.douyinOAuth.accessToken && db.douyinOAuth.openId);
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ""));
  const right = Buffer.from(String(b || ""));
  return left.length === right.length && timingSafeEqual(left, right);
}

function assertConfigured() {
  const config = effectiveConfig();
  if (!config.clientKey || !config.clientSecret) {
    throw new Error("请先配置抖音 ClientKey 和 ClientSecret");
  }
  if (!config.redirectUri) {
    throw new Error("请先配置抖音授权回调地址");
  }
  return config;
}

function assertValidState(state) {
  const current = db.douyinOAuth;
  if (!current.pendingState || !safeEqual(current.pendingState, state)) {
    throw new Error("抖音授权 state 校验失败，请重新发起授权");
  }
  if (!isFuture(current.pendingStateExpiresAt)) {
    throw new Error("抖音授权 state 已过期，请重新发起授权");
  }
}

function normalizeProviderData(payload) {
  const topErrorCode = Number(payload?.err_no || 0);
  if (topErrorCode) {
    throw new Error(payload.err_msg || payload.message || `抖音接口返回错误：${topErrorCode}`);
  }
  const data = payload?.data || payload || {};
  const errorCode = Number(data.error_code || data.err_no || 0);
  if (errorCode) {
    throw new Error(data.description || data.desc || payload?.message || `抖音接口返回错误：${errorCode}`);
  }
  return data;
}

async function requestForm(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
  const payload = await response.json().catch(async () => ({ message: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(payload.message || `抖音接口请求失败：${response.status}`);
  }
  return normalizeProviderData(payload);
}

async function fetchUserInfo(accessToken) {
  const response = await fetch(userInfoEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      open_id: db.douyinOAuth.openId,
      access_token: accessToken
    })
  });
  const payload = await response.json().catch(async () => ({ message: await response.text().catch(() => "") }));
  if (!response.ok) {
    throw new Error(payload.message || `抖音用户信息请求失败：${response.status}`);
  }
  return normalizeProviderData(payload);
}

function syncDouyinAccountFromStore() {
  const account = db.accounts.find((item) => item.platform === "douyin");
  if (!account) return;
  const oauth = db.douyinOAuth;
  if (hasToken()) {
    account.status = "connected";
    account.accountName = oauth.account.nickname || `open_id:${maskSecret(oauth.openId, 6)}`;
    account.douyinOpenId = oauth.openId;
    account.avatar = oauth.account.avatar || "";
    return;
  }
  account.status = "disconnected";
  account.accountName = "未授权";
  account.fans = 0;
  account.videos = 0;
}

function saveTokenData(data) {
  const current = db.douyinOAuth;
  current.accessToken = String(data.access_token || "").trim();
  current.refreshToken = String(data.refresh_token || current.refreshToken || "").trim();
  current.openId = String(data.open_id || current.openId || "").trim();
  current.scopeGranted = String(data.scope || current.scopeGranted || "").trim();
  current.expiresAt = expiryFromSeconds(data.expires_in);
  current.refreshExpiresAt = expiryFromSeconds(data.refresh_expires_in);
  current.authorizedAt = current.authorizedAt || new Date().toISOString();
  current.updatedAt = new Date().toISOString();
  current.pendingState = "";
  current.pendingStateExpiresAt = "";
  current.lastError = "";
}

function clearTokenData() {
  Object.assign(db.douyinOAuth, {
    pendingState: "",
    pendingStateExpiresAt: "",
    accessToken: "",
    refreshToken: "",
    openId: "",
    scopeGranted: "",
    expiresAt: "",
    refreshExpiresAt: "",
    authorizedAt: "",
    updatedAt: new Date().toISOString(),
    lastError: "",
    account: { nickname: "", avatar: "", unionId: "" }
  });
  syncDouyinAccountFromStore();
}

export function getDouyinOAuthStatus() {
  const config = effectiveConfig();
  const oauth = db.douyinOAuth;
  const authorized = hasToken();
  return {
    configured: Boolean(config.clientKey && config.clientSecret),
    authorized,
    accessTokenValid: authorized && isFuture(oauth.expiresAt),
    refreshTokenValid: Boolean(oauth.refreshToken && isFuture(oauth.refreshExpiresAt)),
    clientKey: config.clientKey,
    clientKeySaved: Boolean(db.douyinOAuth.clientKey || env("DOUYIN_CLIENT_KEY") || env("DOUYIN_APP_KEY")),
    clientKeyMasked: maskSecret(config.clientKey),
    clientSecretSaved: Boolean(db.douyinOAuth.clientSecret || env("DOUYIN_CLIENT_SECRET") || env("DOUYIN_APP_SECRET")),
    redirectUri: config.redirectUri,
    scope: config.scope,
    optionalScope: config.optionalScope,
    scopeGranted: oauth.scopeGranted,
    openIdMasked: maskSecret(oauth.openId, 8),
    expiresAt: oauth.expiresAt,
    refreshExpiresAt: oauth.refreshExpiresAt,
    account: {
      nickname: oauth.account.nickname,
      avatar: oauth.account.avatar,
      unionIdMasked: maskSecret(oauth.account.unionId, 8)
    },
    lastError: oauth.lastError,
    callbackPath: "/api/douyin/oauth/callback"
  };
}

export async function saveDouyinOAuthConfig(payload) {
  const current = db.douyinOAuth;
  const nextClientKey = String(payload.clientKey || "").trim();
  const nextClientSecret = String(payload.clientSecret || "").trim();
  const nextRedirectUri = String(payload.redirectUri || "").trim();
  current.clientKey = nextClientKey || current.clientKey;
  current.clientSecret = nextClientSecret || current.clientSecret;
  current.redirectUri = nextRedirectUri || current.redirectUri || defaultRedirectUri();
  current.scope = String(payload.scope || current.scope || "user_info").trim();
  current.optionalScope = String(payload.optionalScope || "").trim();
  current.updatedAt = new Date().toISOString();

  if (payload.clearSecrets) {
    current.clientSecret = "";
    clearTokenData();
  }
  await persistOAuth();
  return getDouyinOAuthStatus();
}

export async function buildDouyinAuthorizeUrl() {
  const config = assertConfigured();
  const state = randomBytes(18).toString("hex");
  db.douyinOAuth.pendingState = state;
  db.douyinOAuth.pendingStateExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  db.douyinOAuth.lastError = "";
  await persistOAuth();

  const url = new URL(authorizeEndpoint);
  url.searchParams.set("client_key", config.clientKey);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", config.scope || "user_info");
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("state", state);
  if (config.optionalScope) {
    url.searchParams.set("optionalScope", config.optionalScope);
  }
  return {
    authorizeUrl: url.toString(),
    redirectUri: config.redirectUri,
    scope: config.scope,
    stateExpiresAt: db.douyinOAuth.pendingStateExpiresAt
  };
}

export async function completeDouyinOAuthCallback(query) {
  const code = String(query.code || "").trim();
  const state = String(query.state || "").trim();
  if (!code) {
    throw new Error(String(query.error_description || query.error || "抖音回调未返回 code"));
  }
  assertValidState(state);
  const config = assertConfigured();
  const data = await requestForm(tokenEndpoint, {
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri
  });
  saveTokenData(data);
  await syncDouyinAccount();
  await persistOAuth();
  return getDouyinOAuthStatus();
}

async function getDouyinClientToken() {
  const config = assertConfigured();
  const data = await requestForm("https://open.douyin.com/oauth/client_token/", {
    client_key: config.clientKey,
    client_secret: config.clientSecret,
    grant_type: "client_credential"
  });
  if (!data.access_token) {
    throw new Error(data.description || "抖音 client_token 获取失败");
  }
  return data.access_token;
}

function buildDeviceId() {
  return `${Date.now()}${Math.floor(Math.random() * 1000000).toString().padStart(6, "0")}`;
}

function normalizeSearchItems(payload, platform = "douyin") {
  const body = payload?.data?.data || payload?.data || payload || {};
  const list = body.video_list || [];
  return list.map((item, index) => ({
    id: `douyin_real_${item.item_id || Date.now()}_${index}`,
    platform,
    title: item.title || "抖音内容",
    author: item.nickname || "抖音创作者",
    views: Number(item.statistics?.digg_count || 0),
    likes: Number(item.statistics?.digg_count || 0),
    duration: "真实接口",
    coverUrl: item.cover || "",
    contentUrl: item.link || "",
    tags: ["抖音真实搜索"],
    status: "official",
    copy: item.title || "抖音真实搜索内容",
    publishedAt: item.create_time ? new Date(Number(item.create_time) * 1000).toISOString() : "",
    raw: item
  }));
}

export async function searchDouyinVideos(query = {}) {
  const keyword = String(query.keyword || "").trim();
  if (!keyword) {
    throw new Error("抖音真实搜索需要输入关键词");
  }
  const clientToken = await getDouyinClientToken();
  const params = new URLSearchParams({
    keyword,
    count: String(Math.min(Math.max(Number(query.count || 10), 1), 10)),
    cursor: String(query.cursor || 0),
    device_id: buildDeviceId()
  });
  if (db.douyinOAuth.openId) {
    params.set("open_id", db.douyinOAuth.openId);
  }
  const response = await fetch(`https://open.douyin.com/dy_open_api/v2/search/video/?${params.toString()}`, {
    headers: { "access-token": clientToken }
  });
  const payload = await response.json().catch(async () => ({ err_msg: await response.text().catch(() => "") }));
  if (!response.ok || Number(payload.err_no || 0)) {
    throw new Error(payload.err_msg || `抖音关键词搜索失败：${response.status}`);
  }
  const body = payload?.data?.data || {};
  return {
    supported: true,
    official: true,
    keyword,
    items: normalizeSearchItems(payload),
    hasMore: Boolean(body.has_more),
    nextCursor: body.cursor !== undefined ? String(body.cursor) : "",
    searchId: body.search_id || ""
  };
}

export async function refreshDouyinAccessToken() {
  const config = assertConfigured();
  if (!db.douyinOAuth.refreshToken) {
    throw new Error("抖音 refresh_token 不存在，请重新授权");
  }
  const data = await requestForm(refreshEndpoint, {
    client_key: config.clientKey,
    grant_type: "refresh_token",
    refresh_token: db.douyinOAuth.refreshToken
  });
  saveTokenData(data);
  await persistOAuth();
  return getDouyinOAuthStatus();
}

export async function syncDouyinAccount() {
  if (!db.douyinOAuth.accessToken) {
    throw new Error("抖音尚未授权，无法同步账号信息");
  }
  const profile = await fetchUserInfo(db.douyinOAuth.accessToken);
  db.douyinOAuth.account = {
    nickname: String(profile.nickname || db.douyinOAuth.account.nickname || "").trim(),
    avatar: String(profile.avatar || db.douyinOAuth.account.avatar || "").trim(),
    unionId: String(profile.union_id || db.douyinOAuth.account.unionId || "").trim()
  };
  db.douyinOAuth.openId = String(profile.open_id || db.douyinOAuth.openId || "").trim();
  db.douyinOAuth.updatedAt = new Date().toISOString();
  db.douyinOAuth.lastError = "";
  syncDouyinAccountFromStore();
  await persistOAuth();
  return getDouyinOAuthStatus();
}

export async function disconnectDouyinOAuth(payload = {}) {
  if (payload.clearConfig) {
    db.douyinOAuth.clientKey = "";
    db.douyinOAuth.clientSecret = "";
    db.douyinOAuth.redirectUri = "";
  }
  clearTokenData();
  await persistOAuth();
  return getDouyinOAuthStatus();
}

