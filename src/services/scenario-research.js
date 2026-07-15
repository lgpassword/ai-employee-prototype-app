const searchTimeoutMs = 7000;
const maxSources = 6;

const scenarioTerms = [
  "工厂作业",
  "车间加工",
  "仓储物流",
  "搬运装卸",
  "户外施工",
  "维修保养",
  "园艺劳动",
  "骑行通勤",
  "健身训练",
  "清洁家务",
  "厨房烹饪",
  "实验室操作",
  "办公通勤",
  "旅行露营",
  "学生日常",
  "门店展示",
  "礼品采购"
];

const productScenarioRules = [
  {
    keywords: ["手套", "防护手套", "劳保手套", "保暖手套", "运动手套"],
    scenarios: [
      ["工厂作业", "车间工人佩戴产品进行机械操作或流水线作业", "强调防滑、耐磨、保护双手", "车间实拍、产品掌面细节图"],
      ["搬运装卸", "搬运纸箱、货物或仓储物料时展示抓握稳定性", "强调抓握、防滑和长时间佩戴舒适", "仓库搬运视频、产品佩戴图"],
      ["户外施工", "户外施工、维修、装修环境中使用产品", "强调耐磨、防护和复杂环境适用", "施工现场素材、工具搭配图"],
      ["骑行通勤", "骑行或电动车通勤时佩戴产品保护手部", "强调防风、保暖和握把稳定", "骑行场景图、手部近景"],
      ["园艺劳动", "修剪、搬花盆、清理枝叶时使用产品", "强调防刮、防脏和灵活操作", "园艺劳动素材、户外绿植图"],
      ["健身训练", "器械训练或户外运动中佩戴产品", "强调防滑、减少磨损和稳定握持", "健身器械图、运动佩戴图"]
    ]
  },
  {
    keywords: ["口罩", "防尘口罩", "面罩"],
    scenarios: [
      ["日常通勤", "地铁、公交、步行通勤时佩戴产品", "强调舒适贴合和日常防护", "通勤人群素材、佩戴近景"],
      ["工业防尘", "车间、打磨、装修环境中佩戴产品", "强调过滤、防尘和长时间佩戴", "工业环境素材、过滤结构图"],
      ["户外防护", "户外风沙、清扫或骑行场景佩戴产品", "强调防尘、防风和透气", "户外场景图、侧面佩戴图"],
      ["门店备货", "门店、仓库或企业批量采购场景", "强调规格齐全和批量供应", "包装陈列图、库存图"]
    ]
  },
  {
    keywords: ["鞋", "靴", "劳保鞋", "运动鞋", "雨靴"],
    scenarios: [
      ["办公通勤", "上下班、步行和公共交通场景使用产品", "强调舒适、百搭和耐穿", "通勤街景、鞋面细节图"],
      ["户外施工", "工地、维修、搬运环境中穿着产品", "强调防滑、耐磨和足部保护", "施工环境图、鞋底纹路图"],
      ["旅行露营", "旅行、露营、户外步行场景使用产品", "强调轻便、防滑和长时间行走舒适", "户外道路图、穿搭图"],
      ["雨天出行", "雨天、湿滑地面或清洁作业中使用产品", "强调防水、防滑和易清洁", "雨天路面素材、鞋底细节图"]
    ]
  },
  {
    keywords: ["水杯", "保温杯", "杯子"],
    scenarios: [
      ["办公桌面", "办公室、会议、学习桌面中使用产品", "强调保温、容量和颜值", "办公桌面图、杯盖细节图"],
      ["车载通勤", "开车、通勤路上使用产品", "强调便携、防漏和单手操作", "车内杯架图、杯身握持图"],
      ["户外旅行", "露营、徒步、旅行中携带产品", "强调保温持久和便携耐用", "户外背包图、露营桌面图"],
      ["学生日常", "校园、图书馆、宿舍中使用产品", "强调轻便、容量和安全材质", "校园桌面图、容量对比图"]
    ]
  }
];

const genericScenarios = [
  ["家庭日常", "在家庭收纳、清洁或日常使用中展示产品价值", "强调省心、实用和高频使用", "家庭环境图、产品近景"],
  ["办公通勤", "在办公室、通勤、随身携带场景中使用产品", "强调便携、效率和质感", "办公桌面图、通勤场景图"],
  ["户外使用", "在户外、旅行、运动或临时任务中使用产品", "强调耐用、便携和环境适应", "户外环境图、使用动作图"],
  ["门店展示", "在门店陈列、直播间或客户咨询场景展示产品", "强调规格齐全和购买决策清晰", "货架陈列图、直播间截图"],
  ["商用采购", "企业、门店或团队批量采购场景", "强调稳定供应、价格方案和售后", "包装库存图、批量发货图"]
];

function normalizeKeyword(value) {
  return String(value || "").trim().slice(0, 80);
}

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value) {
  return String(value || "")
    .replace(/&#x([\da-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, number) => String.fromCharCode(Number(number)))
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), searchTimeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        "accept-language": "zh-CN,zh;q=0.9",
        "user-agent": "Mozilla/5.0 ScenarioResearch/1.0"
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseBingResults(html) {
  const results = [];
  const blocks = String(html || "").match(/<li class="b_algo"[\s\S]*?<\/li>/gi) || [];
  blocks.forEach((block) => {
    const href = block.match(/<a[^>]+href="([^"]+)"/i)?.[1] || "";
    const rawTitle = block.match(/<a[^>]*>([\s\S]*?)<\/a>/i)?.[1] || "";
    const rawSnippet = block.match(/<p>([\s\S]*?)<\/p>/i)?.[1] || "";
    const title = decodeHtml(stripHtml(rawTitle));
    const snippet = decodeHtml(stripHtml(rawSnippet));
    if (title && href && !href.includes("microsoft.com")) {
      results.push({ title, url: href, snippet });
    }
  });
  return results;
}

async function searchOnlineSources(keyword) {
  const query = `${keyword} 使用场景 适用场景 用途`;
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=zh-CN&mkt=zh-CN`;
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) return [];
    const html = await response.text();
    return parseBingResults(html).slice(0, maxSources).map((item, index) => ({
      id: `src_${index + 1}`,
      title: item.title,
      url: item.url,
      summary: item.snippet,
      sourceType: "public_search_summary"
    }));
  } catch {
    return [];
  }
}

function selectedRuleScenarios(keyword) {
  const matchedRule = productScenarioRules.find((rule) => rule.keywords.some((item) => keyword.includes(item)));
  return matchedRule ? matchedRule.scenarios : genericScenarios;
}

function buildScenario(raw, keyword, index, sources, onlineText) {
  const [title, visualPrompt, sellingAngle, materialSuggestion] = raw;
  const relatedSources = sources
    .filter((source) => `${source.title} ${source.summary}`.includes(title) || `${source.title} ${source.summary}`.includes(keyword))
    .slice(0, 2)
    .map((source) => source.id);
  const onlineHit = onlineText.includes(title);
  return {
    id: `scene_${index + 1}`,
    title,
    description: `${keyword}可用于${title}，适合用作短视频中的真实使用场景。`,
    visualPrompt,
    sellingAngle,
    materialSuggestion,
    confidence: Math.min(95, 68 + relatedSources.length * 10 + (onlineHit ? 10 : 0)),
    sourceIds: relatedSources,
    basis: relatedSources.length ? "公开搜索摘要 + 本地产品规则" : "本地产品规则"
  };
}

function onlineTermScenarios(keyword, existingTitles, sources, onlineText) {
  return scenarioTerms
    .filter((term) => !existingTitles.has(term) && onlineText.includes(term))
    .slice(0, 3)
    .map((term, index) => buildScenario([
      term,
      `展示${keyword}在${term}中的使用动作和细节`,
      "强调真实场景、使用效果和购买理由",
      "建议准备真实场景照片、产品近景或用户使用视频"
    ], keyword, existingTitles.size + index, sources, onlineText));
}

export async function analyzeUsageScenarios(payload = {}) {
  const keyword = normalizeKeyword(payload.keyword || payload.productText || payload.topic);
  if (!keyword) {
    throw new Error("请输入产品关键词或产品文案");
  }

  const sources = await searchOnlineSources(keyword);
  const onlineText = sources.map((source) => `${source.title} ${source.summary}`).join(" ");
  const baseScenarios = selectedRuleScenarios(keyword);
  const scenarios = baseScenarios.map((scenario, index) => buildScenario(scenario, keyword, index, sources, onlineText));
  const extraScenarios = onlineTermScenarios(keyword, new Set(scenarios.map((item) => item.title)), sources, onlineText);

  return {
    keyword,
    mode: sources.length ? "online_enhanced" : "local_rules",
    message: sources.length ? "已结合公开搜索摘要提取使用场景，未复制外部图片或视频。" : "未获取到可用公开搜索摘要，已使用本地产品规则生成场景。",
    scenarios: [...scenarios, ...extraScenarios].slice(0, 8),
    sources,
    analyzedAt: new Date().toISOString()
  };
}
