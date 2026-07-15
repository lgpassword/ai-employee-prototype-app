import { db } from "../db/index.js";

// 直播数据模块：对应原型“直播数据”页面，只维护直播实时指标和趋势。
export function getLiveDashboard() {
  return db.live;
}

