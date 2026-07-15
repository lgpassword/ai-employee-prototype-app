import { platformName } from "../store.js";

// 达人合作模块：负责达人筛选、详情和合作流程的本地闭环。
const creators = [
  {
    id: "creator_anna",
    name: "安娜测评",
    platform: "douyin",
    category: "劳保测评",
    fans: 820000,
    avgViews: 156000,
    engagementRate: 8.6,
    matchScore: 94,
    quote: 18000,
    cooperationStatus: "可邀约",
    strengths: ["真实测评", "工厂场景", "转化稳定"],
    audience: { male: 68, female: 32, coreAge: "25-40", cityTier: "二三线" },
    contact: { method: "抖音星图私信", account: "dy_anna_review", responseTime: "预计 24 小时内回复" },
    recentVideos: [
      { title: "防滑手套实测", views: 218000, interaction: 18600 },
      { title: "工地劳保用品清单", views: 174000, interaction: 14200 }
    ],
    suggestion: "适合专业防护手套首轮测评投放。"
  },
  {
    id: "creator_bao",
    name: "宝妈好物间",
    platform: "kuaishou",
    category: "家庭好物",
    fans: 560000,
    avgViews: 98000,
    engagementRate: 7.2,
    matchScore: 82,
    quote: 12000,
    cooperationStatus: "待沟通",
    strengths: ["家庭场景", "亲和讲解", "复购粉丝"],
    audience: { male: 21, female: 79, coreAge: "28-38", cityTier: "三四线" },
    contact: { method: "快手磁力聚星邀约", account: "ks_mom_goods", responseTime: "预计 1-2 天回复" },
    recentVideos: [
      { title: "冬季出门保暖清单", views: 132000, interaction: 9100 },
      { title: "孩子上学防寒装备", views: 87000, interaction: 6500 }
    ],
    suggestion: "适合冬季保暖手套和儿童手套组合投放。"
  },
  {
    id: "creator_fit",
    name: "老周健身房",
    platform: "wechat_channel",
    category: "运动健身",
    fans: 310000,
    avgViews: 64000,
    engagementRate: 6.9,
    matchScore: 78,
    quote: 9000,
    cooperationStatus: "可邀约",
    strengths: ["垂直人群", "专业讲解", "高客单"],
    audience: { male: 74, female: 26, coreAge: "22-35", cityTier: "一二线" },
    contact: { method: "视频号机构服务商联系", account: "channels_zhou_fit", responseTime: "预计 48 小时内回复" },
    recentVideos: [
      { title: "硬拉如何保护手掌", views: 74000, interaction: 5400 },
      { title: "骑行训练装备推荐", views: 59000, interaction: 4300 }
    ],
    suggestion: "适合运动健身手套内容种草。"
  },
  {
    id: "creator_redbook",
    name: "露露好物笔记",
    platform: "xiaohongshu",
    category: "生活方式",
    fans: 240000,
    avgViews: 52000,
    engagementRate: 9.4,
    matchScore: 81,
    quote: 7600,
    cooperationStatus: "可邀约",
    strengths: ["真实笔记", "女性用户", "种草互动"],
    audience: { male: 18, female: 82, coreAge: "23-34", cityTier: "一二线" },
    contact: { method: "小红书蒲公英平台邀约", account: "red_lulu_goods", responseTime: "预计 1 天内回复" },
    recentVideos: [
      { title: "通勤防护手套真实体验", views: 69000, interaction: 8100 },
      { title: "户外好物清单", views: 58000, interaction: 6200 }
    ],
    suggestion: "适合小红书种草笔记和通勤场景内容。"
  }
];

const cooperationRecords = [];

function buildCooperationSteps(creator) {
  return [
    {
      title: "确认平台与联系人",
      status: "done",
      detail: `${platformName(creator.platform)} · ${creator.contact.method} · ${creator.contact.account}`
    },
    {
      title: "发送合作方案",
      status: "active",
      detail: "发送商品卖点、佣金、样品寄送和发布时间要求。"
    },
    {
      title: "确认报价与排期",
      status: "pending",
      detail: `参考报价 ¥${creator.quote.toLocaleString("zh-CN")}，等待达人确认。`
    },
    {
      title: "寄样与内容审核",
      status: "pending",
      detail: "确认样品收货后，审核脚本、分镜和发布文案。"
    },
    {
      title: "发布与复盘",
      status: "pending",
      detail: "发布后回收播放、互动、成交和评论数据。"
    }
  ];
}

function publicCreator(item) {
  return {
    ...item,
    platformName: platformName(item.platform)
  };
}

export function listCreators(query = {}) {
  const keyword = String(query.keyword || "").trim().toLowerCase();
  const platform = String(query.platform || "all");
  const items = creators.filter((item) => {
    const matchedKeyword = !keyword || [item.name, item.category, item.strengths.join(" ")].join(" ").toLowerCase().includes(keyword);
    const matchedPlatform = platform === "all" || item.platform === platform;
    return matchedKeyword && matchedPlatform;
  });
  return {
    summary: {
      creatorCount: items.length,
      avgMatchScore: Math.round(items.reduce((sum, item) => sum + item.matchScore, 0) / Math.max(items.length, 1)),
      avgEngagement: Number((items.reduce((sum, item) => sum + item.engagementRate, 0) / Math.max(items.length, 1)).toFixed(1)),
      pendingCooperations: cooperationRecords.length
    },
    items: items.map(publicCreator),
    cooperationRecords
  };
}

export function getCreatorDetail(id) {
  const item = creators.find((creator) => creator.id === id);
  if (!item) {
    throw new Error("达人不存在");
  }
  return {
    ...publicCreator(item),
    cooperationSteps: buildCooperationSteps(item)
  };
}

export function startCooperation(id) {
  const creator = creators.find((item) => item.id === id);
  if (!creator) {
    throw new Error("达人不存在");
  }
  const record = {
    id: `coop_${cooperationRecords.length + 1}_${Date.now()}`,
    creatorId: creator.id,
    creatorName: creator.name,
    platform: creator.platform,
    platformName: platformName(creator.platform),
    contactMethod: creator.contact.method,
    contactAccount: creator.contact.account,
    responseTime: creator.contact.responseTime,
    status: "待发送合作方案",
    nextAction: "确认商品、佣金和发布时间",
    steps: buildCooperationSteps(creator),
    createdAt: new Date().toISOString()
  };
  cooperationRecords.unshift(record);
  creator.cooperationStatus = "合作洽谈中";
  return record;
}
