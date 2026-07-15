import { createReadStream, existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { listAccounts, connectAccount, toggleAccount } from "./modules/accounts.js";
import { getDashboard } from "./modules/dashboard.js";
import { importContent, listContents, searchLatestContents } from "./modules/content.js";
import { adoptSuggestion, buildAutoReplySuggestion, findConversation, getPlatformMessagingStatus, listConversations, receivePlatformMessage, sendPlatformReply, sendReply, updateCustomerProfile } from "./modules/messages.js";
import { createVideoDraft, listGeneratedVideos, renderVideoWithVoice } from "./modules/video.js";
import { getLiveDashboard } from "./modules/live.js";
import { getSalesDashboard } from "./modules/sales.js";
import { getSettings, saveCustomerAiSettings, saveKnowledgeBase, saveTextProviderSettings, saveVideoProviderSettings, saveVoiceProviderSettings } from "./modules/settings.js";
import { listProducts, getProductDetail } from "./modules/products.js";
import { listCreators, getCreatorDetail, startCooperation } from "./modules/creators.js";
import { getOperationsDashboard } from "./modules/analytics.js";
import { getContentInsights, createPublishPlan, triggerPublishPlan } from "./modules/publishing.js";
import { getOrderInventoryDashboard, getOrderDetail, markOrderShipped } from "./modules/orders.js";
import { getFinanceDashboard } from "./modules/finance.js";
import { addTeamMember, getTeamDashboard, updateMemberRole } from "./modules/team.js";
import {
  buildDouyinAuthorizeUrl,
  completeDouyinOAuthCallback,
  disconnectDouyinOAuth,
  getDouyinOAuthStatus,
  refreshDouyinAccessToken,
  saveDouyinOAuthConfig,
  syncDouyinAccount
} from "./modules/douyin.js";
import { analyzeUsageScenarios } from "./services/scenario-research.js";
import {
  getMerchantOnboarding,
  getSession,
  getUsers,
  approvePlatformReview,
  assertActiveSession,
  consumeQuota,
  getAuthorizationCode,
  login,
  logout,
  markMaterialUploaded,
  saveMerchantProfile,
  submitPlatformReview,
  updateUserAccess
} from "./modules/onboarding.js";

const port = Number(process.env.PORT || 3201);
const projectDir = fileURLToPath(new URL("..", import.meta.url));
const publicDir = fileURLToPath(new URL("../public", import.meta.url));

function loadLocalEnv() {
  const envPath = join(projectDir, ".env");
  if (!existsSync(envPath)) return;
  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return;
    const index = trimmed.indexOf("=");
    if (index === -1) return;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadLocalEnv();

function sendJson(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, status, html) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  res.end(html);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const body = await readBody(req);
  return body.trim() ? JSON.parse(body) : {};
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = join(publicDir, pathname);
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mp4": "video/mp4",
    ".wav": "audio/wav"
  };

  const stream = createReadStream(filePath);
  stream.on("open", () => {
    res.writeHead(200, { "content-type": contentTypes[extname(filePath)] || "application/octet-stream" });
    stream.pipe(res);
  });
  stream.on("error", () => sendJson(res, 404, { error: "not_found" }));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const publicApiPaths = new Set(["/api/session", "/api/session/login", "/api/session/logout", "/api/platform-messaging/inbound"]);
    if (url.pathname.startsWith("/api/") && !publicApiPaths.has(url.pathname)) {
      assertActiveSession();
    }

    if (req.method === "GET" && url.pathname === "/api/dashboard") {
      sendJson(res, 200, getDashboard());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/session") {
      sendJson(res, 200, getSession());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/session/login") {
      sendJson(res, 200, { item: login(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/session/logout") {
      sendJson(res, 200, { item: logout() });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/users") {
      sendJson(res, 200, { items: getUsers() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/users/access") {
      sendJson(res, 200, { item: updateUserAccess(await readJson(req)) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/contents") {
      sendJson(res, 200, { items: listContents(Object.fromEntries(url.searchParams)) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/contents/latest") {
      consumeQuota("contentSearches");
      sendJson(res, 200, await searchLatestContents(Object.fromEntries(url.searchParams)));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/contents") {
      sendJson(res, 201, { item: importContent(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/scenarios/analyze") {
      sendJson(res, 200, await analyzeUsageScenarios(await readJson(req)));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/videos") {
      sendJson(res, 200, { items: listGeneratedVideos() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/videos") {
      consumeQuota("videoDrafts");
      sendJson(res, 201, { item: await createVideoDraft(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/videos/render") {
      consumeQuota("videoRenders");
      sendJson(res, 200, { item: await renderVideoWithVoice(await readJson(req)) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/conversations") {
      sendJson(res, 200, { items: listConversations() });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/platform-messaging/status") {
      sendJson(res, 200, getPlatformMessagingStatus());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/platform-messaging/inbound") {
      sendJson(res, 200, { item: receivePlatformMessage(await readJson(req)) });
      return;
    }
    if (req.method === "GET" && url.pathname.startsWith("/api/conversations/")) {
      const id = url.pathname.split("/").pop();
      const item = findConversation(id);
      sendJson(res, item ? 200 : 404, item ? { item } : { error: "not_found" });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/conversations\/[^/]+\/reply$/)) {
      const id = url.pathname.split("/")[3];
      sendJson(res, 200, { item: sendReply(id, (await readJson(req)).text) });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/conversations\/[^/]+\/platform-reply$/)) {
      const id = url.pathname.split("/")[3];
      sendJson(res, 200, { item: sendPlatformReply(id, await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/conversations\/[^/]+\/adopt-suggestion$/)) {
      const id = url.pathname.split("/")[3];
      sendJson(res, 200, { item: adoptSuggestion(id) });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/conversations\/[^/]+\/auto-suggestion$/)) {
      const id = url.pathname.split("/")[3];
      sendJson(res, 200, { item: buildAutoReplySuggestion(id) });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/conversations\/[^/]+\/profile$/)) {
      const id = url.pathname.split("/")[3];
      sendJson(res, 200, { item: updateCustomerProfile(id, await readJson(req)) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/accounts") {
      sendJson(res, 200, { items: listAccounts() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/accounts") {
      sendJson(res, 201, { item: connectAccount(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/accounts\/[^/]+\/toggle$/)) {
      const id = url.pathname.split("/")[3];
      sendJson(res, 200, { item: toggleAccount(id) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/douyin/oauth/status") {
      sendJson(res, 200, getDouyinOAuthStatus());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/douyin/oauth/config") {
      sendJson(res, 200, { item: await saveDouyinOAuthConfig(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/douyin/oauth/authorize-url") {
      sendJson(res, 200, { item: await buildDouyinAuthorizeUrl() });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/douyin/oauth/callback") {
      try {
        const item = await completeDouyinOAuthCallback(Object.fromEntries(url.searchParams));
        sendHtml(res, 200, `<!doctype html><meta charset="utf-8"><title>抖音授权成功</title><body style="font-family: sans-serif; padding: 32px;"><h2>抖音授权成功</h2><p>账号：${item.account.nickname || item.openIdMasked || "已授权"}</p><p>可以关闭此窗口并回到系统配置页。</p><script>try{window.opener&&window.opener.postMessage({type:"douyin-oauth-success"},"*")}catch(e){}</script></body>`);
      } catch (error) {
        sendHtml(res, 400, `<!doctype html><meta charset="utf-8"><title>抖音授权失败</title><body style="font-family: sans-serif; padding: 32px;"><h2>抖音授权失败</h2><p>${String(error instanceof Error ? error.message : "授权失败").replace(/[<>&"]/g, "")}</p><script>try{window.opener&&window.opener.postMessage({type:"douyin-oauth-error"},"*")}catch(e){}</script></body>`);
      }
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/douyin/oauth/refresh") {
      sendJson(res, 200, { item: await refreshDouyinAccessToken() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/douyin/oauth/sync") {
      sendJson(res, 200, { item: await syncDouyinAccount() });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/douyin/oauth/disconnect") {
      sendJson(res, 200, { item: await disconnectDouyinOAuth(await readJson(req)) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/live") {
      sendJson(res, 200, getLiveDashboard());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/sales") {
      sendJson(res, 200, getSalesDashboard());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/products") {
      sendJson(res, 200, listProducts(Object.fromEntries(url.searchParams)));
      return;
    }
    if (req.method === "GET" && url.pathname.match(/^\/api\/products\/[^/]+$/)) {
      sendJson(res, 200, { item: getProductDetail(url.pathname.split("/").pop()) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/creators") {
      sendJson(res, 200, listCreators(Object.fromEntries(url.searchParams)));
      return;
    }
    if (req.method === "GET" && url.pathname.match(/^\/api\/creators\/[^/]+$/)) {
      sendJson(res, 200, { item: getCreatorDetail(url.pathname.split("/").pop()) });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/creators\/[^/]+\/cooperation$/)) {
      sendJson(res, 200, { item: startCooperation(url.pathname.split("/")[3]) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/operations") {
      sendJson(res, 200, getOperationsDashboard());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/publishing/insights") {
      sendJson(res, 200, getContentInsights());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/publishing/plans") {
      sendJson(res, 201, { item: createPublishPlan(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/publishing\/plans\/[^/]+\/publish$/)) {
      sendJson(res, 200, { item: triggerPublishPlan(url.pathname.split("/")[4]) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/orders") {
      sendJson(res, 200, getOrderInventoryDashboard());
      return;
    }
    if (req.method === "GET" && url.pathname.match(/^\/api\/orders\/[^/]+$/)) {
      sendJson(res, 200, { item: getOrderDetail(url.pathname.split("/").pop()) });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/orders\/[^/]+\/ship$/)) {
      sendJson(res, 200, { item: markOrderShipped(url.pathname.split("/")[3]) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/finance") {
      sendJson(res, 200, getFinanceDashboard());
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/team") {
      sendJson(res, 200, getTeamDashboard());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/team/members") {
      sendJson(res, 201, { item: addTeamMember(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname.match(/^\/api\/team\/members\/[^/]+\/role$/)) {
      const payload = await readJson(req);
      sendJson(res, 200, { item: updateMemberRole(url.pathname.split("/")[4], String(payload.roleId || "")) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/settings") {
      sendJson(res, 200, getSettings());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/settings/knowledge-base") {
      sendJson(res, 200, { item: saveKnowledgeBase(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/settings/customer-ai") {
      sendJson(res, 200, { item: saveCustomerAiSettings(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/settings/video-provider") {
      sendJson(res, 200, { item: saveVideoProviderSettings(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/settings/text-provider") {
      sendJson(res, 200, { item: saveTextProviderSettings(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/settings/voice-provider") {
      sendJson(res, 200, { item: saveVoiceProviderSettings(await readJson(req)) });
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/onboarding/merchant") {
      sendJson(res, 200, getMerchantOnboarding());
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/onboarding/merchant/profile") {
      sendJson(res, 200, { item: saveMerchantProfile(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/onboarding/merchant/material") {
      sendJson(res, 200, { item: markMaterialUploaded(await readJson(req)) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/onboarding/merchant/submit-review") {
      const payload = await readJson(req);
      sendJson(res, 200, { item: submitPlatformReview(String(payload.platform || "")) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/onboarding/merchant/approve-review") {
      const payload = await readJson(req);
      sendJson(res, 200, { item: approvePlatformReview(String(payload.platform || "")) });
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/onboarding/merchant/authorization-code") {
      const payload = await readJson(req);
      sendJson(res, 200, { item: getAuthorizationCode(String(payload.platform || "")) });
      return;
    }

    serveStatic(req, res);
  } catch (error) {
    sendJson(res, 400, { error: error instanceof Error ? error.message : "请求处理失败" });
  }
});

server.listen(port, () => {
  console.log(`AI Employee prototype app running at http://127.0.0.1:${port}`);
});
