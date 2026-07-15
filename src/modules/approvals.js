import { db } from "../db/index.js";

export function listApprovalRequests() {
  return db.approvalRequests || [];
}

function findApproval(id) {
  return listApprovalRequests().find((item) => item.id === id);
}

export function approveRequest(id, payload = {}) {
  const item = findApproval(id);
  if (!item) throw new Error("审批单不存在");
  item.status = "approved";
  item.decision = String(payload.decision || "批准").trim();
  item.editedContent = String(payload.editedContent || "").trim();
  item.decidedAt = new Date().toISOString();
  const task = db.tasks.find((candidate) => candidate.id === item.taskId);
  if (task) {
    task.status = "completed";
    task.result = item.editedContent || item.content;
    task.updatedAt = item.decidedAt;
    db.taskSteps.filter((step) => step.taskId === task.id).forEach((step) => {
      step.status = "completed";
      step.result ||= "审批通过后执行完成";
    });
  }
  return item;
}

export function rejectRequest(id, payload = {}) {
  const item = findApproval(id);
  if (!item) throw new Error("审批单不存在");
  item.status = "rejected";
  item.decision = String(payload.reason || "驳回").trim();
  item.decidedAt = new Date().toISOString();
  const task = db.tasks.find((candidate) => candidate.id === item.taskId);
  if (task) {
    task.status = "failed";
    task.result = item.decision;
    task.updatedAt = item.decidedAt;
  }
  return item;
}
