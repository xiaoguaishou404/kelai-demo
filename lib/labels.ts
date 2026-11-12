import type { AlertDecision, DimensionId, HopMark, Role, SubmissionStatus } from "./types";

export const DIMENSIONS: {
  id: DimensionId;
  label: string;
  hint: string;
  required: boolean;
}[] = [
  { id: "deploy", label: "装机与环境部署", hint: "把软件、样本和采集口准备到能取证", required: false },
  { id: "listen", label: "听懂问题", hint: "把客户原话收成业务痛点", required: false },
  { id: "topology", label: "画出链路", hint: "标出跳数、第三方边界和采集盲区", required: false },
  { id: "fault", label: "故障定位", hint: "用证据说明慢或断在哪一跳", required: true },
  { id: "alert", label: "告警取舍", hint: "分开真风险、重复噪音和该关联的事件", required: false },
  { id: "report", label: "汇报结论", hint: "讲清需求、链路、结论、证据和下一步", required: true },
];

export const ROLE_LABEL: Record<Role, string> = {
  student: "学生",
  teacher: "教师",
  leader: "校领导",
  ops: "科来运营",
};

export const STATUS_LABEL: Record<SubmissionStatus | "none", string> = {
  none: "未开始",
  draft: "草稿",
  submitted: "待验收",
  returned: "已退回",
  accepted: "已通过",
};

export function dimensionLabel(id: DimensionId): string {
  return DIMENSIONS.find((item) => item.id === id)?.label ?? id;
}

export function markLabel(mark: HopMark | undefined): string {
  if (mark === "capture") return "采集点";
  if (mark === "blind") return "盲区";
  if (mark === "pass") return "放行";
  return "未标记";
}

export function decisionLabel(decision: AlertDecision | undefined): string {
  if (decision === "investigate") return "值得深查";
  if (decision === "noise") return "重复噪音";
  if (decision === "correlate") return "关联查看";
  return "未判断";
}

export function homeFor(role: Role): string {
  switch (role) {
    case "student":
      return "/student";
    case "teacher":
      return "/teacher";
    case "leader":
      return "/leader";
    case "ops":
      return "/ops";
  }
}

export function formatWhen(iso: string, withTime = true): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(new Date(iso));
}
