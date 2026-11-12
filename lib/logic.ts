import { dimensionLabel, DIMENSIONS } from "./labels";
import {
  EXTEND_DESKTOP_MINUTES,
  INITIAL_DESKTOP_MINUTES,
  type AlertDecision,
  type Challenge,
  type ClassRoom,
  type Database,
  type DesktopSession,
  type DimensionId,
  type ExpertAnswer,
  type StageKind,
  type Submission,
  type Tenant,
  type WorkDraft,
} from "./types";

export interface StudentChallengeView {
  id: string;
  code: string;
  title: string;
  scene: string;
  quote: string;
  summary: string;
  dimensions: DimensionId[];
  minutes: number;
  indicators: string[];
  stages: Challenge["stages"];
  hops: { id: string; name: string; latencyMs: number | null; visible: boolean; note: string }[];
  alerts: { id: string; time: string; source: string; title: string; detail: string }[];
  installSteps: Challenge["installSteps"];
  sampleName: string;
  sampleNote: string;
  expert: ExpertAnswer | null;
}

export function toStudentView(challenge: Challenge, revealExpert: boolean): StudentChallengeView {
  return {
    id: challenge.id,
    code: challenge.code,
    title: challenge.title,
    scene: challenge.scene,
    quote: challenge.quote,
    summary: challenge.summary,
    dimensions: challenge.dimensions,
    minutes: challenge.minutes,
    indicators: challenge.indicators,
    stages: challenge.stages,
    hops: challenge.hops.map(({ id, name, latencyMs, visible, note }) => ({ id, name, latencyMs, visible, note })),
    alerts: challenge.alerts.map(({ id, time, source, title, detail }) => ({ id, time, source, title, detail })),
    installSteps: challenge.installSteps,
    sampleName: challenge.sampleName,
    sampleNote: challenge.sampleNote,
    expert: revealExpert ? challenge.expert : null,
  };
}

export function isStageComplete(kind: StageKind, work: WorkDraft, challenge: Challenge): boolean {
  if (kind === "listen") return work.listenNote.trim().length >= 20;
  if (kind === "topology") {
    const marks = Object.values(work.hopMarks);
    return marks.includes("capture") && marks.includes("blind");
  }
  if (kind === "fault") {
    if (challenge.hops.length === 0) return true;
    return Boolean(work.slowHopId) && work.faultEvidence.trim().length >= 20 && work.invisibleBoundary.trim().length >= 8;
  }
  if (kind === "alert") {
    if (challenge.alerts.length === 0) return true;
    return challenge.alerts.every((alert) => {
      const decision = work.alertDecisions[alert.id];
      return Boolean(decision) && (work.alertReasons[alert.id] ?? "").trim().length >= 4;
    });
  }
  if (kind === "install") {
    return challenge.installSteps.every((step) => work.installDone.includes(step.id));
  }
  return Object.values(work.report).every((value) => value.trim().length >= 8);
}

export function validateWork(challenge: Challenge, work: WorkDraft): string | null {
  for (const stage of challenge.stages) {
    if (!isStageComplete(stage.kind, work, challenge)) {
      return `还不能提交：「${stage.title}」没有完成。${stage.prompt}`;
    }
  }
  return null;
}

export function teacherDiff(challenge: Challenge, work: WorkDraft): string[] {
  const diffs: string[] = [];
  if (challenge.expectedSlowHopId) {
    const expected = challenge.hops.find((hop) => hop.id === challenge.expectedSlowHopId);
    const actual = challenge.hops.find((hop) => hop.id === work.slowHopId);
    if (!work.slowHopId) diffs.push("学生还没标慢点。");
    else if (work.slowHopId !== challenge.expectedSlowHopId) {
      diffs.push(`慢点：学生标了「${actual?.name ?? "未选"}」，范本是「${expected?.name ?? ""}」。`);
    }
  }
  for (const id of challenge.expectedBlindHopIds) {
    if (work.hopMarks[id] !== "blind") {
      const hop = challenge.hops.find((item) => item.id === id);
      diffs.push(`「${hop?.name ?? id}」应标为采集盲区，学生标成了${markText(work.hopMarks[id])}。`);
    }
  }
  for (const id of challenge.expectedCaptureHopIds) {
    if (work.hopMarks[id] === "blind") {
      const hop = challenge.hops.find((item) => item.id === id);
      diffs.push(`「${hop?.name ?? id}」有镜像，学生却标成了盲区。`);
    }
  }
  for (const alert of challenge.alerts) {
    const actual = work.alertDecisions[alert.id];
    if (actual && actual !== alert.expected) {
      diffs.push(`告警「${alert.title}」学生判为${decisionText(actual)}，范本是${decisionText(alert.expected)}。${alert.teacherNote}`);
    }
  }
  if (challenge.installSteps.length > 0) {
    const missing = challenge.installSteps.filter((step) => !work.installDone.includes(step.id));
    if (missing.length > 0) diffs.push(`装机还缺：${missing.map((step) => step.title).join("、")}。`);
  }
  return diffs;
}

function markText(mark: WorkDraft["hopMarks"][string] | undefined): string {
  if (mark === "capture") return "采集点";
  if (mark === "blind") return "盲区";
  if (mark === "pass") return "放行";
  return "未标记";
}

function decisionText(decision: AlertDecision): string {
  if (decision === "investigate") return "值得深查";
  if (decision === "noise") return "重复噪音";
  return "关联查看";
}

export function classOfStudent(db: Database, studentId: string): ClassRoom | undefined {
  return db.classes.find((room) => room.studentIds.includes(studentId));
}

export function assignedChallenges(db: Database, room: ClassRoom): Challenge[] {
  const ids = [...room.requiredChallengeIds, ...room.optionalChallengeIds];
  return ids
    .map((id) => db.challenges.find((challenge) => challenge.id === id))
    .filter((challenge): challenge is Challenge => Boolean(challenge && challenge.published));
}

export function findSubmission(db: Database, studentId: string, challengeId: string): Submission | undefined {
  return db.submissions.find((item) => item.studentId === studentId && item.challengeId === challengeId);
}

export function submissionDimensionScore(challenge: Challenge, submission: Submission | undefined, dimension: DimensionId): number {
  if (!submission) return 0;
  const reviewed = submission.review?.scores[dimension];
  if (typeof reviewed === "number") return Math.round((reviewed / 5) * 100);
  const stage = challenge.stages.find((item) => item.dimension === dimension);
  if (stage && isStageComplete(stage.kind, submission.work, challenge)) return 40;
  return 15;
}

export function dimensionScores(db: Database, studentId: string): Record<DimensionId, number | null> {
  const room = classOfStudent(db, studentId);
  const scores = {} as Record<DimensionId, number | null>;
  for (const dimension of DIMENSIONS) {
    if (!room) {
      scores[dimension.id] = null;
      continue;
    }
    const challenges = assignedChallenges(db, room).filter((challenge) => challenge.dimensions.includes(dimension.id));
    if (challenges.length === 0) {
      scores[dimension.id] = null;
      continue;
    }
    const total = challenges.reduce((sum, challenge) => {
      return sum + submissionDimensionScore(challenge, findSubmission(db, studentId, challenge.id), dimension.id);
    }, 0);
    scores[dimension.id] = Math.round(total / challenges.length);
  }
  return scores;
}

export function averageScore(scores: Record<DimensionId, number | null>): number {
  const values = DIMENSIONS.map((dimension) => scores[dimension.id] ?? 0);
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function studentMinutes(db: Database, studentId: string): number {
  return db.sessions
    .filter((session) => session.studentId === studentId && session.status === "closed")
    .reduce((sum, session) => sum + session.chargedMinutes, 0);
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  earned: boolean;
}

export function badgesFor(db: Database, studentId: string): Badge[] {
  const submissions = db.submissions.filter((item) => item.studentId === studentId);
  const accepted = submissions.filter((item) => item.status === "accepted");
  const tags = accepted.flatMap((item) => item.review?.tags ?? []);
  const fault = accepted.find((item) => item.challengeId === "trade-slow");
  const alert = accepted.find((item) => item.challengeId === "alert-flood");
  const reportScore = accepted.some((item) => (item.review?.scores.report ?? 0) >= 4);
  return [
    { id: "evidence", name: "取证入门", description: "交出过一份成果", earned: submissions.some((item) => item.status !== "draft") },
    { id: "fault", name: "故障定位", description: "收银台案卷通过，且定位分不低于 4", earned: (fault?.review?.scores.fault ?? 0) >= 4 },
    { id: "boundary", name: "边界清楚", description: "教师打过「边界清楚」", earned: tags.includes("边界清楚") },
    { id: "alert", name: "告警取舍", description: "告警洪峰案卷通过", earned: Boolean(alert) },
    { id: "report", name: "汇报成稿", description: "有一门汇报分不低于 4", earned: reportScore },
    { id: "time", name: "机时扎实", description: "云桌面累计满 40 分钟", earned: studentMinutes(db, studentId) >= 40 },
    {
      id: "reflect",
      name: "看过范本仍讲清",
      description: "打开过专家范本，之后仍然验收通过",
      earned: submissions.some((item) => item.stuckOpened && item.status === "accepted"),
    },
  ];
}

export function jobFit(db: Database, studentId: string): { jobId: string; score: number }[] {
  const scores = dimensionScores(db, studentId);
  return db.jobs
    .map((job) => {
      const values = job.dimensions.map((dimension) => scores[dimension] ?? 0);
      const score = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
      return { jobId: job.id, score };
    })
    .sort((a, b) => b.score - a.score);
}

export function rankForClass(db: Database, room: ClassRoom): { studentId: string; score: number }[] {
  return room.studentIds
    .map((studentId) => ({ studentId, score: averageScore(dimensionScores(db, studentId)) }))
    .sort((a, b) => b.score - a.score || a.studentId.localeCompare(b.studentId, "zh-CN"));
}

export function remainingMinutes(tenant: Tenant): number {
  return tenant.desktopQuotaMinutes - tenant.desktopUsedMinutes;
}

export function canReserve(tenant: Tenant, minutes: number): string | null {
  if (remainingMinutes(tenant) < minutes) {
    return `本校云桌面还剩 ${remainingMinutes(tenant)} 分钟，不够再申请 ${minutes} 分钟。请教师联系科来运营增补额度。`;
  }
  return null;
}

export function closeSessionMath(session: DesktopSession, nowMs: number): { charged: number; refund: number } {
  const elapsed = Math.max(1, Math.ceil((nowMs - Date.parse(session.startedAt)) / 60000));
  const charged = Math.min(session.reservedMinutes, elapsed);
  return { charged, refund: session.reservedMinutes - charged };
}

export function initialReserveMinutes(): number {
  return INITIAL_DESKTOP_MINUTES;
}

export function extendReserveMinutes(): number {
  return EXTEND_DESKTOP_MINUTES;
}

export function weakestDimension(scores: Record<DimensionId, number>): DimensionId {
  return [...DIMENSIONS].sort((a, b) => scores[a.id] - scores[b.id] || a.label.localeCompare(b.label, "zh-CN"))[0].id;
}

export function dimensionTitle(id: DimensionId): string {
  return dimensionLabel(id);
}
