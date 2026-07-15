const pageTitles = {
  dashboard: "数据仪表板",
  content: "内容搜索",
  aivideo: "AI视频生成",
  products: "商品选品",
  creators: "达人合作",
  publishing: "内容运营",
  messages: "客户消息",
  live: "直播数据",
  sales: "销售分析",
  operations: "经营分析",
  orders: "订单库存",
  finance: "财务结算",
  team: "团队权限",
  merchant: "商户入驻",
  settings: "账号设置"
};

const platformIcons = {
  douyin: ["📱", "#000"],
  kuaishou: ["⚡", "#ff4500"],
  wechat_channel: ["💬", "#07c160"],
  xiaohongshu: ["📕", "#ff2442"]
};

let currentCharts = [];
let activeConversationId = null;
let session = { userType: null };
let currentVideoDraft = null;
let activeVideoTab = "script";
let scenarioAnalysis = null;
let selectedUsageScenarios = [];
let videoProviderOptionsCache = [];
let latestContentItems = [];
let activeSettingsData = null;
const customVideoModelValue = "__custom_video_model__";
const scriptFieldLabels = {
  hook: "开场钩子",
  sellingPoint: "核心卖点",
  scene: "使用场景",
  callToAction: "行动引导"
};

function $(selector) {
  return document.querySelector(selector);
}

function setStatus(message) {
  $("#status").textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `请求失败: ${response.status}`);
  }
  return payload;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("zh-CN");
}

function formatMoney(value) {
  return `¥${formatNumber(value)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function platformName(code) {
  return { douyin: "抖音", kuaishou: "快手", wechat_channel: "视频号", xiaohongshu: "小红书" }[code] || code;
}

function userTypeLabel(type) {
  return { personal: "个人用户", merchant: "商户用户" }[type] || "未登录";
}

function roleLabel(role) {
  return { admin: "管理员", merchant: "商户", user: "普通用户" }[role] || "普通用户";
}

function quotaItems(quota = {}) {
  return Object.values(quota).sort((a, b) => String(a.key).localeCompare(String(b.key)));
}

function renderQuotaSummary(targetSession = session) {
  const items = quotaItems(targetSession.quota).slice(0, 3);
  if (!items.length) return "";
  return `
    <div class="quota-strip">
      <span>到期 ${escapeHtml(targetSession.expiresAt || "未设置")}</span>
      ${items.map((item) => `<span>${escapeHtml(item.label)} ${formatNumber(item.remaining)}/${formatNumber(item.limit)}</span>`).join("")}
    </div>
  `;
}

function renderQuotaPills(targetSession = session) {
  return quotaItems(targetSession.quota).slice(0, 3)
    .map((item) => `<span>${escapeHtml(item.label)} ${formatNumber(item.remaining)}/${formatNumber(item.limit)}</span>`)
    .join("");
}

function updateHeaderSession() {
  const loggedIn = Boolean(session.userType);
  $("#userTypeBadge").textContent = loggedIn
    ? `${session.displayName || userTypeLabel(session.userType)} · ${roleLabel(session.role)}`
    : "未登录";
  const quotaSummary = $("#quotaSummary");
  if (!quotaSummary) return;
  quotaSummary.classList.toggle("hidden", !loggedIn);
  quotaSummary.innerHTML = loggedIn ? `<span>到期 ${escapeHtml(session.expiresAt || "未设置")}</span>${renderQuotaPills(session)}` : "";
}

function renderQuotaMeter(item) {
  const used = Number(item.used || 0);
  const limit = Math.max(0, Number(item.limit || 0));
  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return `
    <div class="quota-meter">
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <span>剩余 ${formatNumber(item.remaining)} / 总额 ${formatNumber(limit)}</span>
      </div>
      <div class="quota-bar"><i style="width:${percent}%"></i></div>
    </div>
  `;
}

function iconForPlatform(code) {
  return platformIcons[code] || ["📦", "#64748b"];
}

function destroyChart() {
  currentCharts.forEach((chart) => chart.destroy());
  currentCharts = [];
}

function openAppModal(title, body, options = {}) {
  $("#appModalTitle").textContent = title;
  $("#appModalBody").innerHTML = body;
  $("#appModalPanel").classList.toggle("modal-panel-wide", Boolean(options.wide));
  $("#appModal").classList.remove("hidden");
  $("#appModal").setAttribute("aria-hidden", "false");
}

function closeAppModal() {
  $("#appModal").classList.add("hidden");
  $("#appModal").setAttribute("aria-hidden", "true");
  $("#appModalBody").innerHTML = "";
  $("#appModalPanel").classList.remove("modal-panel-wide");
}

function renderSectionHeader(title, actions = "") {
  return `
    <div class="section-header">
      <div>
        <h2>${escapeHtml(title)}</h2>
      </div>
      <div class="section-actions">${actions}</div>
    </div>
  `;
}

function renderMiniTable(headers, rows) {
  return `
    <div class="data-table">
      <div class="data-table-head" style="grid-template-columns: repeat(${headers.length}, minmax(0, 1fr));">
        ${headers.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
      </div>
      ${rows.map((row) => `
        <div class="data-table-row" style="grid-template-columns: repeat(${headers.length}, minmax(0, 1fr));">
          ${row.map((item) => `<span>${item}</span>`).join("")}
        </div>
      `).join("")}
    </div>
  `;
}

function renderStatCards(items) {
  return `
    <div class="stats-grid">
      ${items.map((item) => `
        <div class="stat-card">
          <div class="stat-header">
            <span class="stat-title">${item.title}</span>
            <div class="stat-icon" style="background:${item.bg}; color:${item.color};">${item.icon}</div>
          </div>
          <div class="stat-value">${item.value}</div>
          <div class="stat-change">${item.change}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderPlatformItem(item) {
  const [icon, color] = iconForPlatform(item.platform);
  return `
    <div class="platform-item">
      <div class="platform-info">
        <div class="platform-logo" style="background:${color};">${icon}</div>
        <div>
          <div class="platform-name">${item.platformName || platformName(item.platform)}</div>
          <div class="platform-status">${item.status === "connected" ? "已连接" : "未连接"}</div>
        </div>
      </div>
      <div class="platform-data">
        <div class="platform-value">${formatNumber(item.fans)}</div>
        <div class="platform-label">粉丝</div>
      </div>
    </div>
  `;
}

async function renderDashboard() {
  const data = await api("/api/dashboard");
  $("#mainContent").innerHTML = `
    ${session.userType === "personal" ? '<div class="notice-card">当前为个人用户模式：可使用本地内容搜索、手动导入和 AI 视频生成；真实平台自动搜索和账号授权需要商户主体资质。</div>' : ""}
    ${renderStatCards([
      { title: "总浏览量", value: formatNumber(data.stats.totalViews), change: "+12.5% 较上周", icon: "👁️", bg: "#e3f2fd", color: "#2196f3" },
      { title: "总点赞数", value: formatNumber(data.stats.totalLikes), change: "+8.3% 较上周", icon: "❤️", bg: "#fce4ec", color: "#e91e63" },
      { title: "视频数量", value: formatNumber(data.stats.videoCount), change: "+25 本周新增", icon: "🎬", bg: "#f3e5f5", color: "#9c27b0" },
      { title: "粉丝总数", value: formatNumber(data.stats.totalFans), change: "+156 本周新增", icon: "👥", bg: "#e8f5e9", color: "#4caf50" }
    ])}
    <div class="chart-section">
      <div class="chart-card">
        <div class="chart-title">近7天数据趋势</div>
        <canvas id="trendChart" height="80"></canvas>
      </div>
      <div class="platform-list">
        <div class="chart-title">平台概览</div>
        ${data.platforms.map(renderPlatformItem).join("")}
      </div>
    </div>
  `;
  drawLineChart("trendChart", data.trend.map((item) => item.date), [
    { label: "浏览量", data: data.trend.map((item) => item.views), borderColor: "#3498db", tension: 0.4 },
    { label: "点赞数", data: data.trend.map((item) => item.likes), borderColor: "#e91e63", tension: 0.4 }
  ]);
}

async function renderContent() {
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("全平台内容搜索", '<button class="filter-tab" data-page="publishing" type="button">查看爆款分析</button>')}
    <div class="search-section">
      <div class="search-bar">
        <input id="contentKeyword" class="search-input" type="text" placeholder="搜索产品关键词，如：手套">
        <button id="contentSearchButton" class="btn" type="button">🔍 搜索全平台</button>
      </div>
      <div class="filter-tabs" id="platformTabs">
        <button class="filter-tab active" data-platform="all" type="button">全部平台</button>
        <button class="filter-tab" data-platform="douyin" type="button">抖音</button>
        <button class="filter-tab" data-platform="kuaishou" type="button">快手</button>
        <button class="filter-tab" data-platform="wechat_channel" type="button">视频号</button>
      </div>
    </div>
    <div id="searchModePanel" class="search-mode-panel"></div>
    <div id="videoGrid" class="video-grid"></div>
  `;
  $("#contentSearchButton").addEventListener("click", loadContentCards);
  $("#platformTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-platform]");
    if (!button) return;
    document.querySelectorAll(".filter-tab").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadContentCards().catch((error) => setStatus(error.message));
  });
  await loadContentCards();
}

async function loadContentCards() {
  const platform = document.querySelector(".filter-tab.active")?.dataset.platform || "all";
  const keyword = $("#contentKeyword").value.trim();
  const params = new URLSearchParams({ platform, keyword });
  const payload = await api(`/api/contents/latest?${params.toString()}`);
  await refreshSession({ navigate: false });
  latestContentItems = payload.items;
  $("#searchModePanel").innerHTML = payload.platforms.map((item) => `
    <div class="search-state">
      <div>
        <strong>${item.platformName}</strong>
        <span>${item.message}</span>
      </div>
      <div class="source-badge ${item.mode.replace("_", "-")}">${searchModeText(item.mode)}</div>
    </div>
  `).join("");
  $("#videoGrid").innerHTML = payload.items.map((item) => `
    <div class="video-card">
      <div class="video-thumbnail">
        📹
        <div class="video-duration">${item.duration}</div>
      </div>
      <div class="video-info">
        <div class="video-title">${item.title}</div>
        <div class="video-meta">
          <span>👁️ ${formatNumber(item.views)}</span>
          <span>❤️ ${formatNumber(item.likes)}</span>
        </div>
        <div class="video-actions">
          <button class="action-btn" data-view-content="${item.id}" type="button">查看详情</button>
          <button class="action-btn" data-copy="${encodeURIComponent(item.copy || item.title)}" type="button">提取文案</button>
        </div>
      </div>
    </div>
  `).join("") || '<div class="video-card"><div class="video-info">暂无匹配内容</div></div>';
}

function openContentDetail(id) {
  const item = latestContentItems.find((content) => content.id === id);
  if (!item) {
    setStatus("内容不存在，请重新搜索");
    return;
  }
  openAppModal("内容详情", `
    <div class="detail-layout">
      <div class="detail-preview">
        <div class="video-thumbnail modal-video-thumb">📹<div class="video-duration">${escapeHtml(item.duration)}</div></div>
      </div>
      <div class="detail-panel">
        <div class="detail-title">${escapeHtml(item.title)}</div>
        <div class="tag-row">
          <span>${escapeHtml(platformName(item.platform))}</span>
          <span>${escapeHtml(item.author)}</span>
          <span>${formatNumber(item.views)} 播放</span>
          <span>${formatNumber(item.likes)} 点赞</span>
        </div>
        <div class="copy-box">${escapeHtml(item.copy || item.title)}</div>
        <div class="modal-actions">
          <button class="filter-tab" data-download="${item.id}" type="button">生成下载任务</button>
          <button class="btn" data-copy="${encodeURIComponent(item.copy || item.title)}" type="button">带入 AI 视频生成</button>
        </div>
      </div>
    </div>
  `, { wide: true });
}

function searchModeText(mode) {
  return {
    mock: "模拟最新10条",
    reviewing: "审核中",
    official_ready: "官方接口",
    official_error: "官方接口异常"
  }[mode] || mode;
}

renderAiVideo = async function() {
  const extractedCopy = sessionStorage.getItem("extractedCopy") || "";
  const settings = await api("/api/settings");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("AI 视频生成", '<button class="filter-tab" data-open-ai-video-config type="button">配置模型</button>')}
    ${renderFlowSteps("copy")}
    <div class="workbench-grid">
      <section class="ai-section video-control-panel">
        <div class="panel-title-row">
          <div>
            <h3>内容输入</h3>
            <p>先输入产品文案，生成后在右侧编辑脚本和分镜。</p>
          </div>
        </div>
        ${renderVideoProviderSummary(settings.videoProvider)}
        <div class="form-group">
          <label class="form-label">产品文案内容</label>
          <textarea id="videoCopy" class="form-textarea tall-input" placeholder="输入产品描述、卖点、适用场景。">${escapeHtml(extractedCopy)}</textarea>
        </div>
        <div class="settings-two-col">
          <div class="form-group">
            <label class="form-label">视频风格</label>
            <select id="videoStyle" class="form-select">
              <option>专业商务风格</option>
              <option>活泼时尚风格</option>
              <option>温馨生活风格</option>
              <option>科技未来风格</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">视频时长</label>
            <select id="videoDuration" class="form-select">
              <option>15秒 - 快手/抖音短视频</option>
              <option>30秒 - 标准短视频</option>
              <option>60秒 - 详细介绍</option>
              <option>90秒 - 深度讲解</option>
            </select>
          </div>
        </div>
        <div class="scenario-toolbar">
          <button id="analyzeScenariosButton" class="filter-tab" type="button">分析使用场景</button>
          <button id="generateVideoButton" class="btn" type="button">生成脚本与分镜</button>
          <span id="scenarioModeText"></span>
        </div>
        <div id="scenarioPanel" class="scenario-panel"></div>
      </section>
      <section class="ai-section video-workspace-panel">
        <div class="panel-title-row">
          <div>
            <h3>创作工作台</h3>
            <p>脚本、分镜、配音和视频结果分区查看，避免生成后页面过长。</p>
          </div>
        </div>
        <div id="videoPreview" class="preview-box muted-preview">
          <div class="empty-workbench">
            <strong>等待生成</strong>
            <p>点击左侧“生成脚本与分镜”后，这里会进入可编辑工作台。</p>
          </div>
        </div>
      </section>
    </div>
  `;
  sessionStorage.removeItem("extractedCopy");
  currentVideoDraft = null;
  activeVideoTab = "script";
  scenarioAnalysis = null;
  selectedUsageScenarios = [];
  $("#analyzeScenariosButton").addEventListener("click", analyzeScenarios);
  $("#scenarioPanel").addEventListener("change", syncSelectedScenarios);
  $("#generateVideoButton").addEventListener("click", generateVideo);
}

function renderVideoProviderSummary(config) {
  return `
    <div class="provider-summary">
      <div>
        <strong>当前视频生成供应商：${escapeHtml(config.providerName)}</strong>
        <span>${config.configured ? "已配置密钥" : "未配置密钥，AI 镜头会回退到本地分镜视频"}</span>
      </div>
      <button class="filter-tab" data-open-ai-video-config type="button">去配置</button>
    </div>
  `;
}

function compactScenario(item) {
  return {
    title: item.title,
    visualPrompt: item.visualPrompt,
    sellingAngle: item.sellingAngle,
    materialSuggestion: item.materialSuggestion
  };
}

function syncSelectedScenarios() {
  if (!scenarioAnalysis) {
    selectedUsageScenarios = [];
    return;
  }
  const selectedIds = new Set([...document.querySelectorAll("[data-scenario-id]:checked")].map((item) => item.dataset.scenarioId));
  selectedUsageScenarios = scenarioAnalysis.scenarios.filter((item) => selectedIds.has(item.id)).map(compactScenario);
}

function renderScenarioPanel(payload) {
  const defaultSelected = new Set(payload.scenarios.slice(0, 3).map((item) => item.id));
  selectedUsageScenarios = payload.scenarios.filter((item) => defaultSelected.has(item.id)).map(compactScenario);
  return `
    <div class="scenario-list">
      ${payload.scenarios.map((item) => `
        <label class="scenario-card">
          <input data-scenario-id="${escapeHtml(item.id)}" type="checkbox" ${defaultSelected.has(item.id) ? "checked" : ""}>
          <span>
            <strong>${escapeHtml(item.title)}</strong>
            <em>${escapeHtml(item.description)}</em>
            <small>${escapeHtml(item.sellingAngle)} · 置信度 ${item.confidence}%</small>
          </span>
        </label>
      `).join("")}
    </div>
    ${payload.sources.length ? `
      <div class="scenario-sources">
        ${payload.sources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.title)}</a>`).join("")}
      </div>
    ` : ""}
  `;
}

async function analyzeScenarios() {
  const button = $("#analyzeScenariosButton");
  const keyword = $("#videoCopy").value.trim() || "专业防护手套";
  button.disabled = true;
  button.textContent = "分析中...";
  setStatus("正在分析使用场景");
  try {
    scenarioAnalysis = await api("/api/scenarios/analyze", {
      method: "POST",
      body: JSON.stringify({ keyword })
    });
    $("#scenarioModeText").textContent = scenarioAnalysis.mode === "online_enhanced" ? "公开摘要增强" : "本地规则";
    $("#scenarioPanel").innerHTML = renderScenarioPanel(scenarioAnalysis);
    setStatus(scenarioAnalysis.message);
  } finally {
    button.disabled = false;
    button.textContent = "分析使用场景";
  }
}

function renderScriptGeneratingState() {
  return `
    <div class="script-loading">
      <div class="script-loading-head">
        <span class="script-spinner"></span>
        <div>
          <strong>正在生成脚本和分镜</strong>
          <small>正在组织卖点、场景和镜头节奏</small>
        </div>
      </div>
      <div class="script-loading-grid">
        ${["开场钩子", "核心卖点", "使用场景", "行动引导"].map((label) => `
          <div class="script-loading-card">
            <span>${label}</span>
            <i></i>
            <i></i>
            <i class="short"></i>
          </div>
        `).join("")}
      </div>
      <div class="storyboard-loading">
        ${[1, 2, 3, 4].map((index) => `<span>镜头 ${index}</span>`).join("")}
      </div>
    </div>
  `;
};

generateVideo = async function() {
  const button = $("#generateVideoButton");
  const originalText = button.textContent;
  const copy = $("#videoCopy").value.trim();
  syncSelectedScenarios();
  button.disabled = true;
  button.textContent = "生成中...";
  document.querySelector(".flow-steps").outerHTML = renderFlowSteps("script");
  $("#videoPreview").innerHTML = renderScriptGeneratingState();
  setStatus("正在生成脚本和分镜");
  try {
    const result = await api("/api/videos", {
      method: "POST",
      body: JSON.stringify({
        topic: copy || "专业防护手套",
        style: $("#videoStyle").value,
        duration: $("#videoDuration").value,
        scenarios: selectedUsageScenarios
      })
    });
    await refreshSession({ navigate: false });
    activeVideoTab = "script";
    document.querySelector(".flow-steps").outerHTML = renderFlowSteps("edit");
    $("#videoPreview").classList.remove("muted-preview");
    $("#videoPreview").innerHTML = renderVideoPlan(result.item);
    setStatus("AI视频草稿已生成，可编辑脚本和分镜");
  } catch (error) {
    $("#videoPreview").innerHTML = `<div class="preview-error">${escapeHtml(error.message || "脚本生成失败")}</div>`;
    setStatus(error.message || "脚本生成失败");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

function renderVideoPlan(item) {
  currentVideoDraft = item;
  activeVideoTab = activeVideoTab || (item.renderTask ? "result" : "script");
  return `
    <div class="video-plan">
      <div class="video-plan-head">
        <div>
          <span class="eyebrow">当前草稿</span>
          <h3>${escapeHtml(item.topic || "AI 视频草稿")}</h3>
          <p>${escapeHtml(item.style || "默认风格")} · ${escapeHtml(item.duration || "未设置时长")} · ${item.storyboard?.length || 0} 个镜头</p>
        </div>
        <button class="btn" id="openRenderModalButton" type="button">生成视频与声音</button>
      </div>
      ${renderVideoPlanMeta(item)}
      ${renderVideoTabs()}
      <div class="video-tab-panel">
        ${renderActiveVideoTab(item)}
      </div>
    </div>
  `;
}

function renderVideoPlanMeta(item) {
  const source = item.planSource
    ? `${item.planSource.providerName || item.planSource.provider} · ${item.planSource.status}`
    : "本地草稿";
  return `
    <div class="video-plan-meta">
      <div><span>脚本来源</span><strong>${escapeHtml(source)}</strong></div>
      <div><span>下一步</span><strong>${escapeHtml(item.renderTask ? "查看结果" : "确认脚本分镜")}</strong></div>
      <div><span>生成状态</span><strong>${escapeHtml(item.renderTask?.status || item.status || "draft")}</strong></div>
    </div>
    ${item.planSource?.message ? `<div class="plan-source">${escapeHtml(item.planSource.message)}</div>` : ""}
  `;
}

function renderVideoTabs() {
  const tabs = [
    ["script", "脚本"],
    ["storyboard", "分镜"],
    ["voice", "配音"],
    ["result", "视频结果"]
  ];
  return `
    <div class="video-tabs">
      ${tabs.map(([key, label]) => `
        <button class="video-tab ${activeVideoTab === key ? "active" : ""}" data-video-tab="${key}" type="button">${label}</button>
      `).join("")}
    </div>
  `;
}

function renderActiveVideoTab(item) {
  if (activeVideoTab === "storyboard") return renderStoryboardTab(item);
  if (activeVideoTab === "voice") return renderVoiceTab(item);
  if (activeVideoTab === "result") return renderResultTab(item);
  return renderScriptTab(item);
}

function renderScriptTab(item) {
  const script = item.script || {};
  return `
    <div class="tab-title-row">
      <div>
        <h4>脚本总览</h4>
        <p>这里只展示关键段落，点击编辑后在弹窗里调整完整文案。</p>
      </div>
      <button class="filter-tab" data-edit-script type="button">编辑脚本</button>
    </div>
    <div class="script-summary-grid">
      ${Object.entries(scriptFieldLabels).map(([key, label]) => `
        <div class="script-summary-card">
          <span>${escapeHtml(label)}</span>
          <p>${escapeHtml(script[key] || "未生成")}</p>
        </div>
      `).join("")}
    </div>
  `;
}

function renderStoryboardTab(item) {
  const storyboard = item.storyboard || [];
  return `
    <div class="tab-title-row">
      <div>
        <h4>镜头时间线</h4>
        <p>分镜以表格方式收纳，完整画面、字幕和素材建议在编辑弹窗里维护。</p>
      </div>
      <button class="btn" id="openRenderModalButton" type="button">生成视频与声音</button>
    </div>
    <div class="storyboard-table">
      <div class="storyboard-row storyboard-row-head">
        <span>镜头</span>
        <span>时长</span>
        <span>画面</span>
        <span>字幕</span>
        <span>操作</span>
      </div>
      ${storyboard.map((shot, index) => `
        <div class="storyboard-row">
          <strong>镜头 ${escapeHtml(shot.shotNo || index + 1)}</strong>
          <span>${escapeHtml(shot.duration || 0)}秒</span>
          <span>${escapeHtml(shot.visual || shot.scene || "未填写")}</span>
          <span>${escapeHtml(shot.subtitle || "未填写")}</span>
          <button class="filter-tab" data-edit-shot="${index}" type="button">编辑</button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderVoiceTab(item) {
  const task = item.renderTask;
  return `
    <div class="tab-title-row">
      <div>
        <h4>配音生成</h4>
        <p>生成视频与声音后，这里会保留主音频和逐镜头音频试听入口。</p>
      </div>
      <button class="filter-tab" data-open-ai-video-config type="button">配置配音</button>
    </div>
    ${task?.audioUrl ? `
      <div class="voice-result-card">
        <strong>${escapeHtml(task.voiceName || "已生成配音")}</strong>
        <audio class="generated-audio" controls src="${escapeHtml(task.audioUrl)}"></audio>
        <div class="render-steps">
          ${(task.audioTracks || []).map((track) => `<a href="${escapeHtml(track.audioUrl)}" target="_blank" rel="noreferrer">镜头 ${escapeHtml(track.shotNo)}</a>`).join("")}
        </div>
      </div>
    ` : `
      <div class="empty-workbench">
        <strong>还未生成声音</strong>
        <p>确认脚本和分镜后点击“生成视频与声音”。</p>
      </div>
    `}
  `;
}

function renderResultTab(item) {
  const task = item.renderTask;
  if (!task) {
    return `
      <div class="empty-workbench">
        <strong>还没有视频结果</strong>
        <p>完成脚本和分镜确认后，点击“生成视频与声音”生成预览文件。</p>
        <button class="btn" id="openRenderModalButton" type="button">生成视频与声音</button>
      </div>
    `;
  }
  return renderTaskText(task);
}

function renderTaskText(task) {
  return `
    <div class="render-result">
      <div class="tab-title-row">
        <div>
          <h4>生成完成</h4>
          <p>${escapeHtml(task.message || "视频与声音已生成")}</p>
        </div>
        <button class="filter-tab" data-open-render-details type="button">查看详情</button>
      </div>
      ${task.videoUrl ? `<video class="generated-video" controls src="${escapeHtml(task.videoUrl)}"></video>` : ""}
      ${task.audioUrl ? `<audio class="generated-audio" controls src="${escapeHtml(task.audioUrl)}"></audio>` : ""}
      <div class="render-summary-grid">
        <div><span>视频状态</span><strong>${escapeHtml(task.videoStatus)}</strong></div>
        <div><span>声音状态</span><strong>${escapeHtml(task.voiceStatus)}</strong></div>
        <div><span>声音类型</span><strong>${escapeHtml(task.voiceName)}</strong></div>
      </div>
    </div>
  `;
}

function renderTaskDetails(task) {
  return `
    <div class="render-steps">
      ${(task.steps || []).map((step, index) => `<span>${index + 1}. ${escapeHtml(step.name)}：${escapeHtml(step.status)}</span>`).join("")}
    </div>
    ${task.aiVideo ? renderAiVideoStatus(task.aiVideo) : ""}
    ${task.voiceProvider ? `<div>配音供应商：${escapeHtml(task.voiceProvider.providerName || task.voiceProvider.provider)} · ${escapeHtml(task.voiceProvider.model || "")}</div>` : ""}
    <div>视频文件：${task.videoUrl ? `<a href="${escapeHtml(task.videoUrl)}" target="_blank" rel="noreferrer">${escapeHtml(task.videoUrl)}</a>` : escapeHtml(task.previewUrl)}</div>
    ${task.audioUrl ? `<div>声音文件：<a href="${escapeHtml(task.audioUrl)}" target="_blank" rel="noreferrer">${escapeHtml(task.audioUrl)}</a></div>` : ""}
    ${(task.audioTracks || []).length ? `<div>逐镜头声音：${task.audioTracks.map((track) => `<a href="${escapeHtml(track.audioUrl)}" target="_blank" rel="noreferrer">镜头 ${escapeHtml(track.shotNo)}</a>`).join(" / ")}</div>` : ""}
    <div class="voice-text">配音稿：${escapeHtml(task.voiceText)}</div>
    <div>${escapeHtml(task.message)}</div>
  `;
}

function refreshVideoWorkspace() {
  if (!currentVideoDraft) return;
  const preview = $("#videoPreview");
  if (preview) {
    preview.classList.remove("muted-preview");
    preview.innerHTML = renderVideoPlan(currentVideoDraft);
  }
}

function openScriptEditor() {
  if (!currentVideoDraft) {
    setStatus("请先生成脚本和分镜");
    return;
  }
  const script = currentVideoDraft.script || {};
  openAppModal("编辑脚本", `
    <div class="script-editor-grid">
      ${Object.entries(scriptFieldLabels).map(([key, label]) => `
        <div class="form-group">
          <label class="form-label">${escapeHtml(label)}</label>
          <textarea class="form-textarea compact-textarea" data-script-edit="${key}" rows="4">${escapeHtml(script[key] || "")}</textarea>
        </div>
      `).join("")}
    </div>
    <div class="modal-actions">
      <button class="filter-tab" data-close-app-modal type="button">取消</button>
      <button class="btn" data-save-script type="button">保存脚本</button>
    </div>
  `, { wide: true });
}

function saveScriptEditor() {
  if (!currentVideoDraft) return;
  const nextScript = { ...currentVideoDraft.script };
  document.querySelectorAll("[data-script-edit]").forEach((field) => {
    nextScript[field.dataset.scriptEdit] = field.value.trim();
  });
  currentVideoDraft.script = nextScript;
  closeAppModal();
  refreshVideoWorkspace();
  setStatus("脚本已更新");
}

function openShotEditor(index) {
  if (!currentVideoDraft) {
    setStatus("请先生成脚本和分镜");
    return;
  }
  const shotIndex = Number(index);
  const shot = currentVideoDraft.storyboard?.[shotIndex];
  if (!shot) {
    setStatus("镜头不存在");
    return;
  }
  openAppModal(`编辑镜头 ${shot.shotNo || shotIndex + 1}`, `
    <div class="settings-two-col">
      <div class="form-group">
        <label class="form-label">镜头主题</label>
        <input id="shotScene" class="form-input" value="${escapeHtml(shot.scene || "")}">
      </div>
      <div class="form-group">
        <label class="form-label">时长（秒）</label>
        <input id="shotDuration" class="form-input" type="number" min="1" value="${escapeHtml(shot.duration || 3)}">
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">画面描述</label>
      <textarea id="shotVisual" class="form-textarea compact-textarea" rows="4">${escapeHtml(shot.visual || "")}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">字幕/配音</label>
      <textarea id="shotSubtitle" class="form-textarea compact-textarea" rows="4">${escapeHtml(shot.subtitle || "")}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label">素材建议</label>
      <textarea id="shotMaterialHint" class="form-textarea compact-textarea" rows="3">${escapeHtml(shot.materialHint || "")}</textarea>
    </div>
    <div class="modal-actions">
      <button class="filter-tab" data-close-app-modal type="button">取消</button>
      <button class="btn" data-save-shot="${shotIndex}" type="button">保存镜头</button>
    </div>
  `, { wide: true });
}

function saveShotEditor(index) {
  if (!currentVideoDraft) return;
  const shotIndex = Number(index);
  const storyboard = (currentVideoDraft.storyboard || []).map((shot) => ({ ...shot }));
  if (!storyboard[shotIndex]) return;
  storyboard[shotIndex] = {
    ...storyboard[shotIndex],
    scene: $("#shotScene").value.trim(),
    duration: Math.max(1, Number($("#shotDuration").value || 1)),
    visual: $("#shotVisual").value.trim(),
    subtitle: $("#shotSubtitle").value.trim(),
    materialHint: $("#shotMaterialHint").value.trim()
  };
  currentVideoDraft.storyboard = storyboard;
  closeAppModal();
  refreshVideoWorkspace();
  setStatus("分镜已更新");
}

function openRenderDetails() {
  if (!currentVideoDraft?.renderTask) {
    setStatus("还没有生成结果");
    return;
  }
  openAppModal("生成详情", renderTaskDetails(currentVideoDraft.renderTask), { wide: true });
}

function renderAiVideoStatus(aiVideo) {
  const clips = aiVideo.clips || [];
  return `
    <div class="ai-video-status">
      <strong>AI 镜头视频：${escapeHtml(aiVideo.status)}</strong>
      <p>${escapeHtml(aiVideo.message)}</p>
      ${clips.length ? `
        <div class="ai-clip-list">
          ${clips.map((clip) => `
            <div>
              镜头 ${clip.shotNo}：${escapeHtml(clip.status)}
              ${clip.clipUrl ? `<a href="${escapeHtml(clip.clipUrl)}" target="_blank" rel="noreferrer">查看片段</a>` : ""}
              ${clip.message ? `<span>${escapeHtml(clip.message)}</span>` : ""}
            </div>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function collectEditedVideoPlan() {
  if (!currentVideoDraft) {
    throw new Error("请先生成脚本和分镜");
  }
  return {
    id: currentVideoDraft.id,
    script: { ...currentVideoDraft.script },
    storyboard: (currentVideoDraft.storyboard || []).map((shot) => ({ ...shot }))
  };
}

function openRenderModal() {
  collectEditedVideoPlan();
  $("#renderModal").classList.remove("hidden");
  $("#renderModal").setAttribute("aria-hidden", "false");
}

function closeRenderModal() {
  $("#renderModal").classList.add("hidden");
  $("#renderModal").setAttribute("aria-hidden", "true");
}

async function confirmRenderVideo() {
  const plan = collectEditedVideoPlan();
  const button = $("#confirmRenderButton");
  button.disabled = true;
  button.textContent = "生成中...";
  setStatus("正在生成视频与声音，请稍等");
  try {
    const result = await api("/api/videos/render", {
      method: "POST",
      body: JSON.stringify({
        ...plan,
        voiceName: $("#voiceName").value,
        useAiVideoClips: $("#useAiVideoClips").checked
      })
    });
    await refreshSession({ navigate: false });
    currentVideoDraft = result.item;
    activeVideoTab = "result";
    document.querySelector(".flow-steps").outerHTML = renderFlowSteps("done");
    refreshVideoWorkspace();
    closeRenderModal();
    setStatus("视频与声音已生成");
  } finally {
    button.disabled = false;
    button.textContent = "确认生成";
  }
};

renderMessages = async function() {
  const payload = await api("/api/conversations");
  if (!activeConversationId && payload.items[0]) activeConversationId = payload.items[0].id;
  const active = payload.items.find((item) => item.id === activeConversationId) || payload.items[0];
  $("#mainContent").innerHTML = `
    <div class="message-container">
      <div class="conversation-list">
        ${payload.items.map((item) => `
          <div class="conversation-item ${item.id === active?.id ? "active" : ""}" data-conversation="${item.id}">
            <div class="conv-user">${item.customerName}</div>
            <div class="conv-platform">${iconForPlatform(item.platform)[0]} ${platformName(item.platform)}</div>
            <div class="conv-preview">${item.lastMessage}</div>
          </div>
        `).join("")}
      </div>
      <div class="message-panel">
        <div class="message-header">
          <h3>${active?.customerName || "选择会话"}</h3>
          <p>${active ? `${iconForPlatform(active.platform)[0]} ${platformName(active.platform)} · 在线` : ""}</p>
        </div>
        <div class="message-body" id="messageBody"></div>
        <div class="message-footer">
          <div class="ai-toggle"><span>🤖 AI自动回复</span><div class="switch"></div></div>
          <input id="messageInput" class="message-input" type="text" placeholder="输入消息...">
          <button id="adoptSuggestionButton" class="btn" type="button">采纳AI</button>
          <button id="sendMessageButton" class="btn" type="button">发送</button>
        </div>
      </div>
    </div>
  `;
  renderMessageBody(active);
  document.querySelectorAll("[data-conversation]").forEach((item) => {
    item.addEventListener("click", () => {
      activeConversationId = item.dataset.conversation;
      renderMessages().catch((error) => setStatus(error.message));
    });
  });
  $("#sendMessageButton").addEventListener("click", sendMessage);
  $("#adoptSuggestionButton").addEventListener("click", adoptSuggestion);
};

function renderMessageBody(conversation) {
  if (!conversation) return;
  $("#messageBody").innerHTML = [
    ...conversation.messages,
    { role: "ai", text: `AI建议：${conversation.aiSuggestion}`, time: "待采纳" }
  ].map((message) => `
    <div class="message-bubble ${message.role === "customer" ? "user" : "ai"}">
      <div>${message.text}</div>
      <div style="font-size:11px; color:#999; margin-top:6px;">${message.time || ""}</div>
    </div>
  `).join("");
}

async function sendMessage() {
  const text = $("#messageInput").value.trim();
  const result = await api(`/api/conversations/${activeConversationId}/platform-reply`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
  await renderMessages();
  setStatus(result.item?.delivery?.syncStatus || "消息已发送");
}

async function adoptSuggestion() {
  await api(`/api/conversations/${activeConversationId}/adopt-suggestion`, { method: "POST" });
  await renderMessages();
  setStatus("AI建议已采纳");
}

async function renderLive() {
  const data = await api("/api/live");
  $("#mainContent").innerHTML = `
    ${renderStatCards([
      { title: "在线观看", value: formatNumber(data.online), change: "实时数据", icon: "👁️", bg: "#e3f2fd", color: "#2196f3" },
      { title: "互动次数", value: formatNumber(data.interactions), change: "+23 最近5分钟", icon: "💬", bg: "#fce4ec", color: "#e91e63" },
      { title: "直播销售额", value: formatMoney(data.salesAmount), change: "+¥1,200 最近1小时", icon: "💰", bg: "#e8f5e9", color: "#4caf50" },
      { title: "成交订单", value: formatNumber(data.orders), change: "+5 最近5分钟", icon: "📦", bg: "#fff3e0", color: "#ff9800" }
    ])}
    <div class="chart-card">
      <div class="chart-title">直播数据实时监控</div>
      <canvas id="liveChart" height="80"></canvas>
    </div>
  `;
  drawLineChart("liveChart", data.trend.map((item) => item.label), [
    { label: "在线人数", data: data.trend.map((item) => item.online), borderColor: "#2196f3", backgroundColor: "rgba(33, 150, 243, 0.1)", fill: true, tension: 0.4 }
  ]);
}

async function renderSales() {
  const data = await api("/api/sales");
  $("#mainContent").innerHTML = `
    ${renderStatCards([
      { title: "本月销售额", value: formatMoney(data.monthAmount), change: "+35.2% 较上月", icon: "💰", bg: "#e8f5e9", color: "#4caf50" },
      { title: "订单数量", value: formatNumber(data.orderCount), change: "+28.5% 较上月", icon: "📦", bg: "#fff3e0", color: "#ff9800" },
      { title: "粉丝增长", value: formatNumber(data.fanGrowth), change: "+1,256 本月新增", icon: "👥", bg: "#f3e5f5", color: "#9c27b0" },
      { title: "转化率", value: `${data.conversionRate}%`, change: "+5% 较上月", icon: "📊", bg: "#e3f2fd", color: "#2196f3" }
    ])}
    <div class="chart-card">
      <div class="chart-title">近30天销售趋势</div>
      <canvas id="salesChart" height="80"></canvas>
    </div>
    <div class="platform-list" style="margin-top:24px;">
      <div class="chart-title">产品销售排行</div>
      ${data.products.map((item) => `
        <div class="platform-item">
          <div class="platform-info">
            <div class="platform-logo" style="background:#e3f2fd; color:#2196f3;">${item.rank}</div>
            <div>
              <div class="platform-name">${item.name}</div>
              <div style="font-size:12px; color:#666;">销量: ${item.salesCount}件</div>
            </div>
          </div>
          <div class="platform-data">
            <div class="platform-value">${formatMoney(item.amount)}</div>
            <div class="platform-label">销售额</div>
          </div>
        </div>
      `).join("")}
    </div>
  `;
  drawBarChart("salesChart", data.trend.map((item) => item.label), data.trend.map((item) => item.amount));
}

async function renderSettings() {
  const accounts = await api("/api/accounts");
  const settings = await api("/api/settings");
  const provider = settings.videoProvider;
  const textProvider = settings.textProvider;
  const voiceProvider = settings.voiceProvider;
  videoProviderOptionsCache = settings.videoProviderOptions;
  $("#mainContent").innerHTML = `
    <div class="settings-grid">
      <div class="settings-card">
        <h3>⚙️ 平台账号管理</h3>
        <div id="accountList">
          ${accounts.items.map((item) => {
            const [icon, color] = iconForPlatform(item.platform);
            return `
              <div class="account-item">
                <div class="account-info">
                  <div class="account-icon" style="background:${color};">${icon}</div>
                  <div class="account-details">
                    <h4>${item.platformName}</h4>
                    <p>${item.status === "connected" ? `账号ID: ${item.accountName}` : "未绑定"}</p>
                  </div>
                </div>
                <button class="status-badge ${item.status}" data-toggle-account="${item.id}" type="button">${item.status === "connected" ? "已连接" : "未连接"}</button>
              </div>
            `;
          }).join("")}
        </div>
        <button id="addAccountButton" class="add-account-btn" type="button">+ 添加新平台账号</button>
      </div>
      <div class="settings-card">
        <h3>🤖 AI设置</h3>
        <div class="form-group">
          <label class="form-label">企业知识库</label>
          <textarea id="knowledgeBase" class="form-textarea" placeholder="输入您的企业产品信息、常见问题等，AI将基于这些信息自动回复客户...">${settings.knowledgeBase || ""}</textarea>
        </div>
        <button id="saveKnowledgeButton" class="btn" style="width:100%;" type="button">保存设置</button>
      </div>
      <div class="settings-card">
        <h3>✍️ 脚本/分镜模型</h3>
        <div class="provider-status ${textProvider.configured ? "configured" : "missing"}">
          ${textProvider.providerName} · ${textProvider.configured ? "已配置" : "未配置"}
        </div>
        <div class="form-group">
          <label class="form-label">模型供应商</label>
          <select id="textProviderSelect" class="form-select">
            ${settings.textProviderOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === textProvider.provider ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
          </select>
        </div>
        <div id="textProviderSecretFields">
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input id="textApiKey" class="form-input" type="password" placeholder="${textProvider.apiKeySaved ? "已保存，留空不修改" : "请输入 API Key"}">
          </div>
        </div>
        <div class="settings-two-col">
          <div class="form-group">
            <label class="form-label">模型</label>
            <input id="textModel" class="form-input" value="${escapeHtml(textProvider.model)}" placeholder="模型名称">
          </div>
          <div class="form-group">
            <label class="form-label">温度</label>
            <input id="textTemperature" class="form-input" type="number" min="0" max="2" step="0.1" value="${textProvider.temperature}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Endpoint</label>
          <input id="textEndpoint" class="form-input" value="${escapeHtml(textProvider.endpoint || "")}" placeholder="OpenAI 兼容接口地址">
        </div>
        <div class="provider-actions">
          <label class="clear-secret-check"><input id="clearTextSecrets" type="checkbox"> 清空已保存密钥</label>
          <button id="saveTextProviderButton" class="btn" type="button">保存脚本模型</button>
        </div>
        <p class="settings-help">DeepSeek 和豆包用于生成脚本、分镜、镜头描述；视频画面仍由视频生成供应商负责。</p>
      </div>
      <div class="settings-card">
        <h3>🎙️ 配音模型</h3>
        <div class="provider-status ${voiceProvider.configured ? "configured" : "missing"}">
          ${voiceProvider.providerName} · ${voiceProvider.configured ? "已配置" : "未配置"}
        </div>
        <div class="form-group">
          <label class="form-label">配音供应商</label>
          <select id="voiceProviderSelect" class="form-select">
            ${settings.voiceProviderOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === voiceProvider.provider ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
          </select>
        </div>
        <div id="voiceProviderSecretFields">
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input id="voiceApiKey" class="form-input" type="password" placeholder="${voiceProvider.apiKeySaved ? "已保存，留空不修改" : "请输入 API Key"}">
          </div>
        </div>
        <div class="settings-two-col">
          <div class="form-group">
            <label class="form-label">模型</label>
            <input id="voiceModel" class="form-input" value="${escapeHtml(voiceProvider.model)}" placeholder="如 gpt-4o-mini-tts">
          </div>
          <div class="form-group">
            <label class="form-label">Voice</label>
            <input id="voiceCode" class="form-input" value="${escapeHtml(voiceProvider.voice)}" placeholder="OpenAI 如 alloy，豆包填写 voice_type">
          </div>
        </div>
        <div class="settings-two-col" id="voiceDoubaoFields">
          <div class="form-group">
            <label class="form-label">App ID</label>
            <input id="voiceAppId" class="form-input" value="${escapeHtml(voiceProvider.appId || "")}" placeholder="火山引擎语音应用 App ID">
          </div>
          <div class="form-group">
            <label class="form-label">Cluster</label>
            <input id="voiceCluster" class="form-input" value="${escapeHtml(voiceProvider.cluster || "")}" placeholder="默认 volcano_mega">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Endpoint</label>
          <input id="voiceEndpoint" class="form-input" value="${escapeHtml(voiceProvider.endpoint || "")}" placeholder="语音接口地址，按供应商默认值即可">
        </div>
        <div class="provider-actions">
          <label class="clear-secret-check"><input id="clearVoiceSecrets" type="checkbox"> 清空已保存密钥</label>
          <button id="saveVoiceProviderButton" class="btn" type="button">保存配音模型</button>
        </div>
        <p class="settings-help">本地口播无需密钥；AI 配音用于生成更拟人化的逐镜头 WAV 声音。</p>
      </div>
      <div class="settings-card">
        <h3>🎬 视频生成供应商</h3>
        <div class="provider-status ${provider.configured ? "configured" : "missing"}">
          ${provider.providerName} · ${provider.configured ? "已配置" : "未配置"}
        </div>
        <div class="form-group">
          <label class="form-label">供应商</label>
          <select id="videoProviderSelect" class="form-select">
            ${settings.videoProviderOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === provider.provider ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}
          </select>
        </div>
        <div class="provider-fields" id="apiKeyFields">
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input id="videoApiKey" class="form-input" type="password" placeholder="${provider.apiKeySaved ? "已保存，留空不修改" : "请输入 API Key"}">
          </div>
        </div>
        <div class="provider-fields" id="akskFields">
          <div class="form-group">
            <label class="form-label">Access Key / Secret Key</label>
            <input id="videoAccessKey" class="form-input" type="password" placeholder="${provider.accessKeySaved ? "Access Key 已保存，留空不修改" : "请输入 Access Key"}">
          </div>
          <div class="form-group">
            <input id="videoSecretKey" class="form-input" type="password" placeholder="${provider.secretKeySaved ? "Secret Key 已保存，留空不修改" : "请输入 Secret Key"}">
          </div>
        </div>
        <div class="settings-two-col">
          <div class="form-group">
            <label class="form-label">模型</label>
            <select id="videoModel" class="form-select"></select>
            <input id="customVideoModel" class="form-input custom-model-input hidden" placeholder="输入官方文档中的模型 ID">
          </div>
          <div class="form-group">
            <label class="form-label">尺寸</label>
            <select id="videoSize" class="form-select">
              ${["1280x720", "720x1280", "1024x1024"].map((size) => `<option ${size === provider.size ? "selected" : ""}>${size}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="settings-two-col">
          <div class="form-group">
            <label class="form-label">区域</label>
            <input id="videoRegion" class="form-input" value="${escapeHtml(provider.region || "")}" placeholder="可选，如 cn-beijing">
          </div>
          <div class="form-group">
            <label class="form-label">自定义 endpoint</label>
            <input id="videoEndpoint" class="form-input" value="${escapeHtml(provider.endpoint || "")}" placeholder="可选，默认 DashScope；百炼业务空间域名填到这里">
          </div>
        </div>
        <div class="provider-actions">
          <label class="clear-secret-check"><input id="clearVideoSecrets" type="checkbox"> 清空已保存密钥</label>
          <button id="saveVideoProviderButton" class="btn" type="button">保存视频供应商</button>
        </div>
        <p class="settings-help">下拉内置常用模型；厂商新发模型可选“自定义模型 ID”后手动填写。密钥只保存在当前本地运行进程内，页面不会回显明文。</p>
      </div>
    </div>
  `;
  $("#addAccountButton").addEventListener("click", addAccount);
  $("#saveKnowledgeButton").addEventListener("click", saveKnowledge);
  $("#videoProviderSelect").addEventListener("change", () => updateProviderFieldVisibility());
  $("#videoModel").addEventListener("change", syncCustomVideoModelVisibility);
  $("#saveVideoProviderButton").addEventListener("click", saveVideoProvider);
  $("#textProviderSelect").addEventListener("change", () => updateTextProviderSelection(settings.textProviderOptions));
  $("#saveTextProviderButton").addEventListener("click", saveTextProvider);
  $("#voiceProviderSelect").addEventListener("change", () => updateVoiceProviderSelection(settings.voiceProviderOptions));
  $("#saveVoiceProviderButton").addEventListener("click", saveVoiceProvider);
  updateTextProviderFieldVisibility();
  updateVoiceProviderFieldVisibility();
  updateProviderFieldVisibility(provider.model);
}

async function renderMerchantOnboarding() {
  const data = await api("/api/onboarding/merchant");
  $("#mainContent").innerHTML = `
    <div class="notice-card">
      商户模式会按平台展示入驻前需要准备的资料。这里是本地材料准备和状态记录，不会自动提交到抖音、快手、视频号官方平台。
    </div>
    <div class="code-strip">
      <div class="code-item"><span>商户 CODE</span><strong>${data.merchantCode || "提交任一平台审核后生成"}</strong></div>
      <div class="code-item"><span>当前状态</span><strong>${data.platforms.some((item) => item.status === "approved") ? "已有平台审核通过" : data.platforms.some((item) => item.status === "reviewing") ? "平台审核中" : "待提交审核"}</strong></div>
      <div class="code-item"><span>授权 Code</span><strong>审核通过后获取</strong></div>
    </div>
    <div class="settings-card" style="margin-bottom:20px;">
      <h3>🏢 商户基础信息</h3>
      <div class="merchant-profile">
        <label><span>企业名称</span><input id="businessName" value="${data.businessName || ""}" placeholder="请输入营业执照上的企业名称"></label>
        <label><span>统一社会信用代码</span><input id="unifiedSocialCreditCode" value="${data.unifiedSocialCreditCode || ""}" placeholder="请输入统一社会信用代码"></label>
        <label><span>联系人</span><input id="contactName" value="${data.contactName || ""}" placeholder="请输入联系人"></label>
        <label><span>联系电话</span><input id="contactPhone" value="${data.contactPhone || ""}" placeholder="请输入联系电话"></label>
      </div>
      <button id="saveMerchantProfileButton" class="btn" style="margin-top:16px;" type="button">保存商户信息</button>
    </div>
    <div class="settings-grid">
      ${data.platforms.map((platform) => `
        <div class="settings-card">
          <h3>${iconForPlatform(platform.platform)[0]} ${platform.platformName} 资料准备</h3>
          <div class="status-badge ${["ready", "approved"].includes(platform.status) ? "connected" : "disconnected"}">${platformStatusText(platform.status)}</div>
          <div class="code-strip" style="grid-template-columns:1fr; margin-top:12px; margin-bottom:0;">
            <div class="code-item"><span>申请单号</span><strong>${platform.applicationNo || "未提交"}</strong></div>
            <div class="code-item"><span>预计审核日期</span><strong>${platform.reviewDate || "提交后生成"}</strong></div>
            <div class="code-item"><span>授权状态</span><strong>${platform.canAuthorize ? "可获取授权 Code" : "暂不能获取授权 Code"}</strong></div>
          </div>
          <div style="margin-top:14px;">
            ${platform.materials.map((material) => `
              <div class="material-row">
                <div class="material-name">
                  <strong>${material.label}</strong>
                  <div class="platform-label">${material.required ? "必填" : "选填"}</div>
                </div>
                <div class="platform-label material-file-name">${material.uploaded ? material.fileName : "未上传"}</div>
                <label class="upload-button">
                  选择文件
                  <input class="material-upload-input" data-material-file data-platform="${platform.platform}" data-material="${material.key}" type="file">
                </label>
              </div>
            `).join("")}
          </div>
          <ul class="tips-list">
            ${platform.tips.map((tip) => `<li>${tip}</li>`).join("")}
          </ul>
          <div class="review-actions">
            <button class="btn" data-submit-review="${platform.platform}" type="button">提交平台审核</button>
            <button class="btn" data-approve-review="${platform.platform}" type="button">模拟审核通过</button>
            <button class="btn" data-get-auth-code="${platform.platform}" ${platform.canAuthorize ? "" : "disabled"} type="button">获取授权 Code</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
  $("#saveMerchantProfileButton").addEventListener("click", saveMerchantProfile);
  document.querySelectorAll("[data-material-file]").forEach((input) => {
    input.addEventListener("change", () => uploadMerchantMaterial(input));
  });
}

function platformStatusText(status) {
  return {
    pending: "待补充资料",
    ready: "必填资料已齐",
    reviewing: "审核中",
    approved: "审核通过"
  }[status] || status;
}

async function saveMerchantProfile() {
  await api("/api/onboarding/merchant/profile", {
    method: "POST",
    body: JSON.stringify({
      businessName: $("#businessName").value,
      unifiedSocialCreditCode: $("#unifiedSocialCreditCode").value,
      contactName: $("#contactName").value,
      contactPhone: $("#contactPhone").value
    })
  });
  setStatus("商户信息已保存");
}

async function uploadMerchantMaterial(input) {
  const file = input.files?.[0];
  if (!file) return;
  await api("/api/onboarding/merchant/material", {
    method: "POST",
    body: JSON.stringify({
      platform: input.dataset.platform,
      materialKey: input.dataset.material,
      fileName: file.name
    })
  });
  await renderMerchantOnboarding();
  setStatus("材料状态已更新");
}

async function submitReview(platform) {
  const result = await api("/api/onboarding/merchant/submit-review", {
    method: "POST",
    body: JSON.stringify({ platform })
  });
  await renderMerchantOnboarding();
  setStatus(`${result.item.platformName} ${result.item.message}，预计 ${result.item.reviewDate}`);
}

async function approveReview(platform) {
  const result = await api("/api/onboarding/merchant/approve-review", {
    method: "POST",
    body: JSON.stringify({ platform })
  });
  await renderMerchantOnboarding();
  setStatus(`${result.item.platformName} ${result.item.message}`);
}

async function getAuthCode(platform) {
  const result = await api("/api/onboarding/merchant/authorization-code", {
    method: "POST",
    body: JSON.stringify({ platform })
  });
  await renderMerchantOnboarding();
  setStatus(result.item.authorizationCode ? `授权 Code：${result.item.authorizationCode}` : result.item.message);
}

async function addAccount() {
  const accountName = window.prompt("请输入平台账号ID");
  if (!accountName) return;
  await api("/api/accounts", {
    method: "POST",
    body: JSON.stringify({ platform: "douyin", accountName })
  });
  await renderSettings();
  setStatus("平台账号已添加");
}

async function saveKnowledge() {
  await api("/api/settings/knowledge-base", {
    method: "POST",
    body: JSON.stringify({ knowledgeBase: $("#knowledgeBase").value })
  });
  setStatus("AI设置已保存");
}

function providerKeyMode(provider) {
  return videoProviderOptionsCache.find((item) => item.value === provider)?.keyMode || "apiKey";
}

function currentVideoProviderOption() {
  return videoProviderOptionsCache.find((item) => item.value === $("#videoProviderSelect").value) || videoProviderOptionsCache[0];
}

function renderVideoModelOptions(preferredModel) {
  const option = currentVideoProviderOption();
  const models = [...new Set(option?.models?.length ? option.models : [option?.defaultModel].filter(Boolean))];
  const normalizedPreferred = String(preferredModel || "").trim();
  const selected = models.includes(normalizedPreferred)
    ? normalizedPreferred
    : normalizedPreferred
      ? customVideoModelValue
      : option?.defaultModel || models[0] || "";
  $("#videoModel").innerHTML = [
    ...models.map((model) => `<option value="${escapeHtml(model)}" ${model === selected ? "selected" : ""}>${escapeHtml(model)}</option>`),
    `<option value="${customVideoModelValue}" ${selected === customVideoModelValue ? "selected" : ""}>自定义模型 ID...</option>`
  ].join("");
  $("#customVideoModel").value = selected === customVideoModelValue ? normalizedPreferred : "";
  syncCustomVideoModelVisibility();
}

function syncCustomVideoModelVisibility() {
  const useCustomModel = $("#videoModel").value === customVideoModelValue;
  $("#customVideoModel").classList.toggle("hidden", !useCustomModel);
}

function selectedVideoModel() {
  const option = currentVideoProviderOption();
  if ($("#videoModel").value === customVideoModelValue) {
    return $("#customVideoModel").value.trim() || option?.defaultModel || "";
  }
  return $("#videoModel").value || option?.defaultModel || "";
}

function updateProviderFieldVisibility(preferredModel = "") {
  const option = currentVideoProviderOption();
  const mode = providerKeyMode($("#videoProviderSelect").value);
  $("#apiKeyFields").classList.toggle("hidden", mode !== "apiKey");
  $("#akskFields").classList.toggle("hidden", mode !== "aksk");
  renderVideoModelOptions(preferredModel || option?.defaultModel || "");
}

function updateTextProviderFieldVisibility() {
  const isLocal = $("#textProviderSelect").value === "local";
  $("#textProviderSecretFields").classList.toggle("hidden", isLocal);
}

function updateTextProviderSelection(options = []) {
  const option = options.find((item) => item.value === $("#textProviderSelect").value);
  if (option) {
    $("#textModel").value = option.defaultModel || "";
    $("#textEndpoint").value = option.defaultEndpoint || "";
  }
  updateTextProviderFieldVisibility();
}

function updateVoiceProviderFieldVisibility() {
  const isLocal = $("#voiceProviderSelect").value === "local";
  const isDoubao = $("#voiceProviderSelect").value === "doubao-tts";
  $("#voiceProviderSecretFields").classList.toggle("hidden", isLocal);
  $("#voiceDoubaoFields").classList.toggle("hidden", !isDoubao);
}

function updateVoiceProviderSelection(options = []) {
  const option = options.find((item) => item.value === $("#voiceProviderSelect").value);
  if (option) {
    $("#voiceModel").value = option.defaultModel || "";
    $("#voiceEndpoint").value = option.defaultEndpoint || "";
    $("#voiceCode").value = option.defaultVoice || "";
    $("#voiceCluster").value = option.defaultCluster || "";
    $("#voiceAppId").value = "";
  }
  updateVoiceProviderFieldVisibility();
}

async function saveVideoProvider() {
  const result = await api("/api/settings/video-provider", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#videoProviderSelect").value,
      apiKey: $("#videoApiKey").value,
      accessKey: $("#videoAccessKey").value,
      secretKey: $("#videoSecretKey").value,
      model: selectedVideoModel(),
      size: $("#videoSize").value,
      region: $("#videoRegion").value,
      endpoint: $("#videoEndpoint").value,
      clearSecrets: $("#clearVideoSecrets").checked
    })
  });
  await renderSettings();
  setStatus(`${result.item.providerName} 视频生成配置已保存`);
}

async function saveTextProvider() {
  const result = await api("/api/settings/text-provider", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#textProviderSelect").value,
      apiKey: $("#textApiKey").value,
      model: $("#textModel").value,
      endpoint: $("#textEndpoint").value,
      temperature: $("#textTemperature").value,
      clearSecrets: $("#clearTextSecrets").checked
    })
  });
  await renderSettings();
  setStatus(`${result.item.providerName} 脚本模型配置已保存`);
}

async function saveVoiceProvider() {
  const result = await api("/api/settings/voice-provider", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#voiceProviderSelect").value,
      apiKey: $("#voiceApiKey").value,
      model: $("#voiceModel").value,
      endpoint: $("#voiceEndpoint").value,
      voice: $("#voiceCode").value,
      appId: $("#voiceAppId").value,
      cluster: $("#voiceCluster").value,
      clearSecrets: $("#clearVoiceSecrets").checked
    })
  });
  await renderSettings();
  setStatus(`${result.item.providerName} 配音模型配置已保存`);
}

function drawLineChart(id, labels, datasets) {
  destroyChart();
  const ctx = document.getElementById(id);
  if (!ctx || !window.Chart) return;
  currentCharts.push(new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: { responsive: true, maintainAspectRatio: true }
  }));
}

function drawBarChart(id, labels, data) {
  destroyChart();
  const ctx = document.getElementById(id);
  if (!ctx || !window.Chart) return;
  currentCharts.push(new Chart(ctx, {
    type: "bar",
    data: { labels, datasets: [{ label: "销售额 (¥)", data, backgroundColor: "#4caf50" }] },
    options: { responsive: true, maintainAspectRatio: true }
  }));
}

async function showPage(pageId) {
  if (pageId === "merchant" && session.userType !== "merchant") {
    setStatus("个人用户不需要商户入驻资料");
    pageId = "dashboard";
  }
  destroyChart();
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === pageId));
  $("#pageTitle").textContent = pageTitles[pageId];
  setStatus("正在加载");

  if (pageId === "dashboard") await renderDashboard();
  if (pageId === "content") await renderContent();
  if (pageId === "aivideo") await renderAiVideo();
  if (pageId === "messages") await renderMessages();
  if (pageId === "live") await renderLive();
  if (pageId === "sales") await renderSales();
  if (pageId === "merchant") await renderMerchantOnboarding();
  if (pageId === "settings") await renderSettings();

  setStatus("已加载");
}

async function refreshSession(options = {}) {
  const navigate = options.navigate !== false;
  session = await api("/api/session");
  const loggedIn = Boolean(session.userType);
  $("#loginScreen").classList.toggle("hidden", loggedIn);
  updateHeaderSession();
  document.querySelectorAll(".merchant-only").forEach((item) => item.classList.toggle("hidden", session.userType !== "merchant"));
  if (loggedIn && navigate) {
    await showPage(session.userType === "merchant" ? "merchant" : "dashboard");
  }
}

async function loginAs() {
  await api("/api/session/login", {
    method: "POST",
    body: JSON.stringify({
      username: $("#loginUsername").value.trim(),
      password: $("#loginPassword").value,
      userType: $("#loginUserType").value
    })
  });
  await refreshSession();
}

async function logout() {
  await api("/api/session/logout", { method: "POST" });
  session = { userType: null, quota: {} };
  $("#loginScreen").classList.remove("hidden");
  updateHeaderSession();
  setStatus("已退出");
}

document.addEventListener("click", (event) => {
  const nav = event.target.closest("[data-page]");
  if (nav) {
    showPage(nav.dataset.page).catch((error) => setStatus(error.message));
    return;
  }

  const openRenderButton = event.target.closest("#openRenderModalButton");
  if (openRenderButton) {
    try {
      openRenderModal();
    } catch (error) {
      setStatus(error.message);
    }
    return;
  }

  const videoTab = event.target.closest("[data-video-tab]");
  if (videoTab) {
    activeVideoTab = videoTab.dataset.videoTab;
    refreshVideoWorkspace();
    return;
  }

  if (event.target.closest("[data-edit-script]")) {
    openScriptEditor();
    return;
  }

  const editShot = event.target.closest("[data-edit-shot]");
  if (editShot) {
    openShotEditor(editShot.dataset.editShot);
    return;
  }

  if (event.target.closest("[data-open-render-details]")) {
    openRenderDetails();
    return;
  }

  if (event.target.closest("[data-close-render-modal]")) {
    closeRenderModal();
  }

  const copy = event.target.closest("[data-copy]");
  if (copy) {
    sessionStorage.setItem("extractedCopy", decodeURIComponent(copy.dataset.copy || ""));
    showPage("aivideo").catch((error) => setStatus(error.message));
    setStatus("文案已提取到 AI 视频生成页");
    return;
  }

  const download = event.target.closest("[data-download]");
  if (download) {
    setStatus("已生成下载任务");
    return;
  }

  const toggle = event.target.closest("[data-toggle-account]");
  if (toggle) {
    api(`/api/accounts/${toggle.dataset.toggleAccount}/toggle`, { method: "POST" })
      .then(renderSettings)
      .catch((error) => setStatus(error.message));
  }

  const submitReviewButton = event.target.closest("[data-submit-review]");
  if (submitReviewButton) {
    submitReview(submitReviewButton.dataset.submitReview).catch((error) => setStatus(error.message));
    return;
  }

  const approveReviewButton = event.target.closest("[data-approve-review]");
  if (approveReviewButton) {
    approveReview(approveReviewButton.dataset.approveReview).catch((error) => setStatus(error.message));
    return;
  }

  const authCodeButton = event.target.closest("[data-get-auth-code]");
  if (authCodeButton) {
    getAuthCode(authCodeButton.dataset.getAuthCode).catch((error) => setStatus(error.message));
  }

});

$("#loginForm").addEventListener("submit", (event) => {
  event.preventDefault();
  loginAs().catch((error) => setStatus(error.message));
});
$("#logoutButton").addEventListener("click", () => logout().catch((error) => setStatus(error.message)));
$("#confirmRenderButton").addEventListener("click", () => confirmRenderVideo().catch((error) => setStatus(error.message)));

function renderFlowSteps(activeKey) {
  const steps = [
    ["copy", "输入文案"],
    ["scenario", "场景分析"],
    ["script", "脚本分镜"],
    ["edit", "编辑确认"],
    ["render", "生成视频声音"],
    ["done", "结果预览"]
  ];
  const activeIndex = Math.max(0, steps.findIndex(([key]) => key === activeKey));
  return `
    <div class="flow-steps">
      ${steps.map(([key, label], index) => `
        <div class="flow-step ${index < activeIndex ? "done" : index === activeIndex ? "active" : ""}">
          <span>${index + 1}</span>
          <strong>${label}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

async function renderAiVideo() {
  const extractedCopy = sessionStorage.getItem("extractedCopy") || "";
  const settings = await api("/api/settings");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("AI 视频生成", '<button class="filter-tab" data-open-ai-video-config type="button">配置模型</button>')}
    ${renderFlowSteps("copy")}
    <div class="workbench-grid">
      <div class="ai-section">
        ${renderVideoProviderSummary(settings.videoProvider)}
        <div class="form-group">
          <label class="form-label">产品文案内容</label>
          <textarea id="videoCopy" class="form-textarea tall-input" placeholder="输入产品描述、卖点、适用场景，生成后可编辑脚本与分镜。">${escapeHtml(extractedCopy)}</textarea>
        </div>
        <div class="settings-two-col">
          <div class="form-group">
            <label class="form-label">视频风格</label>
            <select id="videoStyle" class="form-select">
              <option>专业商务风格</option>
              <option>活泼时尚风格</option>
              <option>温馨生活风格</option>
              <option>科技未来风格</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">视频时长</label>
            <select id="videoDuration" class="form-select">
              <option>15秒 - 快手/抖音短视频</option>
              <option>30秒 - 标准短视频</option>
              <option>60秒 - 详细介绍</option>
              <option>90秒 - 深度讲解</option>
            </select>
          </div>
        </div>
        <div class="scenario-toolbar">
          <button id="analyzeScenariosButton" class="filter-tab" type="button">分析使用场景</button>
          <button id="generateVideoButton" class="btn" type="button">生成脚本与分镜</button>
          <span id="scenarioModeText"></span>
        </div>
        <div id="scenarioPanel" class="scenario-panel"></div>
      </div>
      <div class="ai-section">
        <h3 style="margin-bottom:16px;">阶段结果</h3>
        <div id="videoPreview" class="preview-box muted-preview">
          <div>
            <strong>等待生成</strong>
            <p>生成脚本后会在这里展示可编辑分镜，再确认生成视频与声音。</p>
          </div>
        </div>
      </div>
    </div>
  `;
  sessionStorage.removeItem("extractedCopy");
  scenarioAnalysis = null;
  selectedUsageScenarios = [];
  $("#analyzeScenariosButton").addEventListener("click", analyzeScenarios);
  $("#scenarioPanel").addEventListener("change", syncSelectedScenarios);
  $("#generateVideoButton").addEventListener("click", generateVideo);
}

async function generateVideo() {
  const button = $("#generateVideoButton");
  const originalText = button.textContent;
  const copy = $("#videoCopy").value.trim();
  syncSelectedScenarios();
  button.disabled = true;
  button.textContent = "生成中...";
  document.querySelector(".flow-steps").outerHTML = renderFlowSteps("script");
  $("#videoPreview").innerHTML = renderScriptGeneratingState();
  setStatus("正在生成脚本和分镜");
  try {
    const result = await api("/api/videos", {
      method: "POST",
      body: JSON.stringify({
        topic: copy || "专业防护手套",
        style: $("#videoStyle").value,
        duration: $("#videoDuration").value,
        scenarios: selectedUsageScenarios
      })
    });
    document.querySelector(".flow-steps").outerHTML = renderFlowSteps("edit");
    $("#videoPreview").classList.remove("muted-preview");
    $("#videoPreview").innerHTML = renderVideoPlan(result.item);
    setStatus("AI视频草稿已生成，可编辑后继续生成视频与声音");
  } catch (error) {
    $("#videoPreview").innerHTML = `<div class="preview-error">${escapeHtml(error.message || "脚本生成失败")}</div>`;
    setStatus(error.message || "脚本生成失败");
  } finally {
    button.disabled = false;
    button.textContent = originalText;
  }
}

async function renderMessages() {
  const payload = await api("/api/conversations");
  if (!activeConversationId && payload.items[0]) activeConversationId = payload.items[0].id;
  const active = payload.items.find((item) => item.id === activeConversationId) || payload.items[0];
  const tagCounts = payload.items.reduce((acc, item) => acc + (item.tags || []).length, 0);
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("客户管理", '<button class="filter-tab" data-open-broadcast type="button">群发预览</button>')}
    ${renderStatCards([
      { title: "客户会话", value: formatNumber(payload.items.length), change: "跨平台聚合", icon: "💬", bg: "#e3f2fd", color: "#2196f3" },
      { title: "客户标签", value: formatNumber(tagCounts), change: "可手动维护", icon: "🏷️", bg: "#f3e5f5", color: "#9c27b0" },
      { title: "AI 自动回复", value: formatNumber(payload.items.filter((item) => item.autoReply).length), change: "已开启会话", icon: "🤖", bg: "#e8f5e9", color: "#27ae60" },
      { title: "待转化客户", value: formatNumber(payload.items.filter((item) => item.group === "待转化客户").length), change: "重点跟进", icon: "🎯", bg: "#fff3e0", color: "#ff9800" }
    ])}
    <div class="message-container">
      <div class="conversation-list">
        ${payload.items.map((item) => `
          <div class="conversation-item ${item.id === active?.id ? "active" : ""}" data-conversation="${item.id}">
            <div class="conv-user">${escapeHtml(item.customerName)}</div>
            <div class="conv-platform">${iconForPlatform(item.platform)[0]} ${platformName(item.platform)} · ${escapeHtml(item.lifecycle || "新线索")}</div>
            <div class="conv-preview">${escapeHtml(item.lastMessage)}</div>
            <div class="tag-row small-tags">${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
        `).join("")}
      </div>
      <div class="message-panel">
        <div class="message-header split-header">
          <div>
            <h3>${escapeHtml(active?.customerName || "选择会话")}</h3>
            <p>${active ? `${iconForPlatform(active.platform)[0]} ${platformName(active.platform)} · ${escapeHtml(active.group || "未分组")} · ${escapeHtml(active.lifecycle || "新线索")}` : ""}</p>
          </div>
          ${active ? `<button class="filter-tab" data-edit-customer="${active.id}" type="button">客户详情</button>` : ""}
        </div>
        <div class="message-body" id="messageBody"></div>
        <div class="message-footer">
          <label class="ai-toggle"><input id="autoReplySwitch" type="checkbox" ${active?.autoReply ? "checked" : ""}> AI自动回复</label>
          <input id="messageInput" class="message-input" type="text" placeholder="输入消息...">
          <button id="adoptSuggestionButton" class="btn" type="button">采纳AI</button>
          <button id="sendMessageButton" class="btn" type="button">发送</button>
        </div>
      </div>
    </div>
  `;
  renderMessageBody(active);
  document.querySelectorAll("[data-conversation]").forEach((item) => {
    item.addEventListener("click", () => {
      activeConversationId = item.dataset.conversation;
      renderMessages().catch((error) => setStatus(error.message));
    });
  });
  $("#sendMessageButton").addEventListener("click", sendMessage);
  $("#adoptSuggestionButton").addEventListener("click", adoptSuggestion);
  $("#autoReplySwitch")?.addEventListener("change", () => saveCustomerProfile(active.id, true));
}

function openCustomerDetail(id) {
  api(`/api/conversations/${id}`)
    .then(({ item }) => {
      openAppModal("客户详情", `
        <div class="form-group">
          <label class="form-label">客户名称</label>
          <input class="form-input" value="${escapeHtml(item.customerName)}" disabled>
        </div>
        <div class="settings-two-col">
          <div class="form-group">
            <label class="form-label">客户分组</label>
            <select id="customerGroup" class="form-select">
              ${["新客户", "待转化客户", "活动客户", "企业采购", "售后客户"].map((group) => `<option ${group === item.group ? "selected" : ""}>${group}</option>`).join("")}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">生命周期</label>
            <select id="customerLifecycle" class="form-select">
              ${["新线索", "咨询中", "复访", "已成交", "流失风险"].map((stage) => `<option ${stage === item.lifecycle ? "selected" : ""}>${stage}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">客户标签</label>
          <input id="customerTags" class="form-input" value="${escapeHtml((item.tags || []).join(","))}" placeholder="用逗号分隔，如 高意向,询价">
        </div>
        <label class="modal-check">
          <input id="customerAutoReply" type="checkbox" ${item.autoReply ? "checked" : ""}>
          <span><strong>开启 AI 自动回复</strong><small>保存后会影响该客户会话的自动回复状态。</small></span>
        </label>
        <div class="modal-actions">
          <button class="filter-tab" data-close-app-modal type="button">取消</button>
          <button class="btn" data-save-customer="${item.id}" type="button">保存客户资料</button>
        </div>
      `);
    })
    .catch((error) => setStatus(error.message));
}

async function saveCustomerProfile(id, fromSwitch = false) {
  const activeAutoReply = fromSwitch ? $("#autoReplySwitch")?.checked : $("#customerAutoReply")?.checked;
  await api(`/api/conversations/${id}/profile`, {
    method: "POST",
    body: JSON.stringify({
      group: fromSwitch ? undefined : $("#customerGroup")?.value,
      lifecycle: fromSwitch ? undefined : $("#customerLifecycle")?.value,
      tags: fromSwitch ? undefined : $("#customerTags")?.value,
      autoReply: Boolean(activeAutoReply)
    })
  });
  closeAppModal();
  await renderMessages();
  setStatus("客户资料已保存");
}

function openBroadcastPreview() {
  openAppModal("群发预览", `
    <div class="notice-card">当前为本地预览：真实群发需要平台授权和风控审核。</div>
    <div class="form-group">
      <label class="form-label">目标分组</label>
      <select class="form-select"><option>待转化客户</option><option>活动客户</option><option>企业采购</option></select>
    </div>
    <div class="form-group">
      <label class="form-label">群发内容</label>
      <textarea class="form-textarea">专业防护手套本周有企业采购优惠，回复“报价”获取阶梯价格。</textarea>
    </div>
    <div class="modal-actions"><button class="btn" data-close-app-modal type="button">确认预览</button></div>
  `);
}

function chartOptions() {
  return { responsive: true, maintainAspectRatio: true };
}

function createChart(id, config) {
  const ctx = document.getElementById(id);
  if (!ctx || !window.Chart) return null;
  const chart = new Chart(ctx, config);
  currentCharts.push(chart);
  return chart;
}

drawLineChart = function(id, labels, datasets, keepExisting = false) {
  if (!keepExisting) destroyChart();
  createChart(id, {
    type: "line",
    data: { labels, datasets },
    options: chartOptions()
  });
};

drawBarChart = function(id, labels, data, label = "数值", keepExisting = false) {
  if (!keepExisting) destroyChart();
  createChart(id, {
    type: "bar",
    data: { labels, datasets: [{ label, data, backgroundColor: "#3498db" }] },
    options: chartOptions()
  });
};

function drawDoughnutChart(id, labels, data, keepExisting = false) {
  if (!keepExisting) destroyChart();
  createChart(id, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: ["#3498db", "#27ae60", "#f59e0b", "#8b5cf6"] }] },
    options: chartOptions()
  });
}

async function renderProducts() {
  const data = await api("/api/products");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("商品选品分析", '<button class="filter-tab" data-page="content" type="button">去搜内容</button>')}
    ${renderStatCards([
      { title: "候选商品", value: formatNumber(data.summary.totalProducts), change: "本地选品池", icon: "🧾", bg: "#e3f2fd", color: "#2196f3" },
      { title: "平均热度", value: data.summary.avgHotScore, change: "综合评分", icon: "🔥", bg: "#fff3e0", color: "#ff9800" },
      { title: "预估GMV", value: formatMoney(data.summary.totalGmv), change: "近30天", icon: "💰", bg: "#e8f5e9", color: "#27ae60" },
      { title: "高增长商品", value: formatNumber(data.summary.highGrowthCount), change: "增长率大于20%", icon: "📈", bg: "#f3e5f5", color: "#9c27b0" }
    ])}
    <div class="search-section">
      <div class="search-bar">
        <input id="productKeyword" class="search-input" placeholder="搜索商品、类目或标签">
        <button class="btn" id="productSearchButton" type="button">筛选</button>
      </div>
      <div class="filter-tabs">
        <button class="filter-tab active" data-product-platform="all" type="button">全部平台</button>
        <button class="filter-tab" data-product-platform="douyin" type="button">抖音</button>
        <button class="filter-tab" data-product-platform="kuaishou" type="button">快手</button>
        <button class="filter-tab" data-product-platform="wechat_channel" type="button">视频号</button>
      </div>
    </div>
    <div id="productList" class="business-grid">
      ${renderProductCards(data.items)}
    </div>
  `;
  $("#productSearchButton").addEventListener("click", loadProducts);
  document.querySelectorAll("[data-product-platform]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-product-platform]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      loadProducts().catch((error) => setStatus(error.message));
    });
  });
}

function renderProductCards(items) {
  return items.map((item) => `
    <div class="business-card">
      <div class="card-headline">
        <h3>${escapeHtml(item.name)}</h3>
        <span class="score-pill">${item.hotScore}</span>
      </div>
      <div class="tag-row">
        <span>${escapeHtml(platformName(item.platform))}</span>
        <span>${escapeHtml(item.category)}</span>
        <span>风险 ${escapeHtml(item.risk)}</span>
      </div>
      <div class="metric-row">
        <div><strong>${formatMoney(item.gmv)}</strong><span>GMV</span></div>
        <div><strong>${formatNumber(item.salesCount)}</strong><span>销量</span></div>
        <div><strong>${item.growthRate}%</strong><span>增长</span></div>
      </div>
      <p>${escapeHtml(item.insight)}</p>
      <div class="card-actions">
        <button class="filter-tab" data-product-detail="${item.id}" type="button">详情分析</button>
        <button class="btn" data-page="creators" type="button">找达人</button>
      </div>
    </div>
  `).join("");
}

async function loadProducts() {
  const platform = document.querySelector("[data-product-platform].active")?.dataset.productPlatform || "all";
  const keyword = $("#productKeyword").value.trim();
  const data = await api(`/api/products?${new URLSearchParams({ platform, keyword }).toString()}`);
  $("#productList").innerHTML = renderProductCards(data.items);
  setStatus("商品筛选已更新");
}

async function openProductDetail(id) {
  const { item } = await api(`/api/products/${id}`);
  openAppModal("商品详情分析", `
    <div class="detail-layout">
      <div>
        <div class="detail-title">${escapeHtml(item.name)}</div>
        <div class="tag-row">${item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="metric-row stacked">
          <div><strong>${formatMoney(item.gmv)}</strong><span>近30天GMV</span></div>
          <div><strong>${item.commissionRate}%</strong><span>佣金率</span></div>
          <div><strong>${item.marginRate}%</strong><span>毛利率</span></div>
        </div>
        <div class="copy-box">${escapeHtml(item.insight)}</div>
      </div>
      <div>
        <canvas id="productTrendChart" height="140"></canvas>
      </div>
    </div>
    ${renderMiniTable(["带货视频", "播放", "转化"], item.videos.map((video) => [escapeHtml(video.title), formatNumber(video.views), `${video.conversionRate}%`]))}
    ${renderMiniTable(["竞品", "价格", "GMV", "评分"], item.competitors.map((product) => [escapeHtml(product.name), `¥${product.price}`, formatMoney(product.gmv), product.score]))}
  `, { wide: true });
  setTimeout(() => drawLineChart("productTrendChart", ["周一", "周二", "周三", "周四", "周五", "周六", "周日"], [
    { label: "销售趋势", data: item.trend, borderColor: "#3498db", tension: 0.35 }
  ], true));
}

async function renderCreators() {
  const data = await api("/api/creators");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("达人筛选与合作", '<button class="filter-tab" data-page="products" type="button">返回选品</button>')}
    ${renderStatCards([
      { title: "候选达人", value: formatNumber(data.summary.creatorCount), change: "可筛选合作", icon: "🤝", bg: "#e3f2fd", color: "#2196f3" },
      { title: "平均匹配度", value: data.summary.avgMatchScore, change: "商品人群匹配", icon: "🎯", bg: "#e8f5e9", color: "#27ae60" },
      { title: "平均互动率", value: `${data.summary.avgEngagement}%`, change: "近30天", icon: "💬", bg: "#f3e5f5", color: "#9c27b0" },
      { title: "合作洽谈", value: formatNumber(data.summary.pendingCooperations), change: "本地状态", icon: "📝", bg: "#fff3e0", color: "#ff9800" }
    ])}
    <div class="business-grid">
      ${data.items.map((item) => `
        <div class="business-card">
          <div class="card-headline">
            <h3>${escapeHtml(item.name)}</h3>
            <span class="score-pill">${item.matchScore}</span>
          </div>
          <div class="tag-row">
            <span>${escapeHtml(platformName(item.platform))}</span>
            <span>${escapeHtml(item.category)}</span>
            <span>${escapeHtml(item.cooperationStatus)}</span>
          </div>
          <div class="metric-row">
            <div><strong>${formatNumber(item.fans)}</strong><span>粉丝</span></div>
            <div><strong>${formatNumber(item.avgViews)}</strong><span>均播</span></div>
            <div><strong>${item.engagementRate}%</strong><span>互动</span></div>
          </div>
          <p>${escapeHtml(item.suggestion)}</p>
          <div class="card-actions">
            <button class="filter-tab" data-creator-detail="${item.id}" type="button">达人详情</button>
            <button class="btn" data-start-cooperation="${item.id}" type="button">发起合作</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

async function openCreatorDetail(id) {
  const { item } = await api(`/api/creators/${id}`);
  openAppModal("达人详情", `
    <div class="detail-title">${escapeHtml(item.name)}</div>
    <div class="tag-row">${item.strengths.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <div class="metric-row stacked">
      <div><strong>${formatNumber(item.fans)}</strong><span>粉丝</span></div>
      <div><strong>${formatNumber(item.avgViews)}</strong><span>平均播放</span></div>
      <div><strong>¥${formatNumber(item.quote)}</strong><span>参考报价</span></div>
    </div>
    <div class="copy-box">${escapeHtml(item.suggestion)}</div>
    ${renderMiniTable(["近期视频", "播放", "互动"], item.recentVideos.map((video) => [escapeHtml(video.title), formatNumber(video.views), formatNumber(video.interaction)]))}
    <div class="modal-actions">
      <button class="filter-tab" data-close-app-modal type="button">关闭</button>
      <button class="btn" data-start-cooperation="${item.id}" type="button">发起合作</button>
    </div>
  `, { wide: true });
}

async function startCreatorCooperation(id) {
  const result = await api(`/api/creators/${id}/cooperation`, { method: "POST" });
  closeAppModal();
  await renderCreators();
  setStatus(`${result.item.creatorName} 已进入合作洽谈`);
}

async function renderOperations() {
  const data = await api("/api/operations");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("经营分析", '<button class="filter-tab" data-page="finance" type="button">查看财务</button>')}
    ${renderStatCards([
      { title: "GMV", value: formatMoney(data.metrics.gmv), change: "近30天", icon: "💰", bg: "#e8f5e9", color: "#27ae60" },
      { title: "订单数", value: formatNumber(data.metrics.orders), change: "近30天", icon: "📦", bg: "#fff3e0", color: "#ff9800" },
      { title: "客单价", value: formatMoney(data.metrics.avgOrderValue), change: "整体", icon: "🧾", bg: "#e3f2fd", color: "#2196f3" },
      { title: "健康度", value: data.metrics.healthScore, change: "综合评分", icon: "📈", bg: "#f3e5f5", color: "#9c27b0" }
    ])}
    <div class="dashboard-grid">
      <div class="chart-card"><div class="chart-title">GMV趋势</div><canvas id="opsTrendChart" height="120"></canvas></div>
      <div class="chart-card"><div class="chart-title">平台占比</div><canvas id="opsShareChart" height="120"></canvas></div>
      <div class="chart-card"><div class="chart-title">转化漏斗</div>${renderFunnel(data.funnel)}</div>
      <div class="platform-list"><div class="chart-title">智能诊断</div>${data.suggestions.map((item) => `<div class="diagnosis-item"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.reason)}</p><span>${escapeHtml(item.action)}</span></div>`).join("")}</div>
    </div>
  `;
  drawLineChart("opsTrendChart", data.trend.map((item) => item.label), [
    { label: "GMV", data: data.trend.map((item) => item.gmv), borderColor: "#27ae60", tension: 0.35 }
  ]);
  drawDoughnutChart("opsShareChart", data.platformShare.map((item) => item.platform), data.platformShare.map((item) => item.value), true);
}

function renderFunnel(items) {
  return `<div class="funnel-list">${items.map((item) => `<div class="funnel-item"><span>${escapeHtml(item.stage)}</span><strong>${formatNumber(item.value)}</strong><i style="width:${Math.max(8, item.rate)}%;"></i></div>`).join("")}</div>`;
}

async function renderPublishing() {
  const data = await api("/api/publishing/insights");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("内容运营", '<button class="btn" data-open-publish-plan type="button">新建发布计划</button>')}
    <div class="dashboard-grid">
      <div class="chart-card"><div class="chart-title">爆款关键词</div>${data.hotKeywords.map((item) => `<div class="rank-row"><strong>${escapeHtml(item.keyword)}</strong><span>${formatNumber(item.videoCount)} 视频 · 均播 ${formatNumber(item.avgViews)}</span><i>${item.heat}</i></div>`).join("")}</div>
      <div class="chart-card"><div class="chart-title">最佳发布时间</div><canvas id="publishWindowChart" height="120"></canvas></div>
      <div class="chart-card"><div class="chart-title">视频时长完播率</div><canvas id="durationChart" height="120"></canvas></div>
      <div class="platform-list"><div class="chart-title">发布计划</div>${data.plans.map((item) => `<div class="platform-item"><div><div class="platform-name">${escapeHtml(item.title)}</div><div class="platform-label">${item.platforms.map(escapeHtml).join(" / ")} · ${escapeHtml(item.publishAt)}</div></div><span class="status-badge disconnected">${escapeHtml(item.status)}</span></div>`).join("")}</div>
    </div>
  `;
  drawBarChart("publishWindowChart", data.publishWindows.map((item) => item.label), data.publishWindows.map((item) => item.interactionRate), "互动率");
  drawBarChart("durationChart", data.durationAnalysis.map((item) => item.label), data.durationAnalysis.map((item) => item.avgCompletion), "完播率", true);
}

function openPublishPlanModal() {
  openAppModal("新建发布计划", `
    <div class="form-group"><label class="form-label">内容标题</label><input id="publishTitle" class="form-input" placeholder="输入计划发布的内容标题"></div>
    <div class="form-group"><label class="form-label">发布时间</label><input id="publishAt" class="form-input" value="2026-07-14 18:00"></div>
    <div class="tag-row checkbox-tags">
      <label><input type="checkbox" value="抖音" checked> 抖音</label>
      <label><input type="checkbox" value="快手" checked> 快手</label>
      <label><input type="checkbox" value="视频号"> 视频号</label>
    </div>
    <div class="notice-card">真实发布需要各平台授权。当前创建的是本地计划，状态会显示为待授权发布。</div>
    <div class="modal-actions"><button class="filter-tab" data-close-app-modal type="button">取消</button><button class="btn" data-save-publish-plan type="button">保存计划</button></div>
  `);
}

async function savePublishPlan() {
  const platforms = [...document.querySelectorAll(".checkbox-tags input:checked")].map((item) => item.value);
  await api("/api/publishing/plans", {
    method: "POST",
    body: JSON.stringify({ title: $("#publishTitle").value, publishAt: $("#publishAt").value, platforms })
  });
  closeAppModal();
  await renderPublishing();
  setStatus("发布计划已创建");
}

async function renderOrders() {
  const data = await api("/api/orders");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("订单与库存", '<button class="filter-tab" data-page="finance" type="button">查看结算</button>')}
    ${renderStatCards([
      { title: "待发货", value: formatNumber(data.summary.waitingShipment), change: "需要处理", icon: "📦", bg: "#fff3e0", color: "#ff9800" },
      { title: "已发货", value: formatNumber(data.summary.shipped), change: "今日", icon: "🚚", bg: "#e8f5e9", color: "#27ae60" },
      { title: "待退款", value: formatNumber(data.summary.refunding), change: "售后关注", icon: "↩", bg: "#fce4ec", color: "#e91e63" },
      { title: "库存预警", value: formatNumber(data.summary.warningSku), change: "低库存SKU", icon: "⚠", bg: "#f3e5f5", color: "#9c27b0" }
    ])}
    <div class="dashboard-grid">
      <div class="chart-card wide-card"><div class="chart-title">订单列表</div>${renderMiniTable(["订单号", "平台", "商品", "金额", "状态"], data.orders.map((item) => [`<button class="link-button" data-order-detail="${item.id}" type="button">${escapeHtml(item.orderNo)}</button>`, escapeHtml(item.platform), escapeHtml(item.product), formatMoney(item.amount), escapeHtml(item.status)]))}</div>
      <div class="chart-card wide-card"><div class="chart-title">库存预警</div>${renderMiniTable(["SKU", "商品", "库存", "安全库存", "状态"], data.inventory.map((item) => [escapeHtml(item.sku), escapeHtml(item.product), formatNumber(item.stock), formatNumber(item.safeStock), escapeHtml(item.status)]))}</div>
    </div>
  `;
}

async function openOrderDetail(id) {
  const { item } = await api(`/api/orders/${id}`);
  openAppModal("订单详情", `
    ${renderMiniTable(["字段", "内容"], [["订单号", escapeHtml(item.orderNo)], ["平台", escapeHtml(item.platform)], ["客户", escapeHtml(item.customer)], ["商品", escapeHtml(item.product)], ["金额", formatMoney(item.amount)], ["状态", escapeHtml(item.status)], ["地址", escapeHtml(item.address)]])}
    <div class="modal-actions"><button class="filter-tab" data-close-app-modal type="button">关闭</button><button class="btn" data-ship-order="${item.id}" type="button">标记发货</button></div>
  `);
}

async function shipOrder(id) {
  await api(`/api/orders/${id}/ship`, { method: "POST" });
  closeAppModal();
  await renderOrders();
  setStatus("订单已标记发货");
}

async function renderFinance() {
  const data = await api("/api/finance");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("财务与结算", '<button class="filter-tab" data-page="orders" type="button">查看订单</button>')}
    ${renderStatCards([
      { title: "收入", value: formatMoney(data.summary.income), change: "本期", icon: "💰", bg: "#e8f5e9", color: "#27ae60" },
      { title: "成本", value: formatMoney(data.summary.cost), change: "货品/投放/服务费", icon: "🧾", bg: "#fff3e0", color: "#ff9800" },
      { title: "利润", value: formatMoney(data.summary.profit), change: "预估", icon: "📈", bg: "#e3f2fd", color: "#2196f3" },
      { title: "待结算", value: formatMoney(data.summary.pendingSettlement), change: "平台账期", icon: "⏳", bg: "#f3e5f5", color: "#9c27b0" }
    ])}
    <div class="dashboard-grid">
      <div class="chart-card"><div class="chart-title">收入利润趋势</div><canvas id="financeTrendChart" height="120"></canvas></div>
      <div class="chart-card"><div class="chart-title">平台结算</div>${renderMiniTable(["平台", "收入", "服务费", "状态"], data.platformSettlement.map((item) => [escapeHtml(item.platform), formatMoney(item.income), formatMoney(item.fee), escapeHtml(item.settlementStatus)]))}</div>
      <div class="chart-card wide-card"><div class="chart-title">对账异常</div>${renderMiniTable(["平台", "日期", "系统金额", "平台金额", "差异", "状态"], data.reconciliations.map((item) => [escapeHtml(item.platform), escapeHtml(item.date), formatMoney(item.systemAmount), formatMoney(item.platformAmount), formatMoney(item.diff), escapeHtml(item.status)]))}</div>
    </div>
  `;
  drawLineChart("financeTrendChart", data.trend.map((item) => item.label), [
    { label: "收入", data: data.trend.map((item) => item.income), borderColor: "#3498db", tension: 0.35 },
    { label: "利润", data: data.trend.map((item) => item.profit), borderColor: "#27ae60", tension: 0.35 }
  ]);
}

async function renderTeam() {
  const data = await api("/api/team");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("团队协作与权限", '<button class="filter-tab" data-open-permissions type="button">权限说明</button>')}
    <div class="dashboard-grid">
      <div class="chart-card wide-card">
        <div class="chart-title">成员管理</div>
        ${renderMiniTable(["成员", "手机号", "角色", "状态", "最后活跃"], data.members.map((member) => [
          escapeHtml(member.name),
          escapeHtml(member.phone),
          `<select class="form-select compact-select" data-member-role="${member.id}">${data.roles.map((role) => `<option value="${role.id}" ${role.id === member.roleId ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}</select>`,
          escapeHtml(member.status),
          escapeHtml(member.lastActive)
        ]))}
      </div>
      <div class="chart-card"><div class="chart-title">角色权限</div>${data.roles.map((role) => `<div class="role-card"><strong>${escapeHtml(role.name)}</strong><div class="tag-row">${role.permissions.map((permission) => `<span>${escapeHtml(permission)}</span>`).join("")}</div></div>`).join("")}</div>
      <div class="chart-card wide-card"><div class="chart-title">操作日志</div>${renderMiniTable(["操作者", "模块", "动作", "时间"], data.auditLogs.map((log) => [escapeHtml(log.operator), escapeHtml(log.module), escapeHtml(log.action), escapeHtml(log.time)]))}</div>
    </div>
  `;
  document.querySelectorAll("[data-member-role]").forEach((select) => {
    select.addEventListener("change", () => updateMemberRole(select.dataset.memberRole, select.value));
  });
}

async function updateMemberRole(memberId, roleId) {
  await api(`/api/team/members/${memberId}/role`, {
    method: "POST",
    body: JSON.stringify({ roleId })
  });
  await renderTeam();
  setStatus("成员角色已更新");
}

function openPermissionHelp() {
  openAppModal("权限说明", `
    <div class="copy-box">当前为 MVP 权限闭环：角色会影响页面展示说明和成员状态，复杂后端鉴权可在正式账号体系接入后再增强。</div>
    <div class="tag-row"><span>店铺负责人</span><span>内容运营</span><span>客服</span><span>财务</span></div>
  `);
}

function renderUserAccessPanel(users = []) {
  return `
    <div class="access-panel">
      <div class="notice-card">管理员可设置每个账号的到期时间、启用状态和功能额度；额度会在内容搜索、脚本生成、视频生成时自动扣减。</div>
      ${users.map((user) => `
        <div class="access-user-card">
          <div class="access-user-head">
            <div>
              <strong>${escapeHtml(user.displayName)}</strong>
              <span>${escapeHtml(user.username)} · ${escapeHtml(userTypeLabel(user.userType))} · ${escapeHtml(roleLabel(user.role))}</span>
            </div>
            <label class="switch-row">
              <input data-user-enabled="${escapeHtml(user.id)}" type="checkbox" ${user.enabled ? "checked" : ""}>
              <span>${user.enabled ? "已启用" : "已停用"}</span>
            </label>
          </div>
          <div class="settings-two-col">
            <div class="form-group">
              <label class="form-label">可使用到期时间</label>
              <input class="form-input" data-user-expires="${escapeHtml(user.id)}" type="date" value="${escapeHtml(user.expiresAt || "")}">
            </div>
            <div class="form-group">
              <label class="form-label">账号状态</label>
              <div class="provider-status ${user.expired || !user.enabled ? "missing" : "configured"}">${user.expired ? "已到期" : user.enabled ? "可使用" : "已停用"}</div>
            </div>
          </div>
          <div class="quota-config-grid">
            ${quotaItems(user.quota).map((quota) => `
              <div class="quota-config-item">
                <label>${escapeHtml(quota.label)}</label>
                <input class="form-input" data-user-quota-limit="${escapeHtml(user.id)}" data-quota-key="${escapeHtml(quota.key)}" type="number" min="0" step="1" value="${quota.limit}">
                <small>已用 ${formatNumber(quota.used)}，剩余 ${formatNumber(quota.remaining)}</small>
              </div>
            `).join("")}
          </div>
          <div class="modal-actions">
            <button class="btn" data-save-user-access="${escapeHtml(user.id)}" type="button">保存该用户</button>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

renderSettings = async function() {
  const accounts = await api("/api/accounts");
  const settings = await api("/api/settings");
  const douyin = await api("/api/douyin/oauth/status");
  const users = session.role === "admin" ? await api("/api/users") : null;
  activeSettingsData = { accounts, settings, douyin, users };
  videoProviderOptionsCache = settings.videoProviderOptions;
  const douyinStatus = douyin.authorized ? "已授权" : douyin.configured ? "已配置待授权" : "未配置";
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("系统配置", "")}
    <div class="config-overview-grid">
      ${renderConfigCard("用户权限与额度", session.role === "admin" ? `${users.items.length} 个账号` : "当前账号", session.role === "admin" ? "设置用户可使用时间、启停状态和功能额度。" : "查看当前账号到期时间和剩余额度。", "users")}
      ${renderConfigCard("平台账号", `${accounts.items.filter((item) => item.status === "connected").length}/${accounts.items.length} 已连接`, "管理抖音、快手、视频号账号状态。", "accounts")}
      ${renderConfigCard("抖音授权", douyinStatus, "配置抖音开放平台应用，发起真实 OAuth 授权。", "douyin")}
      ${renderConfigCard("企业知识库", settings.knowledgeBase ? "已填写" : "未填写", "用于 AI 回复、脚本生成和客服建议。", "knowledge")}
      ${renderConfigCard("脚本/分镜模型", `${settings.textProvider.providerName} · ${settings.textProvider.configured ? "可用" : "未配置"}`, "DeepSeek、豆包、OpenAI 或本地规则。", "text")}
      ${renderConfigCard("配音模型", `${settings.voiceProvider.providerName} · ${settings.voiceProvider.configured ? "可用" : "未配置"}`, "控制 AI 配音和拟人化声音。", "voice")}
      ${renderConfigCard("视频生成供应商", `${settings.videoProvider.providerName} · ${settings.videoProvider.configured ? "可用" : "未配置"}`, "控制真实 AI 镜头视频生成。", "video")}
    </div>
  `;
};

function renderConfigCard(title, status, desc, type) {
  const ok = !status.includes("未");
  return `
    <div class="config-card">
      <div class="card-headline">
        <h3>${escapeHtml(title)}</h3>
        <span class="provider-status ${ok ? "configured" : "missing"}">${escapeHtml(status)}</span>
      </div>
      <p>${escapeHtml(desc)}</p>
      <button class="btn" data-open-setting="${type}" type="button">配置</button>
    </div>
  `;
}

function openSettingPanel(type) {
  if (!activeSettingsData) return;
  const { accounts, settings, douyin, users } = activeSettingsData;
  const provider = settings.videoProvider;
  const textProvider = settings.textProvider;
  const voiceProvider = settings.voiceProvider;
  const panels = {
    users: {
      title: "用户权限与额度",
      body: session.role === "admin" ? renderUserAccessPanel(users?.items || []) : `
        <div class="notice-card">当前账号由管理员统一设置使用期限和功能额度。</div>
        ${renderQuotaSummary(session)}
        <div class="quota-overview">${quotaItems(session.quota).map(renderQuotaMeter).join("")}</div>
      `
    },
    accounts: {
      title: "平台账号管理",
      body: `
        ${accounts.items.map((item) => {
          const [icon, color] = iconForPlatform(item.platform);
          return `<div class="account-item"><div class="account-info"><div class="account-icon" style="background:${color};">${icon}</div><div class="account-details"><h4>${escapeHtml(item.platformName)}</h4><p>${item.status === "connected" ? `账号ID: ${escapeHtml(item.accountName)}` : "未绑定"}</p></div></div><button class="status-badge ${item.status}" data-toggle-account="${item.id}" type="button">${item.status === "connected" ? "已连接" : "未连接"}</button></div>`;
        }).join("")}
        <button id="addAccountButton" class="add-account-btn" type="button">+ 添加新平台账号</button>
      `
    },
    knowledge: {
      title: "企业知识库",
      body: `<div class="form-group"><label class="form-label">企业知识库</label><textarea id="knowledgeBase" class="form-textarea" placeholder="输入企业产品信息、常见问题等。">${escapeHtml(settings.knowledgeBase || "")}</textarea></div><div class="modal-actions"><button class="btn" id="saveKnowledgeButton" type="button">保存设置</button></div>`
    },
    douyin: {
      title: "抖音真实授权",
      body: `
        <div class="provider-status ${douyin?.authorized ? "configured" : "missing"}">
          ${douyin?.authorized ? `已授权 · ${escapeHtml(douyin.account?.nickname || douyin.openIdMasked || "抖音账号")}` : douyin?.configured ? "应用已配置，等待扫码授权" : "未配置抖音应用"}
        </div>
        <div class="notice-card">回调地址必须与抖音开放平台后台配置完全一致。本地默认地址为 <strong>${escapeHtml(douyin?.redirectUri || "")}</strong>；如官方后台不支持本地回调，需要使用公网 HTTPS 地址并反向代理到本机。</div>
        <div class="settings-two-col">
          <div class="form-group">
            <label class="form-label">ClientKey / AppKey</label>
            <input id="douyinClientKey" class="form-input" value="${escapeHtml(douyin?.clientKey || "")}" placeholder="请输入抖音开放平台 ClientKey">
          </div>
          <div class="form-group">
            <label class="form-label">ClientSecret / AppSecret</label>
            <input id="douyinClientSecret" class="form-input" type="password" placeholder="${douyin?.clientSecretSaved ? "已保存，留空不修改" : "请输入 ClientSecret"}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">授权回调地址</label>
          <input id="douyinRedirectUri" class="form-input" value="${escapeHtml(douyin?.redirectUri || "")}">
        </div>
        <div class="settings-two-col">
          <div class="form-group">
            <label class="form-label">Scope</label>
            <input id="douyinScope" class="form-input" value="${escapeHtml(douyin?.scope || "user_info")}">
          </div>
          <div class="form-group">
            <label class="form-label">Optional Scope</label>
            <input id="douyinOptionalScope" class="form-input" value="${escapeHtml(douyin?.optionalScope || "")}" placeholder="可选">
          </div>
        </div>
        <div class="code-strip">
          <div class="code-item"><span>授权状态</span><strong>${douyin?.authorized ? "已授权" : "未授权"}</strong></div>
          <div class="code-item"><span>OpenID</span><strong>${escapeHtml(douyin?.openIdMasked || "暂无")}</strong></div>
          <div class="code-item"><span>Token 到期</span><strong>${escapeHtml(douyin?.expiresAt || "暂无")}</strong></div>
        </div>
        ${douyin?.lastError ? `<div class="notice-card">${escapeHtml(douyin.lastError)}</div>` : ""}
        <div class="provider-actions">
          <label class="clear-secret-check"><input id="clearDouyinSecrets" type="checkbox"> 清空密钥和授权</label>
          <div class="review-actions">
            <button class="filter-tab" id="saveDouyinConfigButton" type="button">保存配置</button>
            <button class="btn" id="startDouyinOAuthButton" type="button">打开抖音授权</button>
            <button class="filter-tab" id="syncDouyinAccountButton" type="button">同步账号</button>
            <button class="filter-tab" id="refreshDouyinTokenButton" type="button">刷新 Token</button>
            <button class="filter-tab" id="disconnectDouyinButton" type="button">断开授权</button>
          </div>
        </div>
      `
    },
    text: {
      title: "脚本/分镜模型",
      body: `<div class="provider-status ${textProvider.configured ? "configured" : "missing"}">${escapeHtml(textProvider.providerName)} · ${textProvider.configured ? "已配置" : "未配置"}</div><div class="form-group"><label class="form-label">模型供应商</label><select id="textProviderSelect" class="form-select">${settings.textProviderOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === textProvider.provider ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></div><div id="textProviderSecretFields"><div class="form-group"><label class="form-label">API Key</label><input id="textApiKey" class="form-input" type="password" placeholder="${textProvider.apiKeySaved ? "已保存，留空不修改" : "请输入 API Key"}"></div></div><div class="settings-two-col"><div class="form-group"><label class="form-label">模型</label><input id="textModel" class="form-input" value="${escapeHtml(textProvider.model)}"></div><div class="form-group"><label class="form-label">温度</label><input id="textTemperature" class="form-input" type="number" min="0" max="2" step="0.1" value="${textProvider.temperature}"></div></div><div class="form-group"><label class="form-label">Endpoint</label><input id="textEndpoint" class="form-input" value="${escapeHtml(textProvider.endpoint || "")}"></div><div class="provider-actions"><label class="clear-secret-check"><input id="clearTextSecrets" type="checkbox"> 清空已保存密钥</label><button id="saveTextProviderButton" class="btn" type="button">保存脚本模型</button></div>`
    },
    voice: {
      title: "配音模型",
      body: `<div class="provider-status ${voiceProvider.configured ? "configured" : "missing"}">${escapeHtml(voiceProvider.providerName)} · ${voiceProvider.configured ? "已配置" : "未配置"}</div><div class="form-group"><label class="form-label">配音供应商</label><select id="voiceProviderSelect" class="form-select">${settings.voiceProviderOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === voiceProvider.provider ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></div><div id="voiceProviderSecretFields"><div class="form-group"><label class="form-label">API Key</label><input id="voiceApiKey" class="form-input" type="password" placeholder="${voiceProvider.apiKeySaved ? "已保存，留空不修改" : "请输入 API Key"}"></div></div><div class="settings-two-col"><div class="form-group"><label class="form-label">模型</label><input id="voiceModel" class="form-input" value="${escapeHtml(voiceProvider.model)}"></div><div class="form-group"><label class="form-label">Voice</label><input id="voiceCode" class="form-input" value="${escapeHtml(voiceProvider.voice)}"></div></div><div class="settings-two-col" id="voiceDoubaoFields"><div class="form-group"><label class="form-label">App ID</label><input id="voiceAppId" class="form-input" value="${escapeHtml(voiceProvider.appId || "")}"></div><div class="form-group"><label class="form-label">Cluster</label><input id="voiceCluster" class="form-input" value="${escapeHtml(voiceProvider.cluster || "")}"></div></div><div class="form-group"><label class="form-label">Endpoint</label><input id="voiceEndpoint" class="form-input" value="${escapeHtml(voiceProvider.endpoint || "")}"></div><div class="provider-actions"><label class="clear-secret-check"><input id="clearVoiceSecrets" type="checkbox"> 清空已保存密钥</label><button id="saveVoiceProviderButton" class="btn" type="button">保存配音模型</button></div>`
    },
    video: {
      title: "视频生成供应商",
      body: `<div class="provider-status ${provider.configured ? "configured" : "missing"}">${escapeHtml(provider.providerName)} · ${provider.configured ? "已配置" : "未配置"}</div><div class="form-group"><label class="form-label">供应商</label><select id="videoProviderSelect" class="form-select">${settings.videoProviderOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === provider.provider ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></div><div class="provider-fields" id="apiKeyFields"><div class="form-group"><label class="form-label">API Key</label><input id="videoApiKey" class="form-input" type="password" placeholder="${provider.apiKeySaved ? "已保存，留空不修改" : "请输入 API Key"}"></div></div><div class="provider-fields" id="akskFields"><div class="form-group"><label class="form-label">Access Key</label><input id="videoAccessKey" class="form-input" type="password" placeholder="${provider.accessKeySaved ? "已保存，留空不修改" : "请输入 Access Key"}"></div><div class="form-group"><label class="form-label">Secret Key</label><input id="videoSecretKey" class="form-input" type="password" placeholder="${provider.secretKeySaved ? "已保存，留空不修改" : "请输入 Secret Key"}"></div></div><div class="settings-two-col"><div class="form-group"><label class="form-label">模型</label><select id="videoModel" class="form-select"></select><input id="customVideoModel" class="form-input custom-model-input hidden" placeholder="输入官方模型 ID"></div><div class="form-group"><label class="form-label">尺寸</label><select id="videoSize" class="form-select">${["1280x720", "720x1280", "1024x1024"].map((size) => `<option ${size === provider.size ? "selected" : ""}>${size}</option>`).join("")}</select></div></div><div class="settings-two-col"><div class="form-group"><label class="form-label">区域</label><input id="videoRegion" class="form-input" value="${escapeHtml(provider.region || "")}"></div><div class="form-group"><label class="form-label">Endpoint</label><input id="videoEndpoint" class="form-input" value="${escapeHtml(provider.endpoint || "")}"></div></div><div class="provider-actions"><label class="clear-secret-check"><input id="clearVideoSecrets" type="checkbox"> 清空已保存密钥</label><button id="saveVideoProviderButton" class="btn" type="button">保存视频供应商</button></div>`
    }
  };
  const panel = panels[type];
  if (!panel) return;
  openAppModal(panel.title, panel.body, { wide: ["accounts", "users", "video"].includes(type) });
  bindSettingPanelEvents(type, settings, provider);
}

function bindSettingPanelEvents(type, settings, provider) {
  document.querySelectorAll("[data-save-user-access]").forEach((button) => {
    button.addEventListener("click", () => saveUserAccess(button.dataset.saveUserAccess));
  });
  $("#addAccountButton")?.addEventListener("click", addAccount);
  $("#saveKnowledgeButton")?.addEventListener("click", saveKnowledge);
  $("#saveDouyinConfigButton")?.addEventListener("click", saveDouyinOAuthConfig);
  $("#startDouyinOAuthButton")?.addEventListener("click", startDouyinOAuth);
  $("#syncDouyinAccountButton")?.addEventListener("click", syncDouyinOAuth);
  $("#refreshDouyinTokenButton")?.addEventListener("click", refreshDouyinOAuth);
  $("#disconnectDouyinButton")?.addEventListener("click", disconnectDouyinOAuth);
  $("#textProviderSelect")?.addEventListener("change", () => updateTextProviderSelection(settings.textProviderOptions));
  $("#saveTextProviderButton")?.addEventListener("click", saveTextProvider);
  $("#voiceProviderSelect")?.addEventListener("change", () => updateVoiceProviderSelection(settings.voiceProviderOptions));
  $("#saveVoiceProviderButton")?.addEventListener("click", saveVoiceProvider);
  $("#videoProviderSelect")?.addEventListener("change", () => updateProviderFieldVisibility());
  $("#videoModel")?.addEventListener("change", syncCustomVideoModelVisibility);
  $("#saveVideoProviderButton")?.addEventListener("click", saveVideoProvider);
  if (type === "text") updateTextProviderFieldVisibility();
  if (type === "voice") updateVoiceProviderFieldVisibility();
  if (type === "video") updateProviderFieldVisibility(provider.model);
}

async function saveUserAccess(userId) {
  const quotas = {};
  document.querySelectorAll(`[data-user-quota-limit="${userId}"]`).forEach((input) => {
    quotas[input.dataset.quotaKey] = { limit: input.value };
  });
  const result = await api("/api/users/access", {
    method: "POST",
    body: JSON.stringify({
      userId,
      enabled: document.querySelector(`[data-user-enabled="${userId}"]`)?.checked,
      expiresAt: document.querySelector(`[data-user-expires="${userId}"]`)?.value,
      quotas
    })
  });
  await refreshSession({ navigate: false });
  await renderSettings();
  activeSettingsData.users = await api("/api/users");
  openSettingPanel("users");
  setStatus(`${result.item.displayName} 权限与额度已保存`);
}

showPage = async function(pageId) {
  const merchantPages = new Set(["operations", "products", "creators", "publishing", "orders", "finance", "team", "merchant"]);
  if (merchantPages.has(pageId) && session.userType !== "merchant") {
    setStatus("个人用户暂不显示商户经营模块");
    pageId = "dashboard";
  }
  closeAppModal();
  destroyChart();
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === pageId));
  $("#pageTitle").textContent = pageTitles[pageId] || "AI员工系统";
  setStatus("正在加载");
  if (pageId === "dashboard") await renderDashboard();
  if (pageId === "content") await renderContent();
  if (pageId === "aivideo") await renderAiVideo();
  if (pageId === "products") await renderProducts();
  if (pageId === "creators") await renderCreators();
  if (pageId === "publishing") await renderPublishing();
  if (pageId === "messages") await renderMessages();
  if (pageId === "live") await renderLive();
  if (pageId === "sales") await renderSales();
  if (pageId === "operations") await renderOperations();
  if (pageId === "orders") await renderOrders();
  if (pageId === "finance") await renderFinance();
  if (pageId === "team") await renderTeam();
  if (pageId === "merchant") await renderMerchantOnboarding();
  if (pageId === "settings") await renderSettings();
  setStatus("已加载");
};

saveVideoProvider = async function() {
  const result = await api("/api/settings/video-provider", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#videoProviderSelect").value,
      apiKey: $("#videoApiKey").value,
      accessKey: $("#videoAccessKey").value,
      secretKey: $("#videoSecretKey").value,
      model: selectedVideoModel(),
      size: $("#videoSize").value,
      region: $("#videoRegion").value,
      endpoint: $("#videoEndpoint").value,
      clearSecrets: $("#clearVideoSecrets").checked
    })
  });
  closeAppModal();
  await renderSettings();
  setStatus(`${result.item.providerName} 视频生成配置已保存`);
};

saveTextProvider = async function() {
  const result = await api("/api/settings/text-provider", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#textProviderSelect").value,
      apiKey: $("#textApiKey").value,
      model: $("#textModel").value,
      endpoint: $("#textEndpoint").value,
      temperature: $("#textTemperature").value,
      clearSecrets: $("#clearTextSecrets").checked
    })
  });
  closeAppModal();
  await renderSettings();
  setStatus(`${result.item.providerName} 脚本模型配置已保存`);
};

saveVoiceProvider = async function() {
  const result = await api("/api/settings/voice-provider", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#voiceProviderSelect").value,
      apiKey: $("#voiceApiKey").value,
      model: $("#voiceModel").value,
      endpoint: $("#voiceEndpoint").value,
      voice: $("#voiceCode").value,
      appId: $("#voiceAppId").value,
      cluster: $("#voiceCluster").value,
      clearSecrets: $("#clearVoiceSecrets").checked
    })
  });
  closeAppModal();
  await renderSettings();
  setStatus(`${result.item.providerName} 配音模型配置已保存`);
};

saveKnowledge = async function() {
  await api("/api/settings/knowledge-base", {
    method: "POST",
    body: JSON.stringify({ knowledgeBase: $("#knowledgeBase").value })
  });
  closeAppModal();
  await renderSettings();
  setStatus("AI设置已保存");
};

async function saveDouyinOAuthConfig() {
  const result = await api("/api/douyin/oauth/config", {
    method: "POST",
    body: JSON.stringify({
      clientKey: $("#douyinClientKey")?.value,
      clientSecret: $("#douyinClientSecret")?.value,
      redirectUri: $("#douyinRedirectUri")?.value,
      scope: $("#douyinScope")?.value,
      optionalScope: $("#douyinOptionalScope")?.value,
      clearSecrets: $("#clearDouyinSecrets")?.checked
    })
  });
  activeSettingsData.douyin = result.item;
  setStatus("抖音应用配置已保存");
  openSettingPanel("douyin");
}

async function startDouyinOAuth() {
  await saveDouyinOAuthConfig();
  const result = await api("/api/douyin/oauth/authorize-url", { method: "POST", body: JSON.stringify({}) });
  window.open(result.item.authorizeUrl, "douyin_oauth", "width=960,height=720");
  setStatus("已打开抖音授权窗口，完成扫码后会自动刷新状态");
}

async function syncDouyinOAuth() {
  const result = await api("/api/douyin/oauth/sync", { method: "POST", body: JSON.stringify({}) });
  activeSettingsData.douyin = result.item;
  await renderSettings();
  setStatus("抖音账号信息已同步");
}

async function refreshDouyinOAuth() {
  const result = await api("/api/douyin/oauth/refresh", { method: "POST", body: JSON.stringify({}) });
  activeSettingsData.douyin = result.item;
  openSettingPanel("douyin");
  setStatus("抖音 access_token 已刷新");
}

async function disconnectDouyinOAuth() {
  const result = await api("/api/douyin/oauth/disconnect", {
    method: "POST",
    body: JSON.stringify({ clearConfig: $("#clearDouyinSecrets")?.checked })
  });
  activeSettingsData.douyin = result.item;
  await renderSettings();
  setStatus("抖音授权已断开");
}

window.addEventListener("message", (event) => {
  if (!event.data || !String(event.data.type || "").startsWith("douyin-oauth-")) return;
  renderSettings()
    .then(() => setStatus(event.data.type === "douyin-oauth-success" ? "抖音授权成功" : "抖音授权失败，请查看回调窗口"))
    .catch((error) => setStatus(error.message));
});

document.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-app-modal]")) {
    closeAppModal();
    return;
  }
  if (event.target.closest("[data-save-script]")) {
    saveScriptEditor();
    return;
  }
  const saveShot = event.target.closest("[data-save-shot]");
  if (saveShot) {
    saveShotEditor(saveShot.dataset.saveShot);
    return;
  }
  const viewContent = event.target.closest("[data-view-content]");
  if (viewContent) {
    openContentDetail(viewContent.dataset.viewContent);
    return;
  }
  const productDetail = event.target.closest("[data-product-detail]");
  if (productDetail) {
    openProductDetail(productDetail.dataset.productDetail).catch((error) => setStatus(error.message));
    return;
  }
  const creatorDetail = event.target.closest("[data-creator-detail]");
  if (creatorDetail) {
    openCreatorDetail(creatorDetail.dataset.creatorDetail).catch((error) => setStatus(error.message));
    return;
  }
  const cooperation = event.target.closest("[data-start-cooperation]");
  if (cooperation) {
    startCreatorCooperation(cooperation.dataset.startCooperation).catch((error) => setStatus(error.message));
    return;
  }
  const editCustomer = event.target.closest("[data-edit-customer]");
  if (editCustomer) {
    openCustomerDetail(editCustomer.dataset.editCustomer);
    return;
  }
  const saveCustomer = event.target.closest("[data-save-customer]");
  if (saveCustomer) {
    saveCustomerProfile(saveCustomer.dataset.saveCustomer).catch((error) => setStatus(error.message));
    return;
  }
  if (event.target.closest("[data-open-broadcast]")) {
    openBroadcastPreview();
    return;
  }
  if (event.target.closest("[data-open-publish-plan]")) {
    openPublishPlanModal();
    return;
  }
  if (event.target.closest("[data-save-publish-plan]")) {
    savePublishPlan().catch((error) => setStatus(error.message));
    return;
  }
  const orderDetail = event.target.closest("[data-order-detail]");
  if (orderDetail) {
    openOrderDetail(orderDetail.dataset.orderDetail).catch((error) => setStatus(error.message));
    return;
  }
  const shipOrderButton = event.target.closest("[data-ship-order]");
  if (shipOrderButton) {
    shipOrder(shipOrderButton.dataset.shipOrder).catch((error) => setStatus(error.message));
    return;
  }
  const settingButton = event.target.closest("[data-open-setting]");
  if (settingButton) {
    openSettingPanel(settingButton.dataset.openSetting);
    return;
  }
  if (event.target.closest("[data-open-permissions]")) {
    openPermissionHelp();
  }
});

// 最终页面覆盖层：把旧原型中的分散页面收束为当前产品的业务闭环。
const allPlatformCodes = ["douyin", "kuaishou", "wechat_channel", "xiaohongshu"];

function platformBadge(code) {
  const [icon, color] = iconForPlatform(code);
  return `<span class="platform-chip" style="border-color:${color}; color:${color};">${icon} ${escapeHtml(platformName(code))}</span>`;
}

async function loadSettingsData() {
  const accounts = await api("/api/accounts");
  const settings = await api("/api/settings");
  const douyin = await api("/api/douyin/oauth/status");
  const users = session.role === "admin" ? await api("/api/users") : null;
  activeSettingsData = { accounts, settings, douyin, users };
  videoProviderOptionsCache = settings.videoProviderOptions;
  return activeSettingsData;
}

updateHeaderSession = function() {
  const loggedIn = Boolean(session.userType);
  $("#userTypeBadge").textContent = loggedIn
    ? `${session.displayName || userTypeLabel(session.userType)} · ${roleLabel(session.role)}`
    : "未登录";
  const avatar = $("#avatarMenuButton");
  if (avatar) avatar.textContent = loggedIn ? String(session.displayName || session.username || "U").slice(0, 1).toUpperCase() : "U";
  const quotaSummary = $("#quotaSummary");
  if (!quotaSummary) return;
  quotaSummary.classList.toggle("hidden", !loggedIn);
  quotaSummary.innerHTML = loggedIn ? `<span>到期 ${escapeHtml(session.expiresAt || "未设置")}</span>${renderQuotaPills(session)}` : "";
};

function openSettingsOverview() {
  if (!activeSettingsData) return;
  const { accounts, settings, douyin, users } = activeSettingsData;
  const douyinStatus = douyin.authorized ? "已授权" : douyin.configured ? "已配置待授权" : "未配置";
  openAppModal("系统配置", `
    <div class="config-overview-grid compact-config-grid">
      ${renderConfigCard("用户权限与额度", session.role === "admin" ? `${users?.items.length || 0} 个账号` : "当前账号", "配置使用期限、启停状态和功能额度。", "users")}
      ${renderConfigCard("平台账号", `${accounts.items.filter((item) => item.status === "connected").length}/${accounts.items.length} 已连接`, "管理各平台账号连接状态。", "accounts")}
      ${renderConfigCard("抖音授权", douyinStatus, "配置抖音开放平台应用和 OAuth。", "douyin")}
      ${renderConfigCard("客户AI回复", settings.customerAi?.enabled ? "已启用" : "未启用", "单独控制客户管理页的AI回复策略。", "customerAi")}
      ${renderConfigCard("企业知识库", settings.knowledgeBase ? "已填写" : "未填写", "用于脚本生成和客户回复。", "knowledge")}
      ${renderConfigCard("脚本/分镜模型", `${settings.textProvider.providerName} · ${settings.textProvider.configured ? "可用" : "未配置"}`, "DeepSeek、豆包、OpenAI 或本地规则。", "text")}
      ${renderConfigCard("配音模型", `${settings.voiceProvider.providerName} · ${settings.voiceProvider.configured ? "可用" : "未配置"}`, "控制拟人化AI配音。", "voice")}
      ${renderConfigCard("视频生成供应商", `${settings.videoProvider.providerName} · ${settings.videoProvider.configured ? "可用" : "未配置"}`, "控制真实AI镜头视频生成。", "video")}
    </div>
  `, { wide: true });
}

async function openAiVideoConfigOverview() {
  const { settings } = await loadSettingsData();
  openAppModal("AI视频模型配置", `
    <div class="config-overview-grid compact-config-grid">
      ${renderConfigCard("脚本/分镜模型", `${settings.textProvider.providerName} · ${settings.textProvider.configured ? "可用" : "未配置"}`, "用于生成脚本、镜头、分镜与文案。", "text")}
      ${renderConfigCard("配音模型", `${settings.voiceProvider.providerName} · ${settings.voiceProvider.configured ? "可用" : "未配置"}`, "用于生成更拟人化的旁白语音。", "voice")}
      ${renderConfigCard("视频生成供应商", `${settings.videoProvider.providerName} · ${settings.videoProvider.configured ? "可用" : "未配置"}`, "用于生成真实镜头视频内容。", "video")}
    </div>
  `, { wide: true });
}

renderSettings = async function() {
  await loadSettingsData();
  openSettingsOverview();
};

openSettingPanel = function(type) {
  loadSettingsData()
    .then(({ accounts, settings, douyin, users }) => {
      const provider = settings.videoProvider;
      const textProvider = settings.textProvider;
      const voiceProvider = settings.voiceProvider;
      const customerAi = settings.customerAi || {};
      const panels = {
        users: {
          title: "用户权限与额度",
          wide: true,
          body: session.role === "admin" ? renderUserAccessPanel(users?.items || []) : `
            <div class="notice-card">当前账号由管理员统一设置使用期限和功能额度。</div>
            ${renderQuotaSummary(session)}
            <div class="quota-overview">${quotaItems(session.quota).map(renderQuotaMeter).join("")}</div>
          `
        },
        accounts: {
          title: "平台账号管理",
          wide: true,
          body: `
            ${accounts.items.map((item) => {
              const [icon, color] = iconForPlatform(item.platform);
              return `<div class="account-item"><div class="account-info"><div class="account-icon" style="background:${color};">${icon}</div><div class="account-details"><h4>${escapeHtml(item.platformName)}</h4><p>${item.status === "connected" ? `账号ID: ${escapeHtml(item.accountName)}` : "未绑定"}</p></div></div><button class="status-badge ${item.status}" data-toggle-account="${item.id}" type="button">${item.status === "connected" ? "已连接" : "未连接"}</button></div>`;
            }).join("")}
            <button id="addAccountButton" class="add-account-btn" type="button">+ 添加新平台账号</button>
          `
        },
        knowledge: {
          title: "企业知识库",
          body: `<div class="form-group"><label class="form-label">企业知识库</label><textarea id="knowledgeBase" class="form-textarea" placeholder="输入企业产品信息、常见问题等。">${escapeHtml(settings.knowledgeBase || "")}</textarea></div><div class="modal-actions"><button class="btn" id="saveKnowledgeButton" type="button">保存设置</button></div>`
        },
        customerAi: {
          title: "客户管理AI配置",
          wide: true,
          body: `
            <div class="notice-card">该配置只影响客户管理页的AI建议、自动回复和平台同步策略。</div>
            <label class="modal-check"><input id="customerAiEnabled" type="checkbox" ${customerAi.enabled ? "checked" : ""}><span><strong>启用客户AI自动回复</strong><small>开启后会按配置生成回复建议，发送时同步到对应平台状态。</small></span></label>
            <label class="modal-check"><input id="customerAiPlatformSync" type="checkbox" ${customerAi.platformSync ? "checked" : ""}><span><strong>回复同步到对应平台</strong><small>本地闭环会记录平台同步状态，真实同步依赖平台账号授权。</small></span></label>
            <div class="settings-two-col">
              <div class="form-group"><label class="form-label">回复模型来源</label><select id="customerAiProvider" class="form-select"><option value="textProvider" ${customerAi.provider === "textProvider" ? "selected" : ""}>使用脚本/分镜模型配置</option><option value="local" ${customerAi.provider === "local" ? "selected" : ""}>本地规则</option></select></div>
              <div class="form-group"><label class="form-label">延迟秒数</label><input id="customerAiDelay" class="form-input" type="number" min="0" value="${escapeHtml(customerAi.replyDelaySeconds ?? 8)}"></div>
            </div>
            <div class="form-group"><label class="form-label">回复语气</label><input id="customerAiTone" class="form-input" value="${escapeHtml(customerAi.tone || "")}"></div>
            <div class="form-group"><label class="form-label">转人工关键词</label><input id="customerAiKeywords" class="form-input" value="${escapeHtml(customerAi.escalationKeywords || "")}" placeholder="投诉,退款,差评"></div>
            <div class="form-group"><label class="form-label">兜底回复</label><textarea id="customerAiFallback" class="form-textarea">${escapeHtml(customerAi.fallbackReply || "")}</textarea></div>
            <div class="modal-actions"><button class="btn" id="saveCustomerAiButton" type="button">保存客户AI配置</button></div>
          `
        },
        douyin: {
          title: "抖音真实授权",
          wide: true,
          body: `
            <div class="provider-status ${douyin?.authorized ? "configured" : "missing"}">${douyin?.authorized ? `已授权 · ${escapeHtml(douyin.account?.nickname || douyin.openIdMasked || "抖音账号")}` : douyin?.configured ? "应用已配置，等待扫码授权" : "未配置抖音应用"}</div>
            <div class="notice-card">回调地址必须与抖音开放平台后台配置完全一致。本地默认地址为 <strong>${escapeHtml(douyin?.redirectUri || "")}</strong>。</div>
            <div class="settings-two-col">
              <div class="form-group"><label class="form-label">ClientKey / AppKey</label><input id="douyinClientKey" class="form-input" value="${escapeHtml(douyin?.clientKey || "")}"></div>
              <div class="form-group"><label class="form-label">ClientSecret / AppSecret</label><input id="douyinClientSecret" class="form-input" type="password" placeholder="${douyin?.clientSecretSaved ? "已保存，留空不修改" : "请输入 ClientSecret"}"></div>
            </div>
            <div class="form-group"><label class="form-label">授权回调地址</label><input id="douyinRedirectUri" class="form-input" value="${escapeHtml(douyin?.redirectUri || "")}"></div>
            <div class="settings-two-col">
              <div class="form-group"><label class="form-label">Scope</label><input id="douyinScope" class="form-input" value="${escapeHtml(douyin?.scope || "user_info")}"></div>
              <div class="form-group"><label class="form-label">Optional Scope</label><input id="douyinOptionalScope" class="form-input" value="${escapeHtml(douyin?.optionalScope || "")}"></div>
            </div>
            <div class="code-strip"><div class="code-item"><span>授权状态</span><strong>${douyin?.authorized ? "已授权" : "未授权"}</strong></div><div class="code-item"><span>OpenID</span><strong>${escapeHtml(douyin?.openIdMasked || "暂无")}</strong></div><div class="code-item"><span>Token 到期</span><strong>${escapeHtml(douyin?.expiresAt || "暂无")}</strong></div></div>
            ${douyin?.lastError ? `<div class="notice-card">${escapeHtml(douyin.lastError)}</div>` : ""}
            <div class="provider-actions"><label class="clear-secret-check"><input id="clearDouyinSecrets" type="checkbox"> 清空密钥和授权</label><div class="review-actions"><button class="filter-tab" id="saveDouyinConfigButton" type="button">保存配置</button><button class="btn" id="startDouyinOAuthButton" type="button">打开抖音授权</button><button class="filter-tab" id="syncDouyinAccountButton" type="button">同步账号</button><button class="filter-tab" id="refreshDouyinTokenButton" type="button">刷新 Token</button><button class="filter-tab" id="disconnectDouyinButton" type="button">断开授权</button></div></div>
          `
        },
        text: {
          title: "脚本/分镜模型",
          body: `<div class="provider-status ${textProvider.configured ? "configured" : "missing"}">${escapeHtml(textProvider.providerName)} · ${textProvider.configured ? "已配置" : "未配置"}</div><div class="form-group"><label class="form-label">模型供应商</label><select id="textProviderSelect" class="form-select">${settings.textProviderOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === textProvider.provider ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></div><div id="textProviderSecretFields"><div class="form-group"><label class="form-label">API Key</label><input id="textApiKey" class="form-input" type="password" placeholder="${textProvider.apiKeySaved ? "已保存，留空不修改" : "请输入 API Key"}"></div></div><div class="settings-two-col"><div class="form-group"><label class="form-label">模型</label><input id="textModel" class="form-input" value="${escapeHtml(textProvider.model)}"></div><div class="form-group"><label class="form-label">温度</label><input id="textTemperature" class="form-input" type="number" min="0" max="2" step="0.1" value="${textProvider.temperature}"></div></div><div class="form-group"><label class="form-label">Endpoint</label><input id="textEndpoint" class="form-input" value="${escapeHtml(textProvider.endpoint || "")}"></div><div class="provider-actions"><label class="clear-secret-check"><input id="clearTextSecrets" type="checkbox"> 清空已保存密钥</label><button id="saveTextProviderButton" class="btn" type="button">保存脚本模型</button></div>`
        },
        voice: {
          title: "配音模型",
          body: `<div class="provider-status ${voiceProvider.configured ? "configured" : "missing"}">${escapeHtml(voiceProvider.providerName)} · ${voiceProvider.configured ? "已配置" : "未配置"}</div><div class="form-group"><label class="form-label">配音供应商</label><select id="voiceProviderSelect" class="form-select">${settings.voiceProviderOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === voiceProvider.provider ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></div><div id="voiceProviderSecretFields"><div class="form-group"><label class="form-label">API Key</label><input id="voiceApiKey" class="form-input" type="password" placeholder="${voiceProvider.apiKeySaved ? "已保存，留空不修改" : "请输入 API Key"}"></div></div><div class="settings-two-col"><div class="form-group"><label class="form-label">模型</label><input id="voiceModel" class="form-input" value="${escapeHtml(voiceProvider.model)}"></div><div class="form-group"><label class="form-label">Voice</label><input id="voiceCode" class="form-input" value="${escapeHtml(voiceProvider.voice)}"></div></div><div class="settings-two-col" id="voiceDoubaoFields"><div class="form-group"><label class="form-label">App ID</label><input id="voiceAppId" class="form-input" value="${escapeHtml(voiceProvider.appId || "")}"></div><div class="form-group"><label class="form-label">Cluster</label><input id="voiceCluster" class="form-input" value="${escapeHtml(voiceProvider.cluster || "")}"></div></div><div class="form-group"><label class="form-label">Endpoint</label><input id="voiceEndpoint" class="form-input" value="${escapeHtml(voiceProvider.endpoint || "")}"></div><div class="provider-actions"><label class="clear-secret-check"><input id="clearVoiceSecrets" type="checkbox"> 清空已保存密钥</label><button id="saveVoiceProviderButton" class="btn" type="button">保存配音模型</button></div>`
        },
        video: {
          title: "视频生成供应商",
          wide: true,
          body: `<div class="provider-status ${provider.configured ? "configured" : "missing"}">${escapeHtml(provider.providerName)} · ${provider.configured ? "已配置" : "未配置"}</div><div class="form-group"><label class="form-label">供应商</label><select id="videoProviderSelect" class="form-select">${settings.videoProviderOptions.map((item) => `<option value="${escapeHtml(item.value)}" ${item.value === provider.provider ? "selected" : ""}>${escapeHtml(item.label)}</option>`).join("")}</select></div><div class="provider-fields" id="apiKeyFields"><div class="form-group"><label class="form-label">API Key</label><input id="videoApiKey" class="form-input" type="password" placeholder="${provider.apiKeySaved ? "已保存，留空不修改" : "请输入 API Key"}"></div></div><div class="provider-fields" id="akskFields"><div class="form-group"><label class="form-label">Access Key</label><input id="videoAccessKey" class="form-input" type="password" placeholder="${provider.accessKeySaved ? "已保存，留空不修改" : "请输入 Access Key"}"></div><div class="form-group"><label class="form-label">Secret Key</label><input id="videoSecretKey" class="form-input" type="password" placeholder="${provider.secretKeySaved ? "已保存，留空不修改" : "请输入 Secret Key"}"></div></div><div class="settings-two-col"><div class="form-group"><label class="form-label">模型</label><select id="videoModel" class="form-select"></select><input id="customVideoModel" class="form-input custom-model-input hidden" placeholder="输入官方模型 ID"></div><div class="form-group"><label class="form-label">尺寸</label><select id="videoSize" class="form-select">${["1280x720", "720x1280", "1024x1024"].map((size) => `<option ${size === provider.size ? "selected" : ""}>${size}</option>`).join("")}</select></div></div><div class="settings-two-col"><div class="form-group"><label class="form-label">区域</label><input id="videoRegion" class="form-input" value="${escapeHtml(provider.region || "")}"></div><div class="form-group"><label class="form-label">Endpoint</label><input id="videoEndpoint" class="form-input" value="${escapeHtml(provider.endpoint || "")}"></div></div><div class="provider-actions"><label class="clear-secret-check"><input id="clearVideoSecrets" type="checkbox"> 清空已保存密钥</label><button id="saveVideoProviderButton" class="btn" type="button">保存视频供应商</button></div>`
        }
      };
      const panel = panels[type] || panels.accounts;
      openAppModal(panel.title, panel.body, { wide: Boolean(panel.wide) });
      bindSettingPanelEvents(type, settings, provider);
    })
    .catch((error) => setStatus(error.message));
};

bindSettingPanelEvents = function(type, settings, provider) {
  document.querySelectorAll("[data-save-user-access]").forEach((button) => {
    button.addEventListener("click", () => saveUserAccess(button.dataset.saveUserAccess));
  });
  $("#addAccountButton")?.addEventListener("click", addAccount);
  $("#saveKnowledgeButton")?.addEventListener("click", saveKnowledge);
  $("#saveCustomerAiButton")?.addEventListener("click", saveCustomerAiSettings);
  $("#saveDouyinConfigButton")?.addEventListener("click", saveDouyinOAuthConfig);
  $("#startDouyinOAuthButton")?.addEventListener("click", startDouyinOAuth);
  $("#syncDouyinAccountButton")?.addEventListener("click", syncDouyinOAuth);
  $("#refreshDouyinTokenButton")?.addEventListener("click", refreshDouyinOAuth);
  $("#disconnectDouyinButton")?.addEventListener("click", disconnectDouyinOAuth);
  $("#textProviderSelect")?.addEventListener("change", () => updateTextProviderSelection(settings.textProviderOptions));
  $("#saveTextProviderButton")?.addEventListener("click", saveTextProvider);
  $("#voiceProviderSelect")?.addEventListener("change", () => updateVoiceProviderSelection(settings.voiceProviderOptions));
  $("#saveVoiceProviderButton")?.addEventListener("click", saveVoiceProvider);
  $("#videoProviderSelect")?.addEventListener("change", () => updateProviderFieldVisibility());
  $("#videoModel")?.addEventListener("change", syncCustomVideoModelVisibility);
  $("#saveVideoProviderButton")?.addEventListener("click", saveVideoProvider);
  if (type === "text") updateTextProviderFieldVisibility();
  if (type === "voice") updateVoiceProviderFieldVisibility();
  if (type === "video") updateProviderFieldVisibility(provider.model);
};

async function saveCustomerAiSettings() {
  await api("/api/settings/customer-ai", {
    method: "POST",
    body: JSON.stringify({
      enabled: $("#customerAiEnabled")?.checked,
      platformSync: $("#customerAiPlatformSync")?.checked,
      provider: $("#customerAiProvider")?.value,
      replyDelaySeconds: $("#customerAiDelay")?.value,
      tone: $("#customerAiTone")?.value,
      escalationKeywords: $("#customerAiKeywords")?.value,
      fallbackReply: $("#customerAiFallback")?.value
    })
  });
  closeAppModal();
  await loadSettingsData();
  setStatus("客户AI回复配置已保存");
}

saveKnowledge = async function() {
  await api("/api/settings/knowledge-base", {
    method: "POST",
    body: JSON.stringify({ knowledgeBase: $("#knowledgeBase").value })
  });
  closeAppModal();
  await loadSettingsData();
  setStatus("企业知识库已保存");
};

saveUserAccess = async function(userId) {
  const quotas = {};
  document.querySelectorAll(`[data-user-quota-limit="${userId}"]`).forEach((input) => {
    quotas[input.dataset.quotaKey] = { limit: input.value };
  });
  const result = await api("/api/users/access", {
    method: "POST",
    body: JSON.stringify({
      userId,
      enabled: document.querySelector(`[data-user-enabled="${userId}"]`)?.checked,
      expiresAt: document.querySelector(`[data-user-expires="${userId}"]`)?.value,
      quotas
    })
  });
  await refreshSession({ navigate: false });
  await loadSettingsData();
  openSettingPanel("users");
  setStatus(`${result.item.displayName} 权限与额度已保存`);
};

saveVideoProvider = async function() {
  const result = await api("/api/settings/video-provider", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#videoProviderSelect").value,
      apiKey: $("#videoApiKey").value,
      accessKey: $("#videoAccessKey").value,
      secretKey: $("#videoSecretKey").value,
      model: selectedVideoModel(),
      size: $("#videoSize").value,
      region: $("#videoRegion").value,
      endpoint: $("#videoEndpoint").value,
      clearSecrets: $("#clearVideoSecrets").checked
    })
  });
  closeAppModal();
  await loadSettingsData();
  setStatus(`${result.item.providerName} 视频生成配置已保存`);
};

saveTextProvider = async function() {
  const result = await api("/api/settings/text-provider", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#textProviderSelect").value,
      apiKey: $("#textApiKey").value,
      model: $("#textModel").value,
      endpoint: $("#textEndpoint").value,
      temperature: $("#textTemperature").value,
      clearSecrets: $("#clearTextSecrets").checked
    })
  });
  closeAppModal();
  await loadSettingsData();
  setStatus(`${result.item.providerName} 脚本模型配置已保存`);
};

saveVoiceProvider = async function() {
  const result = await api("/api/settings/voice-provider", {
    method: "POST",
    body: JSON.stringify({
      provider: $("#voiceProviderSelect").value,
      apiKey: $("#voiceApiKey").value,
      model: $("#voiceModel").value,
      endpoint: $("#voiceEndpoint").value,
      voice: $("#voiceCode").value,
      appId: $("#voiceAppId").value,
      cluster: $("#voiceCluster").value,
      clearSecrets: $("#clearVoiceSecrets").checked
    })
  });
  closeAppModal();
  await loadSettingsData();
  setStatus(`${result.item.providerName} 配音模型配置已保存`);
};

function groupContentByPlatform(items = []) {
  return allPlatformCodes.map((platform) => ({
    platform,
    items: items.filter((item) => item.platform === platform)
  })).filter((group) => group.items.length);
}

renderContent = async function() {
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("全平台内容搜索", '<button class="filter-tab" data-page="publishing" type="button">发布计划</button>')}
    <div class="search-section compact-search">
      <div class="search-bar">
        <input id="contentKeyword" class="search-input" type="text" placeholder="搜索产品关键词，如：手套">
        <button id="contentSearchButton" class="btn" type="button">搜索最新内容</button>
      </div>
      <div class="filter-tabs" id="platformTabs">
        <button class="filter-tab active" data-platform="all" type="button">全部平台</button>
        ${allPlatformCodes.map((platform) => `<button class="filter-tab" data-platform="${platform}" type="button">${escapeHtml(platformName(platform))}</button>`).join("")}
      </div>
    </div>
    <div id="videoGrid" class="platform-content-groups"></div>
  `;
  $("#contentSearchButton").addEventListener("click", loadContentCards);
  $("#platformTabs").addEventListener("click", (event) => {
    const button = event.target.closest("[data-platform]");
    if (!button) return;
    document.querySelectorAll("#platformTabs .filter-tab").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    loadContentCards().catch((error) => setStatus(error.message));
  });
  await loadContentCards();
};

function renderContentPreviewItem(item) {
  return `
    <div class="content-preview-item">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.author)} · ${formatNumber(item.views)} 播放 · ${escapeHtml(item.duration)}</span>
      </div>
      <button class="action-btn" data-view-content="${item.id}" type="button">详情</button>
    </div>
  `;
}

function renderContentVideoCard(item) {
  return `
    <div class="video-card">
      <div class="video-thumbnail">▶<div class="video-duration">${escapeHtml(item.duration)}</div></div>
      <div class="video-info">
        <div class="video-title">${escapeHtml(item.title)}</div>
        <div class="video-meta"><span>${escapeHtml(item.author)}</span><span>${formatNumber(item.views)} 播放</span></div>
        <div class="video-actions">
          <button class="action-btn" data-view-content="${item.id}" type="button">详情</button>
          <button class="action-btn" data-copy="${encodeURIComponent(item.copy || item.title)}" type="button">提取文案</button>
        </div>
      </div>
    </div>
  `;
}

function openContentPlatform(platform) {
  const items = latestContentItems.filter((item) => item.platform === platform);
  if (!items.length) {
    setStatus("该平台暂无内容");
    return;
  }
  openAppModal(`${platformName(platform)}最新内容`, `
    <div class="content-modal-head">
      ${platformBadge(platform)}
      <strong>${items.length} 条内容</strong>
      <span>完整展示该平台返回的最新内容，点击详情可查看文案或带入 AI 视频生成。</span>
    </div>
    <div class="video-grid compact-video-grid modal-video-grid">
      ${items.map(renderContentVideoCard).join("")}
    </div>
  `, { wide: true });
}

loadContentCards = async function() {
  const platform = document.querySelector("#platformTabs .filter-tab.active")?.dataset.platform || "all";
  const keyword = $("#contentKeyword")?.value.trim() || "";
  const payload = await api(`/api/contents/latest?${new URLSearchParams({ platform, keyword }).toString()}`);
  await refreshSession({ navigate: false });
  latestContentItems = payload.items;
  const groups = groupContentByPlatform(payload.items);
  $("#videoGrid").innerHTML = groups.map((group) => {
    const totalViews = group.items.reduce((sum, item) => sum + Number(item.views || 0), 0);
    const topItem = [...group.items].sort((a, b) => Number(b.views || 0) - Number(a.views || 0))[0];
    return `
      <section class="platform-content-group content-platform-summary">
        <div class="group-head">
          <div>${platformBadge(group.platform)}<strong>${group.items.length} 条最新内容</strong></div>
          <button class="filter-tab" data-open-content-platform="${group.platform}" type="button">查看全部</button>
        </div>
        <div class="platform-analysis-grid">
          <div class="platform-analysis-cell"><strong>${formatNumber(totalViews)}</strong><span>累计播放</span></div>
          <div class="platform-analysis-cell"><strong>${topItem ? formatNumber(topItem.views) : "0"}</strong><span>最高播放</span></div>
          <div class="platform-analysis-cell"><strong>${escapeHtml(topItem?.duration || "--")}</strong><span>头部内容时长</span></div>
        </div>
        <div class="content-topline">
          <strong>${escapeHtml(topItem?.title || "暂无头部内容")}</strong>
          <span>${escapeHtml(topItem?.author || "")} ${topItem ? `· ${formatNumber(topItem.views)} 播放 · ${escapeHtml(topItem.duration)}` : ""}</span>
        </div>
      </section>
    `;
  }).join("") || '<div class="notice-card">暂无匹配内容。</div>';
};

renderOperations = async function() {
  const data = await api("/api/operations");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("经营分析", '<button class="filter-tab" data-page="finance" type="button">财务结算</button>')}
    <div class="stats-grid ops-stats">
      ${[
        { title: "GMV", value: formatMoney(data.metrics.gmv), change: "近30天", icon: "¥", bg: "#e8f5e9", color: "#27ae60" },
        { title: "订单数", value: formatNumber(data.metrics.orders), change: "近30天", icon: "单", bg: "#fff3e0", color: "#ff9800" },
        { title: "客单价", value: formatMoney(data.metrics.avgOrderValue), change: "整体", icon: "客", bg: "#e3f2fd", color: "#2196f3" },
        { title: "健康度", value: data.metrics.healthScore, change: "综合评分", icon: "分", bg: "#f3e5f5", color: "#9c27b0" }
      ].map((item) => `<div class="stat-card"><div class="stat-header"><span class="stat-title">${item.title}</span><div class="stat-icon" style="background:${item.bg}; color:${item.color};">${item.icon}</div></div><div class="stat-value">${item.value}</div><div class="stat-change">${item.change}</div></div>`).join("")}
    </div>
    <div class="ops-compact-grid">
      <div class="chart-card"><div class="chart-title">GMV趋势</div><canvas id="opsTrendChart" height="86"></canvas></div>
      <div class="chart-card ops-share-card"><div class="chart-title">平台占比</div><canvas id="opsShareChart" height="86"></canvas></div>
      <div class="chart-card"><div class="chart-title">转化漏斗</div>${renderFunnel(data.funnel.slice(0, 5))}</div>
      <div class="platform-list compact-diagnosis"><div class="chart-title">智能诊断</div>${data.suggestions.slice(0, 3).map((item) => `<div class="diagnosis-item"><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.reason)}</p></div>`).join("")}</div>
    </div>
  `;
  drawLineChart("opsTrendChart", data.trend.map((item) => item.label), [
    { label: "GMV", data: data.trend.map((item) => item.gmv), borderColor: "#27ae60", tension: 0.35 }
  ]);
  drawDoughnutChart("opsShareChart", data.platformShare.map((item) => item.platform), data.platformShare.map((item) => item.value), true);
};

function renderPlatformAnalysis(item) {
  return (item.platformAnalysis || []).map((analysis) => `
    <div class="platform-analysis-cell">
      ${platformBadge(analysis.platform)}
      <strong>${formatNumber(analysis.totalSales)}</strong>
      <span>均价 ¥${formatNumber(analysis.avgPrice)} · ${analysis.linkCount} 条链接</span>
    </div>
  `).join("");
}

renderProducts = async function() {
  const data = await api("/api/products");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("商品选品分析", '<button class="filter-tab" data-page="content" type="button">内容搜索</button>')}
    <div class="search-section compact-search">
      <div class="search-bar"><input id="productKeyword" class="search-input" placeholder="搜索商品、类目或标签"><button class="btn" id="productSearchButton" type="button">筛选</button></div>
      <div class="filter-tabs">${["all", ...allPlatformCodes].map((platform, index) => `<button class="filter-tab ${index === 0 ? "active" : ""}" data-product-platform="${platform}" type="button">${platform === "all" ? "全部平台" : escapeHtml(platformName(platform))}</button>`).join("")}</div>
    </div>
    <div id="productList" class="business-grid product-grid">${renderProductCards(data.items)}</div>
  `;
  $("#productSearchButton").addEventListener("click", loadProducts);
  document.querySelectorAll("[data-product-platform]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-product-platform]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      loadProducts().catch((error) => setStatus(error.message));
    });
  });
};

renderProductCards = function(items) {
  return items.map((item) => `
    <div class="business-card product-card">
      <div class="card-headline"><h3>${escapeHtml(item.name)}</h3><span class="score-pill">${item.hotScore}</span></div>
      <div class="tag-row"><span>${escapeHtml(item.category)}</span><span>风险 ${escapeHtml(item.risk)}</span><span>增长 ${item.growthRate}%</span></div>
      <div class="metric-row"><div><strong>${formatMoney(item.gmv)}</strong><span>GMV</span></div><div><strong>${formatNumber(item.salesCount)}</strong><span>销量</span></div><div><strong>${item.commissionRate}%</strong><span>佣金</span></div></div>
      <div class="platform-analysis-grid">${renderPlatformAnalysis(item)}</div>
      <p>${escapeHtml(item.insight)}</p>
      <div class="card-actions"><button class="filter-tab" data-product-detail="${item.id}" type="button">多平台链接</button><button class="btn" data-page="creators" type="button">找达人</button></div>
    </div>
  `).join("");
};

openProductDetail = async function(id) {
  const { item } = await api(`/api/products/${id}`);
  openAppModal("多平台商品链接", `
    <div class="detail-title">${escapeHtml(item.name)}</div>
    <div class="link-platform-list">
      ${item.platformLinks.map((group) => `
        <section class="link-platform-block">
          <div class="group-head"><div>${platformBadge(group.platform)}<strong>10 条同款链接</strong></div><span>总销量 ${formatNumber(group.totalSales)} · 均价 ¥${formatNumber(group.avgPrice)}</span></div>
          <div class="link-grid">${group.links.map((link) => `<a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(link.title)}</strong><span>¥${formatNumber(link.price)} · 销量 ${formatNumber(link.salesCount)} · 热度 ${link.hotScore}</span></a>`).join("")}</div>
        </section>
      `).join("")}
    </div>
  `, { wide: true });
};

renderCreators = async function() {
  const data = await api("/api/creators");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("达人筛选与合作", '<button class="filter-tab" data-page="products" type="button">返回选品</button>')}
    <div class="business-grid creator-grid">
      ${data.items.map((item) => `
        <div class="business-card">
          <div class="card-headline"><h3>${escapeHtml(item.name)}</h3><span class="score-pill">${item.matchScore}</span></div>
          <div class="tag-row">${platformBadge(item.platform)}<span>${escapeHtml(item.category)}</span><span>${escapeHtml(item.cooperationStatus)}</span></div>
          <div class="metric-row"><div><strong>${formatNumber(item.fans)}</strong><span>粉丝</span></div><div><strong>${formatNumber(item.avgViews)}</strong><span>均播</span></div><div><strong>${item.engagementRate}%</strong><span>互动</span></div></div>
          <p>${escapeHtml(item.suggestion)}</p>
          <div class="card-actions"><button class="filter-tab" data-creator-detail="${item.id}" type="button">详情</button><button class="btn" data-start-cooperation="${item.id}" type="button">发起合作</button></div>
        </div>
      `).join("")}
    </div>
  `;
};

openCreatorDetail = async function(id) {
  const { item } = await api(`/api/creators/${id}`);
  openAppModal("达人合作详情", `
    <div class="detail-title">${escapeHtml(item.name)}</div>
    <div class="tag-row">${platformBadge(item.platform)}${item.strengths.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <div class="metric-row stacked"><div><strong>${formatNumber(item.fans)}</strong><span>粉丝</span></div><div><strong>${formatNumber(item.avgViews)}</strong><span>平均播放</span></div><div><strong>¥${formatNumber(item.quote)}</strong><span>参考报价</span></div></div>
    <div class="copy-box">联系渠道：${escapeHtml(item.contact.method)} · ${escapeHtml(item.contact.account)} · ${escapeHtml(item.contact.responseTime)}</div>
    ${renderProcessSteps(item.cooperationSteps || [])}
    <div class="modal-actions"><button class="btn" data-start-cooperation="${item.id}" type="button">发起合作</button></div>
  `, { wide: true });
};

function renderProcessSteps(steps = []) {
  return `<div class="process-steps">${steps.map((step, index) => `<div class="process-step ${escapeHtml(step.status)}"><span>${index + 1}</span><div><strong>${escapeHtml(step.title)}</strong><p>${escapeHtml(step.detail)}</p></div></div>`).join("")}</div>`;
}

startCreatorCooperation = async function(id) {
  const result = await api(`/api/creators/${id}/cooperation`, { method: "POST" });
  openAppModal("合作流程已创建", `
    <div class="copy-box">${escapeHtml(result.item.creatorName)} 已进入合作流程。平台：${escapeHtml(result.item.platformName)}；联系方式：${escapeHtml(result.item.contactMethod)} / ${escapeHtml(result.item.contactAccount)}。</div>
    ${renderProcessSteps(result.item.steps)}
  `, { wide: true });
  setStatus(`${result.item.creatorName} 已进入合作洽谈`);
};

renderPublishing = async function() {
  const data = await api("/api/publishing/insights");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("发布计划", '<button class="btn" data-open-publish-plan type="button">新建发布计划</button>')}
    <div class="publishing-layout">
      <div class="chart-card"><div class="chart-title">最佳发布时间</div><canvas id="publishWindowChart" height="90"></canvas></div>
      <div class="chart-card"><div class="chart-title">视频完播率</div><canvas id="durationChart" height="90"></canvas></div>
      <div class="platform-list publish-plan-list"><div class="chart-title">定时发布计划</div>${data.plans.map(renderPublishPlanItem).join("")}</div>
    </div>
  `;
  drawBarChart("publishWindowChart", data.publishWindows.map((item) => item.label), data.publishWindows.map((item) => item.interactionRate), "互动率");
  drawBarChart("durationChart", data.durationAnalysis.map((item) => item.label), data.durationAnalysis.map((item) => item.avgCompletion), "完播率", true);
};

function renderPublishPlanItem(item) {
  return `
    <div class="publish-plan-item">
      <div class="group-head"><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.publishAt)} · ${escapeHtml(item.status)}</span></div><button class="filter-tab" data-trigger-publish="${item.id}" type="button">自动发布</button></div>
      <p>${escapeHtml(item.copywriting || "未填写文案")}</p>
      <div class="tag-row">${(item.platforms || []).map(platformBadge).join("")}${item.videoFileName ? `<span>视频：${escapeHtml(item.videoFileName)}</span>` : "<span>未上传视频</span>"}</div>
      <div class="platform-result-grid">${(item.platformResults || []).map((result) => `<div class="platform-result"><strong>${escapeHtml(result.platformName)}</strong><span>${escapeHtml(result.status)}</span><small>${escapeHtml(result.action)}</small></div>`).join("")}</div>
    </div>
  `;
}

openPublishPlanModal = function() {
  openAppModal("新建发布计划", `
    <div class="form-group"><label class="form-label">内容标题</label><input id="publishTitle" class="form-input" placeholder="输入计划发布的内容标题"></div>
    <div class="form-group"><label class="form-label">上传视频</label><input id="publishVideoFile" class="form-input" type="file" accept="video/*"></div>
    <div class="form-group"><label class="form-label">发布文案</label><textarea id="publishCopywriting" class="form-textarea" placeholder="输入各平台发布文案"></textarea></div>
    <div class="form-group"><label class="form-label">定时发布时间</label><input id="publishAt" class="form-input" type="datetime-local"></div>
    <div class="tag-row checkbox-tags">${allPlatformCodes.map((platform) => `<label><input type="checkbox" value="${platform}" checked> ${escapeHtml(platformName(platform))}</label>`).join("")}</div>
    <label class="modal-check"><input id="publishAuto" type="checkbox" checked><span><strong>到点自动发布</strong><small>需要平台账号授权，未授权平台会进入等待授权状态。</small></span></label>
    <div class="modal-actions"><button class="filter-tab" data-close-app-modal type="button">取消</button><button class="btn" data-save-publish-plan type="button">保存计划</button></div>
  `);
};

savePublishPlan = async function() {
  const platforms = [...document.querySelectorAll(".checkbox-tags input:checked")].map((item) => item.value);
  const file = $("#publishVideoFile")?.files?.[0];
  await api("/api/publishing/plans", {
    method: "POST",
    body: JSON.stringify({
      title: $("#publishTitle").value,
      publishAt: $("#publishAt").value || "立即发布",
      copywriting: $("#publishCopywriting").value,
      videoFileName: file?.name || "",
      platforms,
      autoPublish: $("#publishAuto")?.checked
    })
  });
  closeAppModal();
  await renderPublishing();
  setStatus("发布计划已创建");
};

const localConversationMedia = {};
const quickEmojis = ["👍", "😊", "🔥", "🎁", "✅", "🙏"];

function platformConversationUrl(conversation) {
  const keyword = encodeURIComponent(conversation?.customerName || conversation?.lastMessage || "");
  return {
    douyin: `https://www.douyin.com/search/${keyword}`,
    kuaishou: `https://www.kuaishou.com/search/video?searchKey=${keyword}`,
    wechat_channel: "https://channels.weixin.qq.com/",
    xiaohongshu: `https://www.xiaohongshu.com/search_result?keyword=${keyword}`
  }[conversation?.platform] || `https://www.baidu.com/s?wd=${keyword}`;
}

function renderConversationNotice(item, activeId) {
  const waiting = item.status === "waiting" || item.status === "ai_drafting";
  if (!waiting || item.id === activeId) return "";
  return `<span class="message-alert-badge">新消息</span>`;
}

function renderMediaMessage(message) {
  const attachmentMedia = (message.attachments || []).map((item) => {
    if (!item.url) return `<div class="attachment-pill">${escapeHtml(item.name || "附件")}</div>`;
    if (item.type === "video") return `<video class="message-media" src="${item.url}" controls></video>`;
    if (item.type === "image") return `<img class="message-media" src="${item.url}" alt="${escapeHtml(item.name || "图片")}">`;
    return `<a class="attachment-pill" href="${item.url}" target="_blank" rel="noreferrer">${escapeHtml(item.name || "附件")}</a>`;
  }).join("");
  if (attachmentMedia) return attachmentMedia;
  if (!message.mediaUrl) return "";
  if (message.mediaType === "video") {
    return `<video class="message-media" src="${message.mediaUrl}" controls></video>`;
  }
  return `<img class="message-media" src="${message.mediaUrl}" alt="${escapeHtml(message.fileName || "图片")}">`;
}

renderMessages = async function() {
  const payload = await api("/api/conversations");
  if (!activeConversationId && payload.items[0]) activeConversationId = payload.items[0].id;
  const active = payload.items.find((item) => item.id === activeConversationId) || payload.items[0];
  const platformCounts = allPlatformCodes.map((platform) => ({
    platform,
    count: payload.items.filter((item) => item.platform === platform).length
  })).filter((item) => item.count);
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("客户管理", '<button class="filter-tab" data-open-setting="customerAi" type="button">客户AI配置</button><button class="filter-tab" data-open-setting="knowledge" type="button">企业知识库</button>')}
    <div class="customer-summary-row">
      ${platformCounts.map((item) => `<div>${platformBadge(item.platform)}<strong>${formatNumber(item.count)}</strong><span>会话</span></div>`).join("")}
      <div><strong>${formatNumber(payload.items.filter((item) => item.autoReply).length)}</strong><span>AI自动回复</span></div>
      <div><strong>${formatNumber(payload.items.filter((item) => item.group === "待转化客户").length)}</strong><span>待转化</span></div>
    </div>
    <div class="message-container compact-message-container">
      <div class="conversation-list">
        ${payload.items.map((item) => `
          <div class="conversation-item ${item.id === active?.id ? "active" : ""}" data-conversation="${item.id}">
            <div class="conv-topline"><div class="conv-user">${escapeHtml(item.customerName)}</div>${renderConversationNotice(item, active?.id)}</div>
            <div class="conv-platform">${iconForPlatform(item.platform)[0]} ${escapeHtml(item.platformName || platformName(item.platform))} · ${escapeHtml(item.lifecycle || "新线索")}</div>
            <div class="conv-preview"><span>最新：</span>${escapeHtml(item.lastMessage)}</div>
            <div class="tag-row small-tags">${(item.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
          </div>
        `).join("")}
      </div>
      <div class="message-panel">
        <div class="message-header split-header">
          <div>
            <h3>${escapeHtml(active?.customerName || "选择会话")}</h3>
            <p>${active ? `${iconForPlatform(active.platform)[0]} ${platformName(active.platform)} · 回复目标：${escapeHtml(active.replyTarget || `${platformName(active.platform)}私信/评论`)}` : ""}</p>
          </div>
          ${active ? `<div class="review-actions"><a class="filter-tab platform-jump" href="${platformConversationUrl(active)}" target="_blank" rel="noreferrer">跳转平台</a><button class="filter-tab" data-auto-suggestion="${active.id}" type="button">AI生成回复</button><button class="filter-tab" data-edit-customer="${active.id}" type="button">客户详情</button></div>` : ""}
        </div>
        <div class="message-body" id="messageBody"></div>
        <div class="message-footer">
          <div class="message-tool-row">
            <label class="ai-toggle"><input id="autoReplySwitch" type="checkbox" ${active?.autoReply ? "checked" : ""}> AI自动回复</label>
            <label class="filter-tab media-upload-btn">图片<input id="imageMessageInput" type="file" accept="image/*" multiple></label>
            <label class="filter-tab media-upload-btn">视频<input id="videoMessageInput" type="file" accept="video/*" multiple></label>
            <div class="emoji-bar">${quickEmojis.map((emoji) => `<button class="emoji-button" data-emoji="${emoji}" type="button">${emoji}</button>`).join("")}</div>
          </div>
          <div class="message-compose-row">
            <input id="messageInput" class="message-input" type="text" placeholder="回复将同步到对应平台...">
            <button id="adoptSuggestionButton" class="filter-tab" type="button">采纳AI</button>
            <button id="sendMessageButton" class="btn" type="button">发送</button>
          </div>
        </div>
      </div>
    </div>
  `;
  renderMessageBody(active);
  document.querySelectorAll("[data-conversation]").forEach((item) => {
    item.addEventListener("click", () => {
      activeConversationId = item.dataset.conversation;
      renderMessages().catch((error) => setStatus(error.message));
    });
  });
  $("#sendMessageButton")?.addEventListener("click", sendMessage);
  $("#adoptSuggestionButton")?.addEventListener("click", adoptSuggestion);
  $("#autoReplySwitch")?.addEventListener("change", () => saveCustomerProfile(active.id, true));
  document.querySelectorAll("[data-emoji]").forEach((button) => button.addEventListener("click", () => insertEmoji(button.dataset.emoji)));
  $("#imageMessageInput")?.addEventListener("change", () => sendLocalMedia($("#imageMessageInput"), "image"));
  $("#videoMessageInput")?.addEventListener("change", () => sendLocalMedia($("#videoMessageInput"), "video"));
};

renderMessageBody = function(conversation) {
  if (!conversation) return;
  const localMessages = localConversationMedia[conversation.id] || [];
  $("#messageBody").innerHTML = [
    ...conversation.messages,
    ...localMessages,
    { role: "ai", text: `AI建议：${conversation.aiSuggestion}`, time: "待采纳" }
  ].map((message) => `
    <div class="message-bubble ${message.role === "customer" ? "user" : "ai"}">
      <div>${escapeHtml(message.text)}</div>
      ${renderMediaMessage(message)}
      <div class="message-time">${escapeHtml([message.time, message.platformName, message.syncStatus].filter(Boolean).join(" · "))}</div>
    </div>
  `).join("");
  const body = $("#messageBody");
  body.scrollTop = body.scrollHeight;
};

function insertEmoji(emoji) {
  const input = $("#messageInput");
  input.value = `${input.value}${emoji}`;
  input.focus();
}

async function sendLocalMedia(input, mediaType) {
  const files = [...(input.files || [])];
  if (!files.length || !activeConversationId) return;
  localConversationMedia[activeConversationId] = localConversationMedia[activeConversationId] || [];
  const attachments = files.map((file, index) => ({
    id: `local_${Date.now()}_${index}`,
    type: mediaType,
    name: file.name,
    url: URL.createObjectURL(file)
  }));
  attachments.forEach((attachment) => {
    localConversationMedia[activeConversationId].push({
      role: "agent",
      text: mediaType === "video" ? `已发送本地视频：${attachment.name}` : `已发送本地图片：${attachment.name}`,
      mediaType,
      fileName: attachment.name,
      mediaUrl: attachment.url,
      time: new Date().toLocaleString("zh-CN", { hour12: false }),
      syncStatus: "本地附件待平台同步"
    });
  });
  await api(`/api/conversations/${activeConversationId}/platform-reply`, {
    method: "POST",
    body: JSON.stringify({
      text: mediaType === "video" ? `已发送本地视频：${attachments.map((item) => item.name).join("、")}` : `已发送本地图片：${attachments.map((item) => item.name).join("、")}`,
      attachments
    })
  });
  input.value = "";
  await renderMessages();
  setStatus(mediaType === "video" ? "本地视频已加入发送记录" : "本地图片已加入发送记录");
}

async function generateCustomerSuggestion(id) {
  await api(`/api/conversations/${id}/auto-suggestion`, { method: "POST" });
  await renderMessages();
  setStatus("AI回复建议已生成");
}

function merchantOverallStatus(platforms = []) {
  if (platforms.some((item) => item.status === "approved")) return "已有平台通过";
  if (platforms.some((item) => item.status === "reviewing")) return "审核中";
  if (platforms.some((item) => item.status === "ready")) return "资料待提交";
  return "待补充资料";
}

function renderMerchantPlatformSummary(platform) {
  const required = platform.materials.filter((item) => item.required);
  const uploadedRequired = required.filter((item) => item.uploaded);
  const uploadedAll = platform.materials.filter((item) => item.uploaded);
  return `
    <div class="merchant-platform-card">
      <div class="group-head">
        <div>${platformBadge(platform.platform)}<strong>${escapeHtml(platform.platformName)}</strong></div>
        <span>${escapeHtml(platformStatusText(platform.status))}</span>
      </div>
      <div class="platform-analysis-grid">
        <div class="platform-analysis-cell"><strong>${uploadedRequired.length}/${required.length}</strong><span>必填资料</span></div>
        <div class="platform-analysis-cell"><strong>${uploadedAll.length}/${platform.materials.length}</strong><span>已上传</span></div>
        <div class="platform-analysis-cell"><strong>${platform.canAuthorize ? "可获取" : "待审核"}</strong><span>授权 Code</span></div>
      </div>
      <div class="platform-label">${platform.applicationNo ? `申请单：${escapeHtml(platform.applicationNo)}` : "填写资料后提交平台审核"}</div>
      <button class="filter-tab full-width-action" data-open-merchant-platform="${platform.platform}" type="button">资料与审核</button>
    </div>
  `;
}

async function openMerchantPlatformDetail(platformCode) {
  const data = await api("/api/onboarding/merchant");
  const platform = data.platforms.find((item) => item.platform === platformCode);
  if (!platform) {
    setStatus("平台资料不存在");
    return;
  }
  openAppModal(`${platform.platformName}资料与审核`, `
    <div class="merchant-modal-head">
      ${platformBadge(platform.platform)}
      <strong>${escapeHtml(platformStatusText(platform.status))}</strong>
      <span>${platform.reviewDate ? `预计审核日期：${escapeHtml(platform.reviewDate)}` : "提交审核后会返回预计审核日期"}</span>
    </div>
    <div class="material-list compact-material-list">
      ${platform.materials.map((material) => `
        <div class="material-row">
          <div class="material-name"><strong>${escapeHtml(material.label)}</strong><div class="platform-label">${material.required ? "必填" : "选填"}</div></div>
          <div class="platform-label material-file-name">${material.uploaded ? escapeHtml(material.fileName) : "未上传"}</div>
          <label class="upload-button">选择文件<input class="material-upload-input" data-material-file data-platform="${platform.platform}" data-material="${material.key}" type="file"></label>
        </div>
      `).join("")}
    </div>
    <div class="review-actions modal-actions">
      <button class="btn" data-submit-review="${platform.platform}" type="button">提交审核</button>
      <button class="filter-tab" data-approve-review="${platform.platform}" type="button">模拟通过</button>
      <button class="filter-tab" data-get-auth-code="${platform.platform}" ${platform.canAuthorize ? "" : "disabled"} type="button">获取Code</button>
    </div>
  `, { wide: true });
  document.querySelectorAll("#appModal [data-material-file]").forEach((input) => input.addEventListener("change", () => uploadMerchantMaterial(input)));
}

renderMerchantOnboarding = async function() {
  const data = await api("/api/onboarding/merchant");
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("商户入驻", "")}
    <div class="onboarding-layout compact-onboarding-layout">
      <section class="onboarding-profile">
        <div class="panel-title-row"><div><h3>商户基础信息</h3><p>先填写企业主体，再按平台上传对应资料。</p></div></div>
        <div class="merchant-profile modern-form-grid">
          <label><span>企业名称</span><input id="businessName" value="${escapeHtml(data.businessName || "")}" placeholder="营业执照上的企业名称"></label>
          <label><span>统一社会信用代码</span><input id="unifiedSocialCreditCode" value="${escapeHtml(data.unifiedSocialCreditCode || "")}" placeholder="统一社会信用代码"></label>
          <label><span>联系人</span><input id="contactName" value="${escapeHtml(data.contactName || "")}" placeholder="联系人"></label>
          <label><span>联系电话</span><input id="contactPhone" value="${escapeHtml(data.contactPhone || "")}" placeholder="联系电话"></label>
        </div>
        <div class="code-strip onboarding-code-strip">
          <div class="code-item"><span>商户CODE</span><strong>${escapeHtml(data.merchantCode || "提交审核后生成")}</strong></div>
          <div class="code-item"><span>整体状态</span><strong>${escapeHtml(merchantOverallStatus(data.platforms))}</strong></div>
        </div>
        <button id="saveMerchantProfileButton" class="btn" type="button">保存商户信息</button>
      </section>
      <section class="merchant-platform-summary-grid">
        ${data.platforms.map(renderMerchantPlatformSummary).join("")}
      </section>
    </div>
  `;
  $("#saveMerchantProfileButton").addEventListener("click", saveMerchantProfile);
};

uploadMerchantMaterial = async function(input) {
  const file = input.files?.[0];
  const platformCode = input.dataset.platform;
  if (!file) return;
  await api("/api/onboarding/merchant/material", {
    method: "POST",
    body: JSON.stringify({
      platform: platformCode,
      materialKey: input.dataset.material,
      fileName: file.name
    })
  });
  await renderMerchantOnboarding();
  await openMerchantPlatformDetail(platformCode);
  setStatus("材料状态已更新");
};

submitReview = async function(platform) {
  const result = await api("/api/onboarding/merchant/submit-review", {
    method: "POST",
    body: JSON.stringify({ platform })
  });
  await renderMerchantOnboarding();
  await openMerchantPlatformDetail(platform);
  setStatus(`${result.item.platformName} ${result.item.message}，预计 ${result.item.reviewDate}`);
};

approveReview = async function(platform) {
  const result = await api("/api/onboarding/merchant/approve-review", {
    method: "POST",
    body: JSON.stringify({ platform })
  });
  await renderMerchantOnboarding();
  await openMerchantPlatformDetail(platform);
  setStatus(`${result.item.platformName} ${result.item.message}`);
};

getAuthCode = async function(platform) {
  const result = await api("/api/onboarding/merchant/authorization-code", {
    method: "POST",
    body: JSON.stringify({ platform })
  });
  await renderMerchantOnboarding();
  await openMerchantPlatformDetail(platform);
  setStatus(result.item.authorizationCode ? `授权 Code：${result.item.authorizationCode}` : result.item.message);
};

renderTeam = async function() {
  const data = await api("/api/team");
  const moduleCounts = data.auditLogs.reduce((acc, item) => {
    acc[item.module] = (acc[item.module] || 0) + 1;
    return acc;
  }, {});
  $("#mainContent").innerHTML = `
    ${renderSectionHeader("团队权限", '<button class="btn" data-open-add-member type="button">添加成员</button>')}
    <div class="team-layout">
      <section class="chart-card wide-card">
        <div class="chart-title">成员管理</div>
        ${renderMiniTable(["成员", "手机号", "角色", "状态", "最后活跃"], data.members.map((member) => [
          escapeHtml(member.name),
          escapeHtml(member.phone),
          `<select class="form-select compact-select" data-member-role="${member.id}">${data.roles.map((role) => `<option value="${role.id}" ${role.id === member.roleId ? "selected" : ""}>${escapeHtml(role.name)}</option>`).join("")}</select>`,
          escapeHtml(member.status),
          escapeHtml(member.lastActive)
        ]))}
      </section>
      <section class="chart-card team-log-card"><div class="chart-title">操作日志分布</div><div class="mini-doughnut-wrap"><canvas id="teamLogChart" height="120"></canvas></div><button class="filter-tab full-width-action" data-open-audit-logs type="button">查看日志详情</button></section>
      <section class="chart-card"><div class="chart-title">角色权限</div>${data.roles.map((role) => `<div class="role-card"><strong>${escapeHtml(role.name)}</strong><div class="tag-row">${role.permissions.map((permission) => `<span>${escapeHtml(permission)}</span>`).join("")}</div></div>`).join("")}</section>
    </div>
  `;
  document.querySelectorAll("[data-member-role]").forEach((select) => {
    select.addEventListener("change", () => updateMemberRole(select.dataset.memberRole, select.value));
  });
  setTimeout(() => drawDoughnutChart("teamLogChart", Object.keys(moduleCounts), Object.values(moduleCounts), true));
};

function openAddMemberModal() {
  openAppModal("添加团队成员", `
    <div class="form-group"><label class="form-label">姓名</label><input id="newMemberName" class="form-input" placeholder="成员姓名"></div>
    <div class="form-group"><label class="form-label">手机号</label><input id="newMemberPhone" class="form-input" placeholder="手机号"></div>
    <div class="form-group"><label class="form-label">角色</label><select id="newMemberRole" class="form-select"><option value="operator">内容运营</option><option value="service">客服</option><option value="finance">财务</option><option value="owner">店铺负责人</option></select></div>
    <div class="modal-actions"><button class="btn" data-add-member type="button">添加成员</button></div>
  `);
}

async function addMember() {
  await api("/api/team/members", {
    method: "POST",
    body: JSON.stringify({
      name: $("#newMemberName").value,
      phone: $("#newMemberPhone").value,
      roleId: $("#newMemberRole").value
    })
  });
  closeAppModal();
  await renderTeam();
  setStatus("成员已添加");
}

async function openAuditLogs() {
  const data = await api("/api/team");
  openAppModal("操作日志详情", renderMiniTable(["操作者", "模块", "动作", "时间"], data.auditLogs.map((log) => [
    escapeHtml(log.operator),
    escapeHtml(log.module),
    escapeHtml(log.action),
    escapeHtml(log.time)
  ])), { wide: true });
}

showPage = async function(pageId) {
  const merchantPages = new Set(["operations", "products", "creators", "publishing", "orders", "finance", "team", "merchant"]);
  if (merchantPages.has(pageId) && session.userType !== "merchant") {
    setStatus("个人用户暂不显示商户经营模块");
    pageId = "dashboard";
  }
  closeAppModal();
  destroyChart();
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.toggle("active", item.dataset.page === pageId));
  $("#pageTitle").textContent = pageTitles[pageId] || "AI员工系统";
  setStatus("正在加载");
  if (pageId === "dashboard") await renderDashboard();
  if (pageId === "content") await renderContent();
  if (pageId === "aivideo") await renderAiVideo();
  if (pageId === "products") await renderProducts();
  if (pageId === "creators") await renderCreators();
  if (pageId === "publishing") await renderPublishing();
  if (pageId === "messages") await renderMessages();
  if (pageId === "live") await renderLive();
  if (pageId === "sales") await renderSales();
  if (pageId === "operations") await renderOperations();
  if (pageId === "orders") await renderOrders();
  if (pageId === "finance") await renderFinance();
  if (pageId === "team") await renderTeam();
  if (pageId === "merchant") await renderMerchantOnboarding();
  if (pageId === "settings") await renderSettings();
  setStatus("已加载");
};

document.addEventListener("click", (event) => {
  if (event.target.closest("#settingsMenuButton")) {
    $("#settingsMenu")?.classList.toggle("hidden");
    $("#avatarMenu")?.classList.add("hidden");
    return;
  }
  if (event.target.closest("#avatarMenuButton")) {
    $("#avatarMenu")?.classList.toggle("hidden");
    $("#settingsMenu")?.classList.add("hidden");
    return;
  }
  if (event.target.closest("[data-switch-account]")) {
    logout().catch((error) => setStatus(error.message));
    return;
  }
  if (event.target.closest("[data-open-profile]")) {
    openAppModal("个人信息", `<div class="copy-box">${escapeHtml(session.displayName || "")} · ${escapeHtml(session.username || "")} · ${escapeHtml(userTypeLabel(session.userType))}</div>`);
    return;
  }
  if (event.target.closest("[data-change-password]")) {
    openAppModal("修改密码", `<div class="notice-card">当前原型账号为本地演示账号，正式接入数据库账号后开放密码修改。</div>`);
    return;
  }
  if (event.target.closest("[data-open-ai-video-config]")) {
    openAiVideoConfigOverview().catch((error) => setStatus(error.message));
    return;
  }
  const contentPlatform = event.target.closest("[data-open-content-platform]");
  if (contentPlatform) {
    openContentPlatform(contentPlatform.dataset.openContentPlatform);
    return;
  }
  const merchantPlatform = event.target.closest("[data-open-merchant-platform]");
  if (merchantPlatform) {
    openMerchantPlatformDetail(merchantPlatform.dataset.openMerchantPlatform).catch((error) => setStatus(error.message));
    return;
  }
  const publish = event.target.closest("[data-trigger-publish]");
  if (publish) {
    api(`/api/publishing/plans/${publish.dataset.triggerPublish}/publish`, { method: "POST" })
      .then(renderPublishing)
      .then(() => setStatus("发布计划已提交平台队列"))
      .catch((error) => setStatus(error.message));
    return;
  }
  const autoSuggestion = event.target.closest("[data-auto-suggestion]");
  if (autoSuggestion) {
    generateCustomerSuggestion(autoSuggestion.dataset.autoSuggestion).catch((error) => setStatus(error.message));
    return;
  }
  if (event.target.closest("[data-open-add-member]")) {
    openAddMemberModal();
    return;
  }
  if (event.target.closest("[data-add-member]")) {
    addMember().catch((error) => setStatus(error.message));
    return;
  }
  if (event.target.closest("[data-open-audit-logs]")) {
    openAuditLogs().catch((error) => setStatus(error.message));
  }
});

refreshSession().catch((error) => setStatus(error.message));
