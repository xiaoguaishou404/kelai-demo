import { PageHead, StatusPill } from "@/components/bits";
import { formatWhen } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import type { SubmissionStatus } from "@/lib/types";
import { teacherArchive } from "@/lib/view";

export const metadata = { title: "验收队列" };

const boxes: { id: SubmissionStatus | "all"; label: string }[] = [
  { id: "submitted", label: "待验收" },
  { id: "returned", label: "已退回" },
  { id: "accepted", label: "已通过" },
  { id: "draft", label: "草稿" },
  { id: "all", label: "全部" },
];

export default async function TeacherHome({ searchParams }: { searchParams: Promise<{ box?: string }> }) {
  const user = await requireRole("teacher");
  const { box } = await searchParams;
  const selected = boxes.some((item) => item.id === box) ? (box as SubmissionStatus | "all") : "submitted";
  const archive = teacherArchive(readDb(), user.id, selected);
  return (
    <>
      <PageHead kicker="教学验收" title="按状态看全班成果" lede="待验收才需要你现在打分。已通过和已退回留着对照，草稿说明学生还在写。" />
      <div className="row noprint">
        {boxes.map((item) => (
          <a key={item.id} className={item.id === selected ? "choice on" : "choice"} href={item.id === "submitted" ? "/teacher" : `/teacher?box=${item.id}`}>
            {item.label} {archive.counts[item.id as keyof typeof archive.counts] ?? ""}
          </a>
        ))}
      </div>
      {archive.items.length === 0 ? <p className="card">这个状态下面没有成果。</p> : null}
      <div className="stack" style={{ marginTop: 14 }}>
        {archive.items.map((item) => (
          <a key={item.submission.id} className="card case-link" href={`/teacher/review/${item.submission.id}`}>
            <div className="row">
              <b>{item.student?.name}</b>
              <StatusPill status={item.submission.status} />
              {item.submission.stuckOpened ? <span className="pill">看过范本</span> : null}
              <span className="muted">第 {item.submission.attempt} 次 · {formatWhen(item.submission.updatedAt)}</span>
            </div>
            <h2>{item.challenge?.title}</h2>
            {item.submission.review?.comment ? <p className="muted">{item.submission.review.comment}</p> : null}
          </a>
        ))}
      </div>
    </>
  );
}