import { DIMENSIONS, dimensionLabel } from "./labels";
import {
  assignedChallenges,
  averageScore,
  badgesFor,
  classOfStudent,
  dimensionScores,
  findSubmission,
  jobFit,
  rankForClass,
  studentMinutes,
  weakestDimension,
} from "./logic";
import type { Database, DimensionId, Review, Submission, SubmissionStatus } from "./types";

export function studentHome(db: Database, studentId: string) {
  const user = db.users.find((item) => item.id === studentId);
  const room = classOfStudent(db, studentId);
  const challenges = room ? assignedChallenges(db, room) : [];
  const rows = challenges.map((challenge) => ({
    challenge,
    submission: findSubmission(db, studentId, challenge.id) ?? null,
  }));
  const next =
    rows.find((row) => row.submission?.status === "returned") ??
    rows.find((row) => row.submission?.status === "draft") ??
    rows.find((row) => !row.submission) ??
    null;
  const rank = room ? rankForClass(db, room) : [];
  const place = rank.findIndex((item) => item.studentId === studentId) + 1;
  return {
    user,
    room,
    rows,
    next,
    scores: dimensionScores(db, studentId),
    minutes: studentMinutes(db, studentId),
    badges: badgesFor(db, studentId).filter((badge) => badge.earned),
    place,
    total: rank.length,
    active: db.sessions.find((session) => session.studentId === studentId && session.status === "active") ?? null,
  };
}

export function portraitOf(db: Database, studentId: string) {
  const user = db.users.find((item) => item.id === studentId);
  const room = classOfStudent(db, studentId);
  const tenant = db.tenants.find((item) => item.id === user?.tenantId);
  const scores = dimensionScores(db, studentId);
  const rank = room ? rankForClass(db, room) : [];
  const challenges = room ? assignedChallenges(db, room) : [];
  return {
    user,
    tenant,
    room,
    scores,
    fit: jobFit(db, studentId).map((item) => ({
      job: db.jobs.find((job) => job.id === item.jobId)!,
      score: item.score,
    })),
    badges: badgesFor(db, studentId),
    sessions: db.sessions
      .filter((session) => session.studentId === studentId)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    minutes: studentMinutes(db, studentId),
    challenges: challenges.map((challenge) => ({
      challenge,
      submission: findSubmission(db, studentId, challenge.id) ?? null,
    })),
    reviews: challenges
      .map((challenge) => {
        const submission = findSubmission(db, studentId, challenge.id);
        return submission?.review ? { challengeTitle: challenge.title, review: submission.review } : null;
      })
      .filter((item): item is { challengeTitle: string; review: Review } => Boolean(item)),
    place: rank.findIndex((item) => item.studentId === studentId) + 1,
    total: rank.length,
    generatedAt: new Date().toISOString(),
  };
}

export function classTable(db: Database, classId: string) {
  const room = db.classes.find((item) => item.id === classId);
  if (!room) return null;
  const teacher = db.users.find((item) => item.id === room.teacherId);
  const challenges = [
    ...room.requiredChallengeIds,
    ...room.optionalChallengeIds,
  ]
    .map((id) => db.challenges.find((challenge) => challenge.id === id))
    .filter((challenge): challenge is NonNullable<typeof challenge> => Boolean(challenge));
  const students = room.studentIds.map((id) => db.users.find((user) => user.id === id)).filter((user) => user);
  return { room, teacher, challenges, students };
}

export function teacherQueue(db: Database, teacherId: string) {
  const rooms = db.classes.filter((room) => room.teacherId === teacherId);
  const studentIds = new Set(rooms.flatMap((room) => room.studentIds));
  return db.submissions
    .filter((submission) => studentIds.has(submission.studentId) && submission.status === "submitted")
    .map((submission) => ({
      submission,
      student: db.users.find((user) => user.id === submission.studentId),
      challenge: db.challenges.find((challenge) => challenge.id === submission.challengeId),
    }))
    .sort((a, b) => a.submission.updatedAt.localeCompare(b.submission.updatedAt));
}

export function leaderBoard(db: Database, tenantId: string) {
  const tenant = db.tenants.find((item) => item.id === tenantId);
  const rooms = db.classes.filter((room) => room.tenantId === tenantId);
  const classes = rooms.map((room) => {
    const challenges = assignedChallenges(db, room);
    const slots = room.studentIds.length * challenges.length;
    const accepted = db.submissions.filter(
      (submission) => submission.classId === room.id && submission.status === "accepted" && challenges.some((challenge) => challenge.id === submission.challengeId),
    ).length;
    const totals = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension.id, 0])) as Record<DimensionId, number>;
    for (const studentId of room.studentIds) {
      const scores = dimensionScores(db, studentId);
      for (const dimension of DIMENSIONS) totals[dimension.id] += scores[dimension.id] ?? 0;
    }
    const averages = Object.fromEntries(
      DIMENSIONS.map((dimension) => [dimension.id, room.studentIds.length ? Math.round(totals[dimension.id] / room.studentIds.length) : 0]),
    ) as Record<DimensionId, number>;
    const returns = db.submissions.filter((submission) => submission.classId === room.id && (submission.review?.decision === "return" || submission.history.some((item) => item.decision === "return")));
    const hotspot = returnHotspot(db, returns);
    const desktopMinutes = db.sessions
      .filter((session) => room.studentIds.includes(session.studentId) && session.status === "closed")
      .reduce((sum, session) => sum + session.chargedMinutes, 0);
    return {
      room,
      teacherName: db.users.find((user) => user.id === room.teacherId)?.name ?? "",
      studentCount: room.studentIds.length,
      passRate: slots ? Math.round((accepted / slots) * 100) : 0,
      averages,
      weakest: weakestDimension(averages),
      hotspot,
      desktopMinutes,
      students: room.studentIds.map((studentId) => {
        const scores = dimensionScores(db, studentId);
        return {
          id: studentId,
          name: db.users.find((user) => user.id === studentId)?.name ?? studentId,
          score: averageScore(scores),
          scores,
        };
      }),
    };
  });
  return { tenant, classes, generatedAt: new Date().toISOString() };
}

function returnHotspot(db: Database, submissions: Submission[]): string {
  const counts = Object.fromEntries(DIMENSIONS.map((dimension) => [dimension.id, 0])) as Record<DimensionId, number>;
  for (const submission of submissions) {
    const reviews = [...submission.history, ...(submission.review ? [submission.review] : [])].filter((review) => review.decision === "return");
    for (const review of reviews) {
      let worst: DimensionId | null = null;
      let worstScore = 99;
      for (const dimension of DIMENSIONS) {
        const score = review.scores[dimension.id];
        if (typeof score === "number" && score < worstScore) {
          worst = dimension.id;
          worstScore = score;
        }
      }
      if (worst) counts[worst] += 1;
    }
  }
  const top = DIMENSIONS.map((dimension) => ({ id: dimension.id, count: counts[dimension.id] })).sort((a, b) => b.count - a.count)[0];
  if (!top || top.count === 0) return "暂无退回";
  const challengeHint = db.challenges.find((challenge) => challenge.dimensions.includes(top.id))?.title;
  return `${dimensionLabel(top.id)}（${top.count} 次）${challengeHint ? `，多见于「${challengeHint}」` : ""}`;
}

export interface OpsSchool {
  id: string;
  name: string;
  college: string;
  plan: string;
  classes: number;
  students: number;
  quota: number;
  used: number;
  aggregate: boolean;
}

export interface OpsBoard {
  schools: OpsSchool[];
  heat: { challengeId: string; title: string; submissions: number; desktopMinutes: number; published: boolean }[];
  trend: Database["trend"];
  releases: Database["releases"];
  desktop: Database["desktop"];
  challenges: { id: string; code: string; title: string; published: boolean; core: boolean }[];
}

export function opsBoard(db: Database): OpsBoard {
  const schools = db.tenants.map((tenant) => {
    if (tenant.aggregate) {
      return {
        id: tenant.id,
        name: tenant.name,
        college: tenant.college,
        plan: tenant.plan,
        classes: tenant.aggregate.classes,
        students: tenant.aggregate.students,
        quota: tenant.desktopQuotaMinutes,
        used: tenant.aggregate.usedMinutes,
        aggregate: true,
      };
    }
    const rooms = db.classes.filter((room) => room.tenantId === tenant.id);
    const students = rooms.reduce((sum, room) => sum + room.studentIds.length, 0);
    return {
      id: tenant.id,
      name: tenant.name,
      college: tenant.college,
      plan: tenant.plan,
      classes: rooms.length,
      students,
      quota: tenant.desktopQuotaMinutes,
      used: tenant.desktopUsedMinutes,
      aggregate: false,
    };
  });
  const heat = db.challenges.map((challenge) => ({
    challengeId: challenge.id,
    title: challenge.title,
    submissions: db.submissions.filter((submission) => submission.challengeId === challenge.id && submission.status !== "draft").length,
    desktopMinutes: db.sessions
      .filter((session) => session.challengeId === challenge.id && session.status === "closed")
      .reduce((sum, session) => sum + session.chargedMinutes, 0),
    published: challenge.published,
  }));
  return {
    schools,
    heat,
    trend: db.trend,
    releases: [...db.releases].sort((a, b) => b.at.localeCompare(a.at)),
    desktop: db.desktop,
    challenges: db.challenges.map((challenge) => ({
      id: challenge.id,
      code: challenge.code,
      title: challenge.title,
      published: challenge.published,
      core: challenge.core,
    })),
  };
}

export function statusOf(submission: Submission | null | undefined): SubmissionStatus | "none" {
  return submission?.status ?? "none";
}
