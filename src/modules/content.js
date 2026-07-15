import { store, platformName } from "../store.js";
import { getDouyinOAuthStatus, searchDouyinVideos } from "./douyin.js";

// 内容搜索模块：对应原型的内容搜索页，只提供搜索、平台筛选、导入素材闭环。
export function listContents(query = {}) {
  const keyword = String(query.keyword || "").trim().toLowerCase();
  const platform = String(query.platform || "all");

  return store.contents.filter((item) => {
    const matchedPlatform = platform === "all" || item.platform === platform;
    const haystack = [item.title, item.author, item.platform, item.tags.join(" ")].join(" ").toLowerCase();
    const matchedKeyword = !keyword || haystack.includes(keyword);
    return matchedPlatform && matchedKeyword;
  });
}

function buildLatestItems(platform, count = 10) {
  const baseTitles = {
    douyin: ["手套产品展示", "防护手套测评", "工厂劳保手套", "冬季加绒手套", "骑行防滑手套"],
    kuaishou: ["快手热卖手套", "手套直播片段", "耐磨工作手套", "保暖手套推荐", "运动训练手套"],
    wechat_channel: ["视频号手套介绍", "企业采购手套", "手套保养技巧", "防寒手套清单", "手套选购指南"],
    xiaohongshu: ["小红书手套种草", "通勤防护手套", "户外手套笔记", "手套选购经验", "真实使用反馈"]
  }[platform] || ["平台内容"];

  return Array.from({ length: count }, (_, index) => {
    const title = `${baseTitles[index % baseTitles.length]} - 最新内容 ${index + 1}`;
    return {
      id: `${platform}_latest_${index + 1}`,
      platform,
      title,
      author: `${platformName(platform)}内容源`,
      views: 68000 + index * 7300,
      likes: 12000 + index * 860,
      duration: ["02:35", "01:48", "03:12", "02:05", "00:58"][index % 5],
      tags: ["手套", "最新10条"],
      status: "simulated",
      copy: `${title}：用于本地演示的最新内容，不代表平台真实抓取结果。`
    };
  });
}

function getPlatformReview(platform) {
  return store.merchantOnboarding.platforms.find((item) => item.platform === platform) || null;
}

function platformSearchState(platform) {
  if (platform === "douyin") {
    const douyin = getDouyinOAuthStatus();
    if (douyin.configured) {
      return {
        platform,
        platformName: "抖音",
        mode: "official_ready",
        status: douyin.authorized ? "authorized" : "app_configured",
        canUseOfficialApi: true,
        message: douyin.authorized
          ? `抖音已授权：${douyin.account.nickname || douyin.openIdMasked || "账号已连接"}，优先使用真实接口搜索。`
          : "抖音应用密钥已配置：优先使用官方关键词搜索接口；账号授权后可同步账号信息。"
      };
    }
  }
  const review = getPlatformReview(platform);
  if (store.session.userType !== "merchant") {
    return {
      platform,
      platformName: platformName(platform),
      mode: "mock",
      status: "anonymous_mock",
      canUseOfficialApi: false,
      message: "未登录或个人模式：返回本地模拟最新10条内容。"
    };
  }
  if (!review || !review.applicationNo) {
    return {
      platform,
      platformName: platformName(platform),
      mode: "mock",
      status: "merchant_not_submitted",
      canUseOfficialApi: false,
      message: "商户尚未提交该平台审核：先返回本地模拟最新10条内容。"
    };
  }
  if (review.status === "reviewing") {
    return {
      platform,
      platformName: review.platformName,
      mode: "reviewing",
      status: "reviewing",
      canUseOfficialApi: false,
      reviewDate: review.reviewDate,
      message: `平台审核中，预计 ${review.reviewDate} 完成；暂不能获取真实平台数据。`
    };
  }
  if (review.status === "approved") {
    return {
      platform,
      platformName: review.platformName,
      mode: "official_ready",
      status: "approved",
      canUseOfficialApi: true,
      reviewDate: review.reviewDate,
      message: "平台审核已通过：当前为官方接口模式占位，接入真实 App Key / Secret 后可切换真实数据。"
    };
  }

  return {
    platform,
    platformName: review.platformName,
    mode: "mock",
    status: review.status,
    canUseOfficialApi: false,
    message: "平台资料未完成：返回本地模拟最新10条内容。"
  };
}

export async function searchLatestContents(query = {}) {
  const platform = String(query.platform || "all");
  const keyword = String(query.keyword || "").trim().toLowerCase();
  const platforms = platform === "all" ? ["douyin", "kuaishou", "wechat_channel", "xiaohongshu"] : [platform];
  const states = platforms.map(platformSearchState);
  const blockedByReview = states.some((item) => item.status === "reviewing");
  let items = [];
  let officialError = "";

  if (!blockedByReview) {
    const useOfficialDouyin = platforms.includes("douyin") && states.find((item) => item.platform === "douyin")?.canUseOfficialApi && keyword;
    if (useOfficialDouyin) {
      try {
        const result = await searchDouyinVideos({ keyword, count: 10 });
        items.push(...result.items);
      } catch (error) {
        officialError = error instanceof Error ? error.message : "抖音真实搜索失败";
      }
    }

    const mockPlatforms = platforms.filter((item) => item !== "douyin" || !states.find((state) => state.platform === "douyin")?.canUseOfficialApi || !keyword);
    items.push(...mockPlatforms.flatMap((item) => buildLatestItems(item, 10)));
    items = items
      .filter((item) => {
        if (!keyword) return true;
        return [item.title, item.author, item.tags.join(" ")].join(" ").toLowerCase().includes(keyword);
      })
      .slice(0, platform === "all" ? 40 : 10);
  }

  return {
    mode: officialError ? "official_error" : states.some((item) => item.mode === "official_ready") ? "official_ready" : states.some((item) => item.mode === "reviewing") ? "reviewing" : "mock",
    platforms: officialError
      ? states.map((item) => item.platform === "douyin" ? { ...item, mode: "official_error", status: "official_error", message: officialError } : item)
      : states,
    limitPerPlatform: 10,
    items
  };
}

export function importContent(payload) {
  const title = String(payload.title || "").trim();
  const platform = String(payload.platform || "douyin").trim();
  if (!title) {
    throw new Error("内容标题不能为空");
  }

  const item = {
    id: `vid_${store.contents.length + 1}_${Date.now()}`,
    platform,
    title,
    author: `${platformName(platform)}导入`,
    views: 0,
    likes: 0,
    duration: "00:00",
    tags: ["手动导入"],
    status: "draft"
  };
  store.contents.unshift(item);
  return item;
}
