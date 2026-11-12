"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dimensionLabel, homeFor } from "./labels";
import {
  canReserve,
  classOfStudent,
  closeSessionMath,
  extendReserveMinutes,
  findSubmission,
  initialReserveMinutes,
  validateWork,
} from "./logic";
import { getSessionUser } from "./session";
import { readDb, resetDb, updateDb } from "./store";
import {
  DEMO_PASSWORD,
  emptyWork,
  type DimensionId,
  type Review,
  type WorkDraft,
} from "./types";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function login(formData: FormData) {
  const userId = String(formData.get("userId") || "");
  const password = String(formData.get("password") || "");
  const user = readDb().users.find((item) => item.id === userId);
  if (!user || password !== DEMO_PASSWORD) redirect("/?e=1");
  const jar = await cookies();
  const options = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 14 };
  jar.set("kelai_uid", user.id, options);
  jar.set("kelai_role", user.role, options);
  redirect(homeFor(user.role));
}

export async function logout() {
  const jar = await cookies();
  jar.delete("kelai_uid");
  jar.delete("kelai_role");
  redirect("/");
}

function editable(status: string | undefined): boolean {
  return !status || status === "draft" || status === "returned";
}

export async function saveWork(challengeId: string, work: WorkDraft): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "student") return { ok: false, error: "只有学生可以保存自己的案卷。" };
  const db = readDb();
  const room = classOfStudent(db, user.id);
  const challenge = db.challenges.find((item) => item.id === challengeId && item.published);
  if (!room || !challenge) return { ok: false, error: "这门挑战不在你的课表里。" };
  const assigned = room.requiredChallengeIds.concat(room.optionalChallengeIds).includes(challengeId);
  if (!assigned) return { ok: false, error: "教师还没有把这门挑战配到班级。" };
  const existing = findSubmission(db, user.id, challengeId);
  if (existing && !editable(existing.status)) return { ok: false, error: "已经交给教师，验收前不能再改。" };
  updateDb((draft) => {
    const current = findSubmission(draft, user.id, challengeId);
    if (current) {
      current.work = work;
      current.updatedAt = new Date().toISOString();
      return;
    }
    draft.submissions.push({
      id: `sub-${user.id}-${challengeId}-${Date.now()}`,
      challengeId,
      studentId: user.id,
      classId: room.id,
      status: "draft",
      updatedAt: new Date().toISOString(),
      stuckOpened: false,
      attempt: 1,
      work,
      review: null,
      history: [],
    });
  });
  refresh();
  return { ok: true };
}

export async function openExpert(challengeId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "student") return { ok: false, error: "只有学生可以查看自己的范本。" };
  const existing = findSubmission(readDb(), user.id, challengeId);
  if (existing?.status === "accepted") return { ok: false, error: "这门已经通过，范本不再单独打开。" };
  const room = classOfStudent(readDb(), user.id);
  if (!room) return { ok: false, error: "你还没有班级。" };
  updateDb((draft) => {
    let current = findSubmission(draft, user.id, challengeId);
    if (!current) {
      current = {
        id: `sub-${user.id}-${challengeId}-${Date.now()}`,
        challengeId,
        studentId: user.id,
        classId: room.id,
        status: "draft",
        updatedAt: new Date().toISOString(),
        stuckOpened: true,
        attempt: 1,
        work: emptyWork(),
        review: null,
        history: [],
      };
      draft.submissions.push(current);
      return;
    }
    current.stuckOpened = true;
    current.updatedAt = new Date().toISOString();
  });
  refresh();
  return { ok: true };
}

export async function submitWork(challengeId: string, work: WorkDraft): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "student") return { ok: false, error: "只有学生可以提交。" };
  const db = readDb();
  const challenge = db.challenges.find((item) => item.id === challengeId);
  if (!challenge) return { ok: false, error: "找不到这门挑战。" };
  const problem = validateWork(challenge, work);
  if (problem) return { ok: false, error: problem };
  const existing = findSubmission(db, user.id, challengeId);
  if (existing && !editable(existing.status)) return { ok: false, error: "这份成果已经在教师手里。" };
  const room = classOfStudent(db, user.id);
  if (!room) return { ok: false, error: "你还没有班级。" };
  updateDb((draft) => {
    const current = findSubmission(draft, user.id, challengeId);
    const now = new Date().toISOString();
    if (!current) {
      draft.submissions.push({
        id: `sub-${user.id}-${challengeId}-${Date.now()}`,
        challengeId,
        studentId: user.id,
        classId: room.id,
        status: "submitted",
        updatedAt: now,
        stuckOpened: false,
        attempt: 1,
        work,
        review: null,
        history: [],
      });
      return;
    }
    if (current.status === "returned" && current.review) {
      current.history.push(current.review);
      current.review = null;
      current.attempt += 1;
    }
    current.work = work;
    current.status = "submitted";
    current.updatedAt = now;
  });
  refresh();
  return { ok: true };
}

export async function startDesktop(challengeId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "student") return { ok: false, error: "只有学生可以打开云桌面。" };
  const db = readDb();
  const tenant = db.tenants.find((item) => item.id === user.tenantId);
  if (!tenant || tenant.aggregate) return { ok: false, error: "当前租户没有可开的云桌面。" };
  const active = db.sessions.find((session) => session.studentId === user.id && session.challengeId === challengeId && session.status === "active");
  if (active) return { ok: true };
  const reserve = initialReserveMinutes();
  const blocked = canReserve(tenant, reserve);
  if (blocked) return { ok: false, error: blocked };
  updateDb((draft) => {
    const school = draft.tenants.find((item) => item.id === user.tenantId);
    if (!school) return;
    school.desktopUsedMinutes += reserve;
    draft.sessions.push({
      id: `ses-${user.id}-${challengeId}-${Date.now()}`,
      studentId: user.id,
      challengeId,
      startedAt: new Date().toISOString(),
      reservedMinutes: reserve,
      chargedMinutes: 0,
      extensions: 0,
      resetCount: 0,
      status: "active",
    });
  });
  refresh();
  return { ok: true };
}

export async function extendDesktop(challengeId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "student") return { ok: false, error: "只有学生可以申请延时。" };
  const db = readDb();
  const session = db.sessions.find((item) => item.studentId === user.id && item.challengeId === challengeId && item.status === "active");
  if (!session) return { ok: false, error: "先开始一节云桌面，再申请延时。" };
  const tenant = db.tenants.find((item) => item.id === user.tenantId);
  if (!tenant) return { ok: false, error: "找不到学校额度。" };
  const extra = extendReserveMinutes();
  const blocked = canReserve(tenant, extra);
  if (blocked) return { ok: false, error: blocked };
  updateDb((draft) => {
    const current = draft.sessions.find((item) => item.id === session.id);
    const school = draft.tenants.find((item) => item.id === user.tenantId);
    if (!current || !school) return;
    current.reservedMinutes += extra;
    current.extensions += 1;
    school.desktopUsedMinutes += extra;
  });
  refresh();
  return { ok: true };
}

export async function resetDesktop(challengeId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "student") return { ok: false, error: "只有学生可以重置自己的桌面。" };
  updateDb((draft) => {
    const session = draft.sessions.find((item) => item.studentId === user.id && item.challengeId === challengeId && item.status === "active");
    if (session) session.resetCount += 1;
    const submission = findSubmission(draft, user.id, challengeId);
    if (submission && editable(submission.status)) submission.work.installDone = [];
  });
  refresh();
  return { ok: true };
}

export async function closeDesktop(challengeId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "student") return { ok: false, error: "只有学生可以结算自己的桌面。" };
  const db = readDb();
  const session = db.sessions.find((item) => item.studentId === user.id && item.challengeId === challengeId && item.status === "active");
  if (!session) return { ok: false, error: "没有正在进行的会话。" };
  const math = closeSessionMath(session, Date.now());
  updateDb((draft) => {
    const current = draft.sessions.find((item) => item.id === session.id);
    const school = draft.tenants.find((item) => item.id === user.tenantId);
    if (!current || !school) return;
    current.chargedMinutes = math.charged;
    current.status = "closed";
    school.desktopUsedMinutes = Math.max(0, school.desktopUsedMinutes - math.refund);
  });
  refresh();
  return { ok: true };
}

export async function reviewSubmission(input: {
  submissionId: string;
  decision: "accept" | "return";
  scores: Partial<Record<DimensionId, number>>;
  tags: string[];
  comment: string;
  defenseNote: string;
  defenseChecks: { question: string; verdict: "clear" | "unclear" }[];
  reason: string;
}): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "teacher") return { ok: false, error: "只有任课教师可以验收。" };
  const db = readDb();
  const submission = db.submissions.find((item) => item.id === input.submissionId);
  if (!submission || submission.status !== "submitted") return { ok: false, error: "这份成果现在不在待验收队列。" };
  const room = db.classes.find((item) => item.id === submission.classId && item.teacherId === user.id);
  if (!room) return { ok: false, error: "这不是你带的班级。" };
  const challenge = db.challenges.find((item) => item.id === submission.challengeId);
  if (!challenge) return { ok: false, error: "挑战已不存在。" };
  for (const dimension of challenge.dimensions) {
    const score = input.scores[dimension];
    if (typeof score !== "number" || score < 1 || score > 5) return { ok: false, error: `请给「${dimensionLabel(dimension)}」打 1 到 5 分。` };
  }
  if (input.comment.trim().length < 6) return { ok: false, error: "写一句评语，学生才知道好在哪。" };
  if (input.decision === "return" && input.reason.trim().length < 6) return { ok: false, error: "退回时要写清改什么。" };
  if (input.decision === "accept") {
    const missing = challenge.teacher.defenseQuestions.filter((question) => !input.defenseChecks.some((item) => item.question === question && item.verdict));
    if (missing.length > 0) return { ok: false, error: "通过前要给每道答辩问题勾选讲清了或没讲清。" };
  }
  const review: Review = {
    at: new Date().toISOString(),
    reviewerId: user.id,
    decision: input.decision,
    scores: input.scores,
    tags: input.tags,
    comment: input.comment.trim(),
    defenseNote: input.defenseNote.trim(),
    defenseChecks: input.defenseChecks,
    reason: input.decision === "return" ? input.reason.trim() : "",
  };
  updateDb((draft) => {
    const current = draft.submissions.find((item) => item.id === input.submissionId);
    if (!current) return;
    if (current.review) current.history.push(current.review);
    current.review = review;
    current.status = input.decision === "accept" ? "accepted" : "returned";
    current.updatedAt = review.at;
  });
  refresh();
  return { ok: true };
}

export async function addStudent(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "teacher") redirect("/teacher");
  const classId = String(formData.get("classId") || "");
  const name = String(formData.get("name") || "").trim();
  const title = String(formData.get("title") || "").trim() || "新导入学生";
  if (name.length < 2 || name.length > 20) redirect(`/teacher/class/${classId}?e=name`);
  updateDb((draft) => {
    const room = draft.classes.find((item) => item.id === classId && item.teacherId === user.id);
    if (!room) return;
    const duplicated = room.studentIds.some((id) => draft.users.find((item) => item.id === id)?.name === name);
    if (duplicated) return;
    const id = `stu-${Date.now()}`;
    draft.users.push({ id, name, role: "student", tenantId: room.tenantId, title });
    room.studentIds.push(id);
  });
  refresh();
  redirect(`/teacher/class/${classId}`);
}

export async function setOptionalChallenge(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "teacher") redirect("/teacher");
  const classId = String(formData.get("classId") || "");
  const challengeId = String(formData.get("challengeId") || "");
  const on = String(formData.get("on") || "") === "1";
  updateDb((draft) => {
    const room = draft.classes.find((item) => item.id === classId && item.teacherId === user.id);
    const challenge = draft.challenges.find((item) => item.id === challengeId);
    if (!room || !challenge || challenge.core) return;
    room.optionalChallengeIds = room.optionalChallengeIds.filter((id) => id !== challengeId);
    if (on) room.optionalChallengeIds.push(challengeId);
  });
  refresh();
  redirect(`/teacher/class/${classId}`);
}

export async function updateTrend(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "ops") redirect("/ops");
  const headline = String(formData.get("headline") || "").trim();
  const notes = String(formData.get("notes") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (headline.length < 4 || notes.length === 0) redirect("/ops/content?e=trend");
  updateDb((draft) => {
    draft.trend.headline = headline;
    draft.trend.notes = notes;
  });
  refresh();
  redirect("/ops/content");
}

export async function setChallengePublished(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "ops") redirect("/ops");
  const challengeId = String(formData.get("challengeId") || "");
  const published = String(formData.get("published") || "") === "1";
  updateDb((draft) => {
    const challenge = draft.challenges.find((item) => item.id === challengeId);
    if (challenge) challenge.published = published;
  });
  refresh();
  redirect("/ops/content");
}

export async function updateDesktopVersion(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "ops") redirect("/ops");
  const version = String(formData.get("version") || "").trim();
  if (version.length < 2) redirect("/ops/content?e=desktop");
  updateDb((draft) => {
    draft.desktop.version = version;
  });
  refresh();
  redirect("/ops/content");
}

export async function addRelease(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "ops") redirect("/ops");
  const title = String(formData.get("title") || "").trim();
  const body = String(formData.get("body") || "").trim();
  if (title.length < 2 || body.length < 4) redirect("/ops/content?e=release");
  updateDb((draft) => {
    draft.releases.push({
      id: `rel-${Date.now()}`,
      at: new Date().toISOString(),
      title,
      body,
    });
  });
  refresh();
  redirect("/ops/content");
}

export async function adjustQuota(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "ops") redirect("/ops");
  const tenantId = String(formData.get("tenantId") || "");
  const delta = Number(formData.get("delta") || 0);
  if (!Number.isFinite(delta) || delta === 0) redirect("/ops/tenants?e=quota");
  updateDb((draft) => {
    const tenant = draft.tenants.find((item) => item.id === tenantId);
    if (!tenant) return;
    tenant.desktopQuotaMinutes = Math.max(tenant.desktopUsedMinutes, tenant.desktopQuotaMinutes + Math.round(delta));
  });
  refresh();
  redirect("/ops/tenants");
}

export async function postNotice(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "teacher") redirect("/teacher");
  const classId = String(formData.get("classId") || "");
  const body = String(formData.get("body") || "").trim();
  if (body.length < 6) redirect(`/teacher/class/${classId}?e=notice`);
  updateDb((draft) => {
    const room = draft.classes.find((item) => item.id === classId && item.teacherId === user.id);
    if (!room) return;
    room.notices.unshift({
      id: `note-${Date.now()}`,
      at: new Date().toISOString(),
      authorId: user.id,
      body,
    });
    room.notices = room.notices.slice(0, 8);
  });
  refresh();
  redirect(`/teacher/class/${classId}`);
}

export async function updateChallengeSummary(formData: FormData) {
  const user = await getSessionUser();
  if (!user || user.role !== "ops") redirect("/ops");
  const challengeId = String(formData.get("challengeId") || "");
  const summary = String(formData.get("summary") || "").trim();
  if (summary.length < 8) redirect("/ops/content?e=summary");
  updateDb((draft) => {
    const challenge = draft.challenges.find((item) => item.id === challengeId);
    if (challenge) challenge.summary = summary;
  });
  refresh();
  redirect("/ops/content");
}

export async function clearInstall(challengeId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user || user.role !== "student") return { ok: false, error: "只有学生可以重做自己的装机步骤。" };
  updateDb((draft) => {
    const submission = findSubmission(draft, user.id, challengeId);
    if (submission && editable(submission.status)) submission.work.installDone = [];
  });
  refresh();
  return { ok: true };
}

export async function resetDemo() {
  const user = await getSessionUser();
  if (!user || user.role !== "ops") redirect("/ops");
  resetDb();
  refresh();
  redirect("/ops");
}
