import { nextId as buildNextId, platformName as resolvePlatformName, store } from "./state.js";

/** 数据库状态代理：业务模块只能通过该门面访问运行时数据。 */
export const db = new Proxy(
  {},
  {
    /** 读取指定数据域，例如 `db.users`、`db.accounts`。 */
    get(_target, property) {
      return store[property];
    },
    /** 替换指定数据域，例如登录模块重置 `db.session`。 */
    set(_target, property, value) {
      store[property] = value;
      return true;
    }
  }
);

/** 返回完整数据库状态，仅允许数据库内部模块和迁移工具使用。 */
export function getDatabaseState() {
  return store;
}

/** 生成业务集合的本地 ID，后续可替换为数据库自增或雪花 ID。 */
export function nextId(prefix, collection) {
  return buildNextId(prefix, collection);
}

/** 将平台编码转换为展示名称。 */
export function platformName(code) {
  return resolvePlatformName(code);
}
