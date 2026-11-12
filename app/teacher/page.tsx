import { PageHead, StatusPill } from "@/components/bits";
import { formatWhen } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { teacherQueue } from "@/lib/view";

export const metadata = { title: "验收队列" };

export default async function TeacherHome() {
  const user = await requireRole("teacher");
  const queue = teacherQueue(readDb(), user.id);
  return (
    <>
      <PageHead kicker="教学验收" title="待你判断的成果" lede="评分看证据和边界，不看学生是否按某一步点击。退回时写清要改什么。" />
      {queue.length === 0 ? <p className="card">现在没有待验收的成果。</p> : null}
      <div className="stack">
        {queue.map((item) => (
          <a key={item.submission.id} className="card" href={`/teacher/review/${item.submission.id}`}>
            <div className="row">
              <b>{item.student?.name}</b>
              <StatusPill status={item.submission.status} />
              {item.submission.stuckOpened ? <span className="pill">看过范本</span> : null}
              <span className="muted">第 {item.submission.attempt} 次提交 · {formatWhen(item.submission.updatedAt)}</span>
            </div>
            <h2>{item.challenge?.title}</h2>
          </a>
        ))}
      </div>
    </>
  );
}
