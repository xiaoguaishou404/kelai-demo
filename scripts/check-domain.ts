import assert from "node:assert/strict";
import { createSeed } from "../lib/seed";
import {
  canReserve,
  closeSessionMath,
  dimensionScores,
  teacherDiff,
  toStudentView,
  validateWork,
} from "../lib/logic";
import { leaderBoard, opsBoard } from "../lib/view";
import { EXTEND_DESKTOP_MINUTES, INITIAL_DESKTOP_MINUTES, type Tenant } from "../lib/types";

const db = createSeed();
const trade = db.challenges.find((challenge) => challenge.id === "trade-slow");
const alert = db.challenges.find((challenge) => challenge.id === "alert-flood");
const deploy = db.challenges.find((challenge) => challenge.id === "deploy-probe");
assert(trade && alert && deploy);

for (const challenge of [trade, alert, deploy]) {
  const hidden = toStudentView(challenge, false);
  const encoded = JSON.stringify(hidden);
  assert.equal(hidden.expert, null);
  assert.equal(encoded.includes("慢点在订单服务等待支付渠道回包"), false);
  assert.equal(encoded.includes("支付成功率才是这批告警里的黄金指标"), false);
  assert.equal(encoded.includes("先确认镜像口，再谈软件"), false);
  assert.equal(hasKey(hidden, "expected"), false);
  assert.equal(hasKey(hidden, "teacherNote"), false);
  assert.equal(hasKey(hidden, "teacher"), false);
}

const revealed = toStudentView(trade, true);
assert.equal(revealed.expert?.answer.includes("慢点在订单服务等待支付渠道回包"), true);

const xuTrade = db.submissions.find((item) => item.id === "sub-xu-trade");
const shen = db.submissions.find((item) => item.id === "sub-shen-trade");
assert(xuTrade && shen);
assert.equal(validateWork(trade, xuTrade.work), null);
assert.equal(validateWork(trade, shen.work), null);
assert.ok(validateWork(trade, db.submissions.find((item) => item.id === "sub-jiang-trade")!.work));
const diffs = teacherDiff(trade, shen.work);
assert.ok(diffs.some((line) => line.includes("订单库")));
assert.ok(diffs.some((line) => line.includes("支付网关")));

const scores = dimensionScores(db, "stu-xu");
assert.equal(scores.fault, 100);
assert.ok((scores.alert ?? 0) >= 80);
assert.equal(dimensionScores(db, "stu-liang").fault, 0);

const ops = opsBoard(db);
assert.equal(JSON.stringify(ops).includes("许知夏"), false);
assert.equal(JSON.stringify(ops).includes("沈予安"), false);
assert.equal(ops.schools.some((school) => school.name === "江北职业技术学院" && school.aggregate), true);

const leader = leaderBoard(db, "tenant-linjiang");
assert.equal(JSON.stringify(leader).includes("许知夏"), true);
assert.ok(leader.classes[0].students.length === 5);

const now = Date.parse("2026-11-13T04:00:00.000Z");
const session = {
  id: "s",
  studentId: "stu-xu",
  challengeId: "trade-slow",
  startedAt: new Date(now - 9 * 60000 - 30000).toISOString(),
  reservedMinutes: 45,
  chargedMinutes: 0,
  extensions: 0,
  resetCount: 0,
  status: "active" as const,
};
const closed = closeSessionMath(session, now);
assert.equal(closed.charged, 10);
assert.equal(closed.refund, 35);

const poor: Tenant = {
  id: "t",
  name: "t",
  college: "c",
  plan: "p",
  year: "2026",
  desktopQuotaMinutes: 40,
  desktopUsedMinutes: 20,
  enabledDimensions: ["fault", "report"],
};
assert.ok(canReserve(poor, INITIAL_DESKTOP_MINUTES));
assert.equal(canReserve({ ...poor, desktopUsedMinutes: 0 }, EXTEND_DESKTOP_MINUTES), null);

const charged = db.sessions.reduce((sum, item) => sum + item.chargedMinutes, 0);
const linjiang = db.tenants.find((tenant) => tenant.id === "tenant-linjiang");
assert.equal(linjiang?.desktopUsedMinutes, charged);

console.log("domain checks passed");
console.log(`xu fault=${scores.fault} alert=${scores.alert} deploy=${scores.deploy}`);
console.log(`ops schools=${ops.schools.length} heat=${ops.heat.map((item) => item.submissions).join(",")}`);

function hasKey(value: unknown, key: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => hasKey(item, key));
  const record = value as Record<string, unknown>;
  if (Object.prototype.hasOwnProperty.call(record, key)) return true;
  return Object.values(record).some((item) => hasKey(item, key));
}
