// 团队权限模块：负责成员、角色、权限说明和操作日志的本地闭环。
const roles = [
  { id: "owner", name: "店铺负责人", permissions: ["全部数据", "平台配置", "财务查看", "成员管理"] },
  { id: "operator", name: "内容运营", permissions: ["内容搜索", "AI视频生成", "发布计划", "达人合作"] },
  { id: "service", name: "客服", permissions: ["客户会话", "客户标签", "快捷回复"] },
  { id: "finance", name: "财务", permissions: ["财务报表", "对账管理", "资金流水"] }
];

const members = [
  { id: "member_1", name: "刘刚", phone: "138****0001", roleId: "owner", status: "正常", lastActive: "今天 09:30" },
  { id: "member_2", name: "内容小王", phone: "139****0002", roleId: "operator", status: "正常", lastActive: "今天 10:12" },
  { id: "member_3", name: "客服小李", phone: "137****0003", roleId: "service", status: "正常", lastActive: "昨天 18:40" }
];

const auditLogs = [
  { id: "log_1", operator: "刘刚", action: "保存视频供应商配置", module: "系统配置", time: "2026-07-14 09:26" },
  { id: "log_2", operator: "内容小王", action: "创建发布计划", module: "内容运营", time: "2026-07-14 10:14" },
  { id: "log_3", operator: "客服小李", action: "采纳 AI 回复", module: "客户管理", time: "2026-07-14 10:36" }
];

export function getTeamDashboard() {
  return {
    members: members.map((member) => ({
      ...member,
      roleName: roles.find((role) => role.id === member.roleId)?.name || member.roleId
    })),
    roles,
    auditLogs
  };
}

export function updateMemberRole(memberId, roleId) {
  const member = members.find((item) => item.id === memberId);
  const role = roles.find((item) => item.id === roleId);
  if (!member || !role) {
    throw new Error("成员或角色不存在");
  }
  member.roleId = role.id;
  auditLogs.unshift({
    id: `log_${auditLogs.length + 1}_${Date.now()}`,
    operator: "当前用户",
    action: `调整 ${member.name} 为 ${role.name}`,
    module: "团队权限",
    time: new Date().toLocaleString("zh-CN", { hour12: false })
  });
  return {
    ...member,
    roleName: role.name
  };
}

export function addTeamMember(payload) {
  const name = String(payload.name || "").trim();
  const phone = String(payload.phone || "").trim();
  const roleId = String(payload.roleId || "operator").trim();
  const role = roles.find((item) => item.id === roleId) || roles.find((item) => item.id === "operator");
  if (!name) {
    throw new Error("成员姓名不能为空");
  }
  const member = {
    id: `member_${members.length + 1}_${Date.now()}`,
    name,
    phone: phone || "未填写",
    roleId: role.id,
    status: "待激活",
    lastActive: "尚未登录"
  };
  members.unshift(member);
  auditLogs.unshift({
    id: `log_${auditLogs.length + 1}_${Date.now()}`,
    operator: "当前用户",
    action: `添加成员 ${member.name}`,
    module: "团队权限",
    time: new Date().toLocaleString("zh-CN", { hour12: false })
  });
  return {
    ...member,
    roleName: role.name
  };
}

