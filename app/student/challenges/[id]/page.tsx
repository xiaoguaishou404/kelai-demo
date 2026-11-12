import { ChallengeWorkspace } from "@/components/challenge-workspace";
import { PageHead } from "@/components/bits";
import { findSubmission, toStudentView } from "@/lib/logic";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { emptyWork } from "@/lib/types";
import { studentHome } from "@/lib/view";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const challenge = readDb().challenges.find((item) => item.id === id);
  return { title: challenge?.title ?? "挑战" };
}

export default async function ChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("student");
  const { id } = await params;
  const db = readDb();
  const row = studentHome(db, user.id).rows.find((item) => item.challenge.id === id);
  if (!row) {
    return <PageHead title="这门挑战不在你的课表里" lede="可能尚未发布，或教师没有把它配给这个班。" />;
  }
  const submission = findSubmission(db, user.id, id);
  const view = toStudentView(row.challenge, Boolean(submission?.stuckOpened));
  return (
    <>
      <PageHead kicker={row.challenge.code} title={row.challenge.title} lede={row.challenge.scene} />
      <section className="dossier">
        <p className="kicker">开卷阅读</p>
        {(row.challenge.reading ?? []).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </section>
      {submission?.status === "returned" && submission.review ? (
        <div className="banner banner-return">
          <b>教师退回了这份成果。</b>
          <p>{submission.review.reason}</p>
          <p>{submission.review.comment}</p>
        </div>
      ) : null}
      {submission?.status === "accepted" && submission.review ? (
        <div className="banner banner-ok">
          <b>已通过。</b>
          <p>{submission.review.comment}</p>
          {submission.review.defenseNote ? <p>答辩：{submission.review.defenseNote}</p> : null}
        </div>
      ) : null}
      {submission?.status === "submitted" ? <div className="banner banner-wait">已提交，教师验收前不能再改。</div> : null}
      <ChallengeWorkspace
        view={view}
        initialWork={submission?.work ?? emptyWork()}
        status={submission?.status ?? "none"}
        updatedAt={submission?.updatedAt ?? ""}
        stuckOpened={Boolean(submission?.stuckOpened)}
      />
    </>
  );
}
