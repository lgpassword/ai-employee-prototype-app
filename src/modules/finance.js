// 财务结算模块：负责收入、成本、利润、对账和流水的本地闭环。
export function getFinanceDashboard() {
  return {
    summary: {
      income: 1284200,
      cost: 746000,
      profit: 538200,
      pendingSettlement: 186400
    },
    trend: [
      { label: "3月", income: 720000, profit: 260000 },
      { label: "4月", income: 830000, profit: 318000 },
      { label: "5月", income: 960000, profit: 392000 },
      { label: "6月", income: 1140000, profit: 486000 },
      { label: "7月", income: 1284200, profit: 538200 }
    ],
    platformSettlement: [
      { platform: "抖音", income: 578000, fee: 34680, settlementStatus: "待结算" },
      { platform: "快手", income: 410000, fee: 24600, settlementStatus: "已结算" },
      { platform: "视频号", income: 231000, fee: 11550, settlementStatus: "待结算" }
    ],
    reconciliations: [
      { id: "rec_1", platform: "抖音", date: "2026-07-13", systemAmount: 186200, platformAmount: 185760, diff: 440, status: "异常待处理" },
      { id: "rec_2", platform: "快手", date: "2026-07-13", systemAmount: 124800, platformAmount: 124800, diff: 0, status: "已对平" }
    ],
    transactions: [
      { id: "tx_1", type: "收入", title: "抖音订单结算", amount: 58200, date: "2026-07-14" },
      { id: "tx_2", type: "成本", title: "达人投放费用", amount: -18000, date: "2026-07-14" },
      { id: "tx_3", type: "成本", title: "平台技术服务费", amount: -3460, date: "2026-07-13" }
    ]
  };
}
