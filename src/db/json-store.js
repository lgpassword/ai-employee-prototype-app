import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { store } from "../store.js";

/** 项目根目录，用于定位本地运行时数据目录。 */
const projectDir = fileURLToPath(new URL("../../", import.meta.url));
/** 本地快照文件路径；`.local` 已在 `.gitignore` 中排除。 */
const snapshotPath = join(projectDir, ".local", "store.json");
/** 最近一次持久化操作状态，供接口和日志展示。 */
let lastPersistenceStatus = {
  mode: "local-json",
  loaded: false,
  saved: false,
  path: snapshotPath,
  message: "尚未执行持久化操作"
};

/** 判断一个值是否为普通对象，避免把数组当作对象递归合并。 */
function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/** 深度合并快照数据；数组按业务集合整体替换，保留新增默认字段。 */
function mergeState(target, source) {
  Object.entries(source || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      target[key] = value;
      return;
    }
    if (isPlainObject(value) && isPlainObject(target[key])) {
      mergeState(target[key], value);
      return;
    }
    target[key] = value;
  });
}

/** 构造可写入磁盘的业务快照；全局登录态不持久化。 */
function buildSnapshot() {
  const { session, ...businessState } = store;
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    state: JSON.parse(JSON.stringify(businessState))
  };
}

/** 服务启动时加载本地业务快照。 */
export function loadPersistentStore() {
  if (!existsSync(snapshotPath)) {
    lastPersistenceStatus = {
      mode: "local-json",
      loaded: false,
      saved: false,
      path: snapshotPath,
      message: "未发现本地快照，使用内置演示数据启动"
    };
    return lastPersistenceStatus;
  }

  try {
    const snapshot = JSON.parse(readFileSync(snapshotPath, "utf8"));
    if (!isPlainObject(snapshot.state)) {
      throw new Error("快照格式缺少 state 对象");
    }
    mergeState(store, snapshot.state);
    lastPersistenceStatus = {
      mode: "local-json",
      loaded: true,
      saved: false,
      path: snapshotPath,
      savedAt: snapshot.savedAt || "",
      message: "已加载本地业务快照"
    };
  } catch (error) {
    lastPersistenceStatus = {
      mode: "local-json",
      loaded: false,
      saved: false,
      path: snapshotPath,
      message: `本地快照加载失败：${error instanceof Error ? error.message : "未知错误"}`
    };
  }
  return lastPersistenceStatus;
}

/** API 请求完成后保存业务快照。 */
export function savePersistentStore() {
  mkdirSync(dirname(snapshotPath), { recursive: true });
  const snapshot = buildSnapshot();
  writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  lastPersistenceStatus = {
    mode: "local-json",
    loaded: lastPersistenceStatus.loaded,
    saved: true,
    path: snapshotPath,
    savedAt: snapshot.savedAt,
    message: "已保存本地业务快照"
  };
  return lastPersistenceStatus;
}

/** 返回当前持久化层运行状态。 */
export function getPersistenceStatus() {
  return {
    ...lastPersistenceStatus,
    snapshotExists: existsSync(snapshotPath)
  };
}
