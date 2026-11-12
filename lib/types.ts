export type Role = "student" | "teacher" | "leader" | "ops";

export type DimensionId = "deploy" | "listen" | "topology" | "fault" | "alert" | "report";

export type StageKind = "listen" | "topology" | "fault" | "alert" | "install" | "report";

export type HopMark = "capture" | "blind" | "pass";

export type AlertDecision = "investigate" | "noise" | "correlate";

export type SubmissionStatus = "draft" | "submitted" | "returned" | "accepted";

export interface User {
  id: string;
  name: string;
  role: Role;
  tenantId: string;
  title: string;
}

export interface TenantAggregate {
  classes: number;
  students: number;
  usedMinutes: number;
}

export interface Tenant {
  id: string;
  name: string;
  college: string;
  plan: string;
  year: string;
  desktopQuotaMinutes: number;
  desktopUsedMinutes: number;
  enabledDimensions: DimensionId[];
  aggregate?: TenantAggregate;
}

export interface Trend {
  season: string;
  headline: string;
  notes: string[];
}

export interface Release {
  id: string;
  at: string;
  title: string;
  body: string;
}

export interface JobRole {
  id: string;
  name: string;
  summary: string;
  duties: string[];
  companyTypes: string[];
  dimensions: DimensionId[];
  skills: string[];
  trains: string[];
}

export interface Hop {
  id: string;
  name: string;
  latencyMs: number | null;
  visible: boolean;
  note: string;
}

export interface AlertItem {
  id: string;
  time: string;
  source: string;
  title: string;
  detail: string;
  expected: AlertDecision;
  teacherNote: string;
}

export interface InstallStep {
  id: string;
  title: string;
  detail: string;
}

export interface Stage {
  id: string;
  title: string;
  kind: StageKind;
  dimension: DimensionId;
  prompt: string;
}

export interface ExpertAnswer {
  mindset: string[];
  pitfalls: string[];
  answer: string;
}

export interface TeacherGuide {
  goal: string;
  lookFor: string[];
  returnWhen: string[];
  defenseQuestions: string[];
}

export interface Challenge {
  id: string;
  code: string;
  title: string;
  scene: string;
  quote: string;
  summary: string;
  reading: string[];
  dimensions: DimensionId[];
  core: boolean;
  published: boolean;
  minutes: number;
  indicators: string[];
  stages: Stage[];
  hops: Hop[];
  alerts: AlertItem[];
  installSteps: InstallStep[];
  expectedSlowHopId: string;
  expectedBlindHopIds: string[];
  expectedCaptureHopIds: string[];
  sampleName: string;
  sampleNote: string;
  expert: ExpertAnswer;
  teacher: TeacherGuide;
}

export interface ReportDraft {
  need: string;
  path: string;
  conclusion: string;
  evidence: string;
  next: string;
}

export interface WorkDraft {
  listenNote: string;
  hopMarks: Record<string, HopMark>;
  slowHopId: string;
  faultEvidence: string;
  invisibleBoundary: string;
  alertDecisions: Record<string, AlertDecision>;
  alertReasons: Record<string, string>;
  installDone: string[];
  report: ReportDraft;
}

export interface Review {
  at: string;
  reviewerId: string;
  decision: "accept" | "return";
  scores: Partial<Record<DimensionId, number>>;
  tags: string[];
  comment: string;
  defenseNote: string;
  defenseChecks: { question: string; verdict: "clear" | "unclear" }[];
  reason: string;
}

export interface Submission {
  id: string;
  challengeId: string;
  studentId: string;
  classId: string;
  status: SubmissionStatus;
  updatedAt: string;
  stuckOpened: boolean;
  attempt: number;
  work: WorkDraft;
  review: Review | null;
  history: Review[];
}

export interface DesktopSession {
  id: string;
  studentId: string;
  challengeId: string;
  startedAt: string;
  reservedMinutes: number;
  chargedMinutes: number;
  extensions: number;
  resetCount: number;
  status: "active" | "closed";
}

export interface ClassNotice {
  id: string;
  at: string;
  authorId: string;
  body: string;
}

export interface ClassRoom {
  id: string;
  name: string;
  tenantId: string;
  teacherId: string;
  term: string;
  studentIds: string[];
  requiredChallengeIds: string[];
  optionalChallengeIds: string[];
  notices: ClassNotice[];
}

export interface DesktopProduct {
  product: string;
  version: string;
  provider: string;
  policy: string;
}

export interface Database {
  schemaVersion: number;
  users: User[];
  tenants: Tenant[];
  classes: ClassRoom[];
  jobs: JobRole[];
  challenges: Challenge[];
  submissions: Submission[];
  sessions: DesktopSession[];
  trend: Trend;
  releases: Release[];
  desktop: DesktopProduct;
}

export const SCHEMA_VERSION = 3;
export const DEMO_PASSWORD = "kelai-2026";
export const INITIAL_DESKTOP_MINUTES = 45;
export const EXTEND_DESKTOP_MINUTES = 30;

export const REVIEW_TAGS = [
  "证据具体",
  "边界清楚",
  "链路完整",
  "告警取舍得当",
  "结论跳跃",
  "归咎带宽",
  "照搬答案",
] as const;

export function emptyWork(): WorkDraft {
  return {
    listenNote: "",
    hopMarks: {},
    slowHopId: "",
    faultEvidence: "",
    invisibleBoundary: "",
    alertDecisions: {},
    alertReasons: {},
    installDone: [],
    report: { need: "", path: "", conclusion: "", evidence: "", next: "" },
  };
}
