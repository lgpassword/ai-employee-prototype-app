// 订单库存模块：负责订单聚合、库存预警和售后列表的本地闭环。
const orders = [
  { id: "order_1001", orderNo: "DY20260714001", platform: "抖音", customer: "张三", product: "专业防护手套", amount: 236, status: "待发货", createdAt: "2026-07-14 09:12", address: "广东省深圳市" },
  { id: "order_1002", orderNo: "KS20260714002", platform: "快手", customer: "李四", product: "冬季保暖手套", amount: 117, status: "已发货", createdAt: "2026-07-14 10:08", address: "吉林省长春市" },
  { id: "order_1003", orderNo: "WX20260714003", platform: "视频号", customer: "王五", product: "运动健身手套", amount: 158, status: "待退款", createdAt: "2026-07-14 11:30", address: "上海市浦东新区" }
];

const inventory = [
  { sku: "SKU-GLOVE-PRO", product: "专业防护手套", stock: 620, safeStock: 300, status: "正常", warehouse: "华南仓" },
  { sku: "SKU-WARM-GLV", product: "冬季保暖手套", stock: 1880, safeStock: 1200, status: "正常", warehouse: "华北仓" },
  { sku: "SKU-KIDS-GLV", product: "儿童防寒手套", stock: 1450, safeStock: 1800, status: "低库存", warehouse: "华东仓" },
  { sku: "SKU-SPORT-GLV", product: "运动健身手套", stock: 86, safeStock: 180, status: "缺货预警", warehouse: "华南仓" }
];

const afterSales = [
  { id: "as_1", orderNo: "WX20260714003", reason: "尺码不合适", status: "待审核", amount: 158 },
  { id: "as_2", orderNo: "DY20260712018", reason: "物流破损", status: "已补发", amount: 59 }
];

export function getOrderInventoryDashboard() {
  return {
    summary: {
      waitingShipment: orders.filter((item) => item.status === "待发货").length,
      shipped: orders.filter((item) => item.status === "已发货").length,
      refunding: orders.filter((item) => item.status === "待退款").length,
      warningSku: inventory.filter((item) => item.status !== "正常").length
    },
    orders,
    inventory,
    afterSales
  };
}

export function getOrderDetail(id) {
  const item = orders.find((order) => order.id === id);
  if (!item) {
    throw new Error("订单不存在");
  }
  return item;
}

export function markOrderShipped(id) {
  const item = getOrderDetail(id);
  item.status = "已发货";
  return item;
}
