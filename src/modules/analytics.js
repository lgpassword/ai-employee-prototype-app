import { db } from "../db/index.js";

function aiTaskRoi() {
  const taskCount = (db.tasks || []).length;
  const completedCount = (db.tasks || []).filter((task) => task.status === "completed").length;
  const modelCost = (db.costRecords || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const videoCount = (db.generatedVideos || []).filter((item) => item.renderTask).length;
  const estimatedValue = completedCount * 38 + videoCount * 58;
  return {
    taskCount,
    completedCount,
    videoCount,
    modelCost: Number(modelCost.toFixed(2)),
    estimatedValue,
    roi: modelCost ? Number((estimatedValue / modelCost).toFixed(2)) : estimatedValue
  };
}

// 经营分析模块：提供经营看板、转化漏斗、平台占比和诊断建议。
export function getOperationsDashboard() {
  const roi = aiTaskRoi();
  return {
    metrics: {
      gmv: 1284200,
      orders: 2846,
      avgOrderValue: 451,
      conversionRate: 6.8,
      healthScore: 82
    },
    platformShare: [
      { platform: "抖音", value: 45 },
      { platform: "快手", value: 32 },
      { platform: "视频号", value: 18 },
      { platform: "小红书", value: 5 }
    ],
    funnel: [
      { stage: "曝光", value: 420000, rate: 100 },
      { stage: "点击", value: 82000, rate: 19.5 },
      { stage: "商品详情", value: 36800, rate: 8.8 },
      { stage: "加购", value: 9400, rate: 2.2 },
      { stage: "支付", value: 2846, rate: 0.68 }
    ],
    trend: [
      { label: "周一", gmv: 138000, orders: 302 },
      { label: "周二", gmv: 162000, orders: 348 },
      { label: "周三", gmv: 151000, orders: 321 },
      { label: "周四", gmv: 193000, orders: 416 },
      { label: "周五", gmv: 226000, orders: 498 },
      { label: "周六", gmv: 242000, orders: 531 },
      { label: "周日", gmv: 172000, orders: 430 }
    ],
    suggestions: [
      { level: "高", title: "点击到详情流失偏高", reason: "视频封面和商品首图卖点不一致", action: "统一首屏卖点，突出防滑耐磨场景。" },
      { level: "中", title: "视频号成交占比偏低", reason: "内容种草强但转化承接弱", action: "增加企业采购咨询入口和客服快捷回复。" },
      { level: "中", title: "周末 GMV 高峰明显", reason: "直播间成交集中在周末", action: "提前 2 天准备库存和达人预热视频。" }
    ],
    productPerformance: [
      { name: "专业防护手套", sales: 12840, stock: 620, daysInStock: 9 },
      { name: "冬季保暖手套", sales: 9630, stock: 1880, daysInStock: 22 },
      { name: "儿童防寒手套", sales: 4210, stock: 1450, daysInStock: 38 }
    ],
    behaviorPaths: [
      { path: "短视频 → 商品详情 → 下单", percent: 36 },
      { path: "直播间 → 咨询 → 下单", percent: 28 },
      { path: "搜索 → 商品详情 → 加购 → 支付", percent: 18 }
    ],
    aiRoi: roi,
    aiSuggestions: [
      { title: "AI 任务价值", detail: `已完成 ${roi.completedCount}/${roi.taskCount} 个 AI 任务，估算产出 ¥${roi.estimatedValue}。` },
      { title: "模型成本", detail: `当前记录成本 ¥${roi.modelCost}，ROI ${roi.roi}。` },
      { title: "内容产能", detail: `已产出 ${roi.videoCount} 条可追踪视频，可继续关联发布和成交数据。` }
    ]
  };
}

