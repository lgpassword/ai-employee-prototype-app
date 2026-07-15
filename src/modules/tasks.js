import { db, nextId, platformName } from "../db/index.js";

const taskTemplates = {
  video: ["分析商品卖点", "生成脚本和分镜", "创建视频渲染任务", "生成发布建议"],
  customer: ["检索企业知识库", "生成客服回复", "提交人工审批"],
  publishing: ["检查平台授权", "生成发布计划", "提交发布审批"],
  analytics: ["读取经营指标", "计算 ROI", "生成经营建议"],
  order: ["识别售后风险", "生成处理建议", "提交订单动作审批"]
};

function riskForType(type) {
  return ["publishing", "customer", "order"].includes(type) ? "high" : "medium";
}

function createCostRecord(task, model = "local-planner", amount = 0.02) {
  const record = {
    id: nextId("cost", db.costRecords),
    taskId: task.id,
    provider: "workflow",
    model,
    amount,
    currency: "CNY",
    createdAt: new Date().toISOString()
  };
  db.costRecords.unshift(record);
  return record;
}

function createToolCall(task, name, input = {}) {
  const item = {
    id: nextId("tool", db.toolCalls),
    taskId: task.id,
    name,
    input,
    status: "completed",
    output: { message: `${name} 已完成` },
    createdAt: new Date().toISOString()
  };
  db.toolCalls.unshift(item);
  return item;
}

export function listTasks() {
  return db.tasks || [];
}

export function getTask(id) {
  const task = listTasks().find((item) => item.id === id);
  if (!task) return null;
  return {
    ...task,
    steps: db.taskSteps.filter((step) => step.taskId === task.id),
    toolCalls: db.toolCalls.filter((call) => call.taskId === task.id),
    approvals: db.approvalRequests.filter((approval) => approval.taskId === task.id),
    costs: db.costRecords.filter((cost) => cost.taskId === task.id)
  };
}

export function createAgentTask(payload = {}) {
  db.tasks ||= [];
  db.taskSteps ||= [];
  db.toolCalls ||= [];
  db.approvalRequests ||= [];
  db.costRecords ||= [];
  const type = String(payload.type || "video").trim();
  const goal = String(payload.goal || payload.title || "").trim();
  if (!goal) throw new Error("任务目标不能为空");
  const task = {
    id: nextId("task", db.tasks),
    title: goal.slice(0, 36),
    goal,
    type,
    status: riskForType(type) === "high" ? "pending_approval" : "running",
    riskLevel: riskForType(type),
    platform: String(payload.platform || "douyin").trim(),
    platformName: platformName(String(payload.platform || "douyin").trim()),
    result: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  db.tasks.unshift(task);
  const steps = (taskTemplates[type] || taskTemplates.video).map((name, index) => ({
    id: nextId("step", db.taskSteps),
    taskId: task.id,
    name,
    status: index === 0 ? "completed" : task.status === "pending_approval" ? "waiting_approval" : "running",
    order: index + 1,
    result: index === 0 ? "已完成初步分析" : "",
    createdAt: new Date().toISOString()
  }));
  db.taskSteps.unshift(...steps);
  createToolCall(task, "business_goal_parser", { goal, type });
  createCostRecord(task);
  if (task.riskLevel === "high") {
    db.approvalRequests.unshift({
      id: nextId("approval", db.approvalRequests),
      taskId: task.id,
      actionType: type,
      riskLevel: "high",
      title: `审批：${task.title}`,
      content: goal,
      status: "pending",
      createdAt: new Date().toISOString(),
      decidedAt: ""
    });
  } else {
    task.status = "completed";
    task.result = "AI 已完成任务拆解和建议生成。";
    steps.forEach((step) => {
      step.status = "completed";
      step.result ||= "已完成";
    });
  }
  return getTask(task.id);
}

export function getAgentActivityLog() {
  return [...db.toolCalls, ...db.costRecords].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
