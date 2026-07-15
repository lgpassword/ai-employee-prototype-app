import { db } from "../db/index.js";

// 销售分析模块：对应原型“销售分析”页面，提供销售指标、趋势和产品排行。
export function getSalesDashboard() {
  return db.sales;
}

