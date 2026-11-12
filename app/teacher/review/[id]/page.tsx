import { AnswerView } from "@/components/answer-view";
import { PageHead, StatusPill } from "@/components/bits";
import { ReviewForm } from "@/components/review-form";
import { dimensionLabel, formatWhen } from "@/lib/labels";
import { teacherDiff } from "@/lib/logic";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";

export const metadata = { title: "成果验收" };

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("teacher");
  const { id } = await params;
  const db = readDb();
  const submission = db.submissions.find((item) => item.id === id);
  const room = db.classes.find((item) => item.id === submission?.classId && item.teacherId === user.id);
  const challenge = db.challenges.find((item) => item.id === submission?.challengeId);
  const student = db.users.find((item) => item.id === submission?.studentId);
  if (!submission || !room || !challenge || !student) return <PageHead title="找不到这份成果" />;
  const diffs = teacherDiff(challenge, submission.work);
  return (
    <>
      <PageHead
        kicker={`${challenge.code} · 第 ${submission.attempt} 次`}
        title={`${student.name} · ${challenge.title}`}
        lede={challenge.quote}
      />
      <div className="row">
        <StatusPill status={submission.status} />
        {submission.stuckOpened ? <span className="pill">学生打开过专家范本</span> : <span className="pill">未打开范本</span>}
        <span className="muted">{formatWhen(submission.updatedAt)}</span>
      </div>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>和范本的差异</h2>
        {diffs.length === 0 ? <p>没有和范本冲突的硬差异。仍要看证据是不是学生自己讲得清。</p> : <ul>{diffs.map((diff) => <li key={diff}>{diff}</li>)}</ul>}
        <p className="muted">差异只帮你看漏了哪，不代替打分。</p>
      </section>
      <div style={{ marginTop: 14 }}>
        <AnswerView challenge={challenge} work={submission.work} />
      </div>
      <details className="card" style={{ marginTop: 14 }}>
        <summary>教师手册与专家范本</summary>
        <p>{challenge.teacher.goal}</p>
        <p>看这些：{challenge.teacher.lookFor.join("；")}</p>
        <p>可以退回：{challenge.teacher.returnWhen.join("；")}</p>
        <p>答辩可以问：{challenge.teacher.defenseQuestions.join("；")}</p>
        <p>{challenge.expert.answer}</p>
      </details>
      {submission.review ? (
        <section className="card" style={{ marginTop: 14 }}>
          <h2>当前评语</h2>
          <p>{submission.review.comment}</p>
          <p>{submission.review.tags.join("、")}</p>
          <p>{Object.entries(submission.review.scores).map(([key, score]) => `${dimensionLabel(key as never)} ${score}`).join(" · ")}</p>
          {submission.review.reason ? <p>退回说明：{submission.review.reason}</p> : null}
          {submission.review.defenseNote ? <p>答辩：{submission.review.defenseNote}</p> : null}
        </section>
      ) : null}
      {submission.history.length > 0 ? (
        <section className="card" style={{ marginTop: 14 }}>
          <h2>以往退回</h2>
          {submission.history.map((review) => <p key={review.at}>{formatWhen(review.at)} · {review.reason || review.comment}</p>)}
        </section>
      ) : null}
      {submission.status === "submitted" ? (
        <div style={{ marginTop: 14 }}>
          <ReviewForm submissionId={submission.id} dimensions={challenge.dimensions} />
        </div>
      ) : null}
    </>
  );
}
