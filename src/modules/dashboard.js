import { store } from "../store.js";

// 仪表板模块：只聚合原型中出现的核心指标和平台概览。
export function getDashboard() {
  const totalViews = store.contents.reduce((sum, item) => sum + item.views, 0);
  const totalLikes = store.contents.reduce((sum, item) => sum + item.likes, 0);
  const totalFans = store.accounts.reduce((sum, item) => sum + item.fans, 0);

  return {
    stats: {
      totalViews,
      totalLikes,
      videoCount: store.contents.length + store.generatedVideos.length,
      totalFans
    },
    trend: [
      { date: "周一", views: 12000, likes: 830 },
      { date: "周二", views: 18000, likes: 1120 },
      { date: "周三", views: 15000, likes: 990 },
      { date: "周四", views: 22000, likes: 1480 },
      { date: "周五", views: 28000, likes: 1960 },
      { date: "周六", views: 32000, likes: 2260 },
      { date: "周日", views: 26000, likes: 1810 }
    ],
    platforms: store.accounts.map((account) => ({
      platform: account.platform,
      platformName: account.platformName,
      accountName: account.accountName,
      status: account.status,
      fans: account.fans,
      videos: account.videos
    }))
  };
}
