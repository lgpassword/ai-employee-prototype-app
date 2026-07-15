import { platformName, store } from "../store.js";

// 内容创作与发布模块：负责爆款分析、定时发布和多平台自动发布的本地闭环。
const platformAliases = {
  douyin: "douyin",
  kuaishou: "kuaishou",
  wechat_channel: "wechat_channel",
  xiaohongshu: "xiaohongshu",
  抖音: "douyin",
  快手: "kuaishou",
  视频号: "wechat_channel",
  小红书: "xiaohongshu"
};

const publishPlans = [
  {
    id: "plan_1",
    title: "专业防护手套测评",
    copywriting: "突出防滑耐磨、工厂实测和企业采购优惠。",
    videoFileName: "glove-review.mp4",
    platforms: ["douyin", "kuaishou"],
    publishAt: "2026-07-15 18:30",
    autoPublish: true,
    status: "待平台执行",
    platformResults: []
  },
  {
    id: "plan_2",
    title: "冬季保暖手套场景短片",
    copywriting: "围绕通勤、骑车和户外保暖场景发布。",
    videoFileName: "",
    platforms: ["wechat_channel", "xiaohongshu"],
    publishAt: "2026-07-16 20:00",
    autoPublish: false,
    status: "草稿",
    platformResults: []
  }
];

function normalizePlatform(value) {
  return platformAliases[String(value || "").trim()] || "douyin";
}

function uniquePlatforms(platforms) {
  const values = Array.isArray(platforms) && platforms.length ? platforms : ["douyin"];
  return [...new Set(values.map(normalizePlatform))];
}

function connectedAccount(platform) {
  return store.accounts.find((item) => item.platform === platform && item.status === "connected");
}

function buildPlatformResults(platforms, autoPublish) {
  return platforms.map((platform) => {
    const connected = Boolean(connectedAccount(platform));
    return {
      platform,
      platformName: platformName(platform),
      connected,
      status: autoPublish ? connected ? "已排期自动发布" : "等待账号授权" : "仅保存计划",
      action: connected ? "到点后由系统调用平台发布能力" : "先在系统配置中完成账号授权",
      targetUrl: `https://www.baidu.com/s?wd=${encodeURIComponent(`${platformName(platform)} 发布 ${new Date().getFullYear()}`)}`
    };
  });
}

function publicPlan(plan) {
  const platformResults = plan.platformResults?.length ? plan.platformResults : buildPlatformResults(plan.platforms, plan.autoPublish);
  return {
    ...plan,
    platformNames: plan.platforms.map(platformName),
    platformResults
  };
}

export function getContentInsights() {
  return {
    hotKeywords: [
      { keyword: "防滑耐磨", videoCount: 12560, avgViews: 85000, heat: 96 },
      { keyword: "冬季保暖", videoCount: 9340, avgViews: 62000, heat: 88 },
      { keyword: "工厂劳保", videoCount: 6820, avgViews: 54000, heat: 79 },
      { keyword: "骑行手套", videoCount: 4760, avgViews: 43000, heat: 72 }
    ],
    publishWindows: [
      { label: "08:00-11:00", interactionRate: 5.1 },
      { label: "12:00-14:00", interactionRate: 6.3 },
      { label: "18:00-21:00", interactionRate: 9.2 },
      { label: "21:00-23:00", interactionRate: 7.4 }
    ],
    durationAnalysis: [
      { label: "15秒", avgCompletion: 78 },
      { label: "30秒", avgCompletion: 64 },
      { label: "60秒", avgCompletion: 48 },
      { label: "90秒", avgCompletion: 31 }
    ],
    bgmRanking: [
      { name: "轻快带货节奏", avgViews: 92000 },
      { name: "真实测评口播", avgViews: 81000 },
      { name: "直播间成交氛围", avgViews: 68000 }
    ],
    planSummary: {
      total: publishPlans.length,
      scheduled: publishPlans.filter((item) => item.autoPublish).length,
      needAuth: publishPlans.filter((item) => item.platformResults?.some((result) => !result.connected)).length
    },
    plans: publishPlans.map(publicPlan)
  };
}

export function createPublishPlan(payload) {
  const title = String(payload.title || "").trim();
  if (!title) {
    throw new Error("发布标题不能为空");
  }
  const platforms = uniquePlatforms(payload.platforms);
  const autoPublish = Boolean(payload.autoPublish);
  const plan = {
    id: `plan_${publishPlans.length + 1}_${Date.now()}`,
    title,
    copywriting: String(payload.copywriting || "").trim(),
    videoFileName: String(payload.videoFileName || "").trim(),
    platforms,
    publishAt: String(payload.publishAt || "立即发布").trim(),
    autoPublish,
    status: autoPublish ? "待平台执行" : "草稿",
    platformResults: buildPlatformResults(platforms, autoPublish)
  };
  publishPlans.unshift(plan);
  return publicPlan(plan);
}

export function triggerPublishPlan(id) {
  const plan = publishPlans.find((item) => item.id === id);
  if (!plan) {
    throw new Error("发布计划不存在");
  }
  plan.autoPublish = true;
  plan.platformResults = buildPlatformResults(plan.platforms, true).map((result) => ({
    ...result,
    status: result.connected ? "已提交平台队列" : "等待账号授权"
  }));
  plan.status = plan.platformResults.every((item) => item.connected) ? "已提交平台队列" : "部分平台待授权";
  return publicPlan(plan);
}
