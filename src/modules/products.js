import { platformName } from "../db/index.js";

// 商品选品模块：负责选品榜单、商品详情、竞品、多平台链接和带货视频的本地闭环数据。
const productCatalog = [
  {
    id: "prod_glove_pro",
    name: "专业防护手套",
    category: "劳保防护",
    platform: "douyin",
    price: 59,
    commissionRate: 22,
    salesCount: 12840,
    gmv: 757560,
    growthRate: 38,
    marginRate: 31,
    hotScore: 96,
    risk: "低",
    tags: ["高转化", "复购稳定", "适合直播"],
    trend: [42000, 51000, 68000, 82000, 96000, 113000, 128000],
    videos: [
      { title: "工厂实测防滑耐磨", views: 186000, conversionRate: 7.8 },
      { title: "骑行防风防滑场景", views: 142000, conversionRate: 6.9 },
      { title: "直播间批量采购讲解", views: 98000, conversionRate: 9.1 }
    ],
    competitors: [
      { name: "耐磨王手套", price: 49, gmv: 498200, score: 88 },
      { name: "工匠防护手套", price: 69, gmv: 452100, score: 82 }
    ],
    insight: "价格带适中、素材场景清晰，适合作为直播间主推款。"
  },
  {
    id: "prod_warm_glove",
    name: "冬季保暖手套",
    category: "季节服饰",
    platform: "kuaishou",
    price: 39,
    commissionRate: 18,
    salesCount: 9630,
    gmv: 375570,
    growthRate: 24,
    marginRate: 28,
    hotScore: 88,
    risk: "中",
    tags: ["季节爆发", "低客单", "适合短视频"],
    trend: [28000, 33000, 47000, 56000, 62000, 76000, 89000],
    videos: [
      { title: "东北户外保暖测试", views: 121000, conversionRate: 5.8 },
      { title: "通勤骑车不冻手", views: 93000, conversionRate: 5.1 }
    ],
    competitors: [
      { name: "羊绒触屏手套", price: 45, gmv: 331000, score: 80 },
      { name: "加绒骑行手套", price: 42, gmv: 295000, score: 76 }
    ],
    insight: "季节性强，需要结合天气节点投放，库存预警要提前设置。"
  },
  {
    id: "prod_sport_glove",
    name: "运动健身手套",
    category: "运动户外",
    platform: "wechat_channel",
    price: 79,
    commissionRate: 20,
    salesCount: 6840,
    gmv: 540360,
    growthRate: 19,
    marginRate: 35,
    hotScore: 84,
    risk: "低",
    tags: ["高毛利", "人群精准", "内容种草"],
    trend: [36000, 41000, 45000, 52000, 61000, 69000, 74000],
    videos: [
      { title: "健身房硬拉防磨手", views: 87000, conversionRate: 6.2 },
      { title: "骑行和器械训练两用", views: 65000, conversionRate: 5.6 }
    ],
    competitors: [
      { name: "专业健身护掌", price: 89, gmv: 420000, score: 78 },
      { name: "骑行半指手套", price: 69, gmv: 365000, score: 74 }
    ],
    insight: "内容需要突出专业场景，达人测评比纯商品展示更有效。"
  },
  {
    id: "prod_kids_glove",
    name: "儿童防寒手套",
    category: "母婴儿童",
    platform: "douyin",
    price: 35,
    commissionRate: 16,
    salesCount: 4210,
    gmv: 147350,
    growthRate: 12,
    marginRate: 24,
    hotScore: 72,
    risk: "中",
    tags: ["亲子场景", "复购弱", "库存谨慎"],
    trend: [18000, 21000, 24000, 26000, 32000, 39000, 43000],
    videos: [
      { title: "上学路上保暖搭配", views: 54000, conversionRate: 4.4 }
    ],
    competitors: [
      { name: "卡通儿童手套", price: 29, gmv: 126000, score: 68 }
    ],
    insight: "适合做搭配款，不建议单独作为主推爆品。"
  }
];

const productPlatforms = ["douyin", "kuaishou", "wechat_channel", "xiaohongshu"];

function platformDomain(platform) {
  return {
    douyin: "https://www.douyin.com/search/",
    kuaishou: "https://www.kuaishou.com/search/video?searchKey=",
    wechat_channel: "https://channels.weixin.qq.com/",
    xiaohongshu: "https://www.xiaohongshu.com/search_result?keyword="
  }[platform] || "https://www.baidu.com/s?wd=";
}

function buildPlatformLinks(product) {
  return productPlatforms.map((platform) => {
    const links = Array.from({ length: 10 }, (_, index) => {
      const keyword = encodeURIComponent(`${product.name} ${platformName(platform)} 同款 ${index + 1}`);
      return {
        id: `${product.id}_${platform}_${index + 1}`,
        title: `${platformName(platform)}同款链接 ${index + 1}`,
        url: `${platformDomain(platform)}${keyword}`,
        price: Math.max(9, product.price + (index % 5 - 2) * 3),
        salesCount: Math.max(200, Math.round(product.salesCount * (0.12 - index * 0.005))),
        hotScore: Math.max(60, product.hotScore - index)
      };
    });
    return {
      platform,
      platformName: platformName(platform),
      avgPrice: Math.round(links.reduce((sum, item) => sum + item.price, 0) / links.length),
      totalSales: links.reduce((sum, item) => sum + item.salesCount, 0),
      links
    };
  });
}

function publicProduct(product) {
  return {
    ...product,
    platformAnalysis: buildPlatformLinks(product).map((item) => ({
      platform: item.platform,
      platformName: item.platformName,
      avgPrice: item.avgPrice,
      totalSales: item.totalSales,
      linkCount: item.links.length
    }))
  };
}

export function listProducts(query = {}) {
  const keyword = String(query.keyword || "").trim().toLowerCase();
  const category = String(query.category || "all");
  const platform = String(query.platform || "all");
  const items = productCatalog.filter((item) => {
    const matchedKeyword = !keyword || [item.name, item.category, item.tags.join(" ")].join(" ").toLowerCase().includes(keyword);
    const matchedCategory = category === "all" || item.category === category;
    const matchedPlatform = platform === "all" || item.platform === platform;
    return matchedKeyword && matchedCategory && matchedPlatform;
  });

  return {
    summary: {
      totalProducts: items.length,
      avgHotScore: Math.round(items.reduce((sum, item) => sum + item.hotScore, 0) / Math.max(items.length, 1)),
      totalGmv: items.reduce((sum, item) => sum + item.gmv, 0),
      highGrowthCount: items.filter((item) => item.growthRate >= 20).length
    },
    categories: [...new Set(productCatalog.map((item) => item.category))],
    items: items.map(publicProduct)
  };
}

export function getProductDetail(id) {
  const item = productCatalog.find((product) => product.id === id);
  if (!item) {
    throw new Error("商品不存在");
  }
  return {
    ...publicProduct(item),
    platformLinks: buildPlatformLinks(item)
  };
}

