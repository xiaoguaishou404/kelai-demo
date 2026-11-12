import { PageHead, StatusPill } from "@/components/bits";
import { addStudent, postNotice, setOptionalChallenge } from "@/lib/actions";
import { findSubmission } from "@/lib/logic";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { classTable } from "@/lib/view";

export const metadata = { title: "班级" };

export default async function ClassPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}) {
  const user = await requireRole("teacher");
  const { id } = await params;
  const { e } = await searchParams;
  const db = readDb();
  const table = classTable(db, id);
  if (!table || table.room.teacherId !== user.id) return <PageHead title="这不是你的班级" />;
  const optionalPool = db.challenges.filter((challenge) => !challenge.core);
  return (
    <>
      <PageHead kicker={table.room.term} title={table.room.name} lede="必选案卷覆盖故障定位和汇报。其余挑战由你决定这个班做不做。" />
      {e === "name" ? <p className="error">姓名需要 2 到 20 个字。</p> : null}
      {e === "notice" ? <p className="error">通知至少写 6 个字。</p> : null}
      <section className="card">
        <h2>班级通知</h2>
        {(table.room.notices ?? []).map((notice) => <p key={notice.id}>{notice.body}</p>)}
        <form action={postNotice} className="stack">
          <input type="hidden" name="classId" value={table.room.id} />
          <label className="field">写给这个班<textarea name="body" placeholder="例如本周先收哪门案卷、退回要改什么" /></label>
          <button className="btn" type="submit">发给学生</button>
        </form>
      </section>
      <section className="card">
        <h2>进度</h2>
        <table>
          <thead>
            <tr>
              <th>学生</th>
              {table.challenges.map((challenge) => <th key={challenge.id}>{challenge.title}</th>)}
            </tr>
          </thead>
          <tbody>
            {table.students.map((student) => student ? (
              <tr key={student.id}>
                <td>{student.name}</td>
                {table.challenges.map((challenge) => {
                  const submission = findSubmission(db, student.id, challenge.id);
                  return (
                    <td key={challenge.id}>
                      <StatusPill status={submission?.status ?? "none"} />
                      {submission?.stuckOpened ? <div className="muted">看过范本</div> : null}
                      {submission?.status === "submitted" ? <div><a href={`/teacher/review/${submission.id}`}>验收</a></div> : null}
                      {submission && submission.status !== "submitted" ? <div><a href={`/teacher/review/${submission.id}`}>查看</a></div> : null}
                    </td>
                  );
                })}
              </tr>
            ) : null)}
          </tbody>
        </table>
      </section>
      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <section className="card">
          <h2>导入学生</h2>
          <p className="muted">名单由学校导入。学生用演示口令登录，不能自己注册。</p>
          <form action={addStudent} className="stack">
            <input type="hidden" name="classId" value={table.room.id} />
            <label className="field">姓名<input name="name" type="text" required minLength={2} maxLength={20} /></label>
            <label className="field">班级备注<input name="title" type="text" placeholder="例如 网络空间安全 · 2025 级" /></label>
            <button className="btn" type="submit">加入班级</button>
          </form>
        </section>
        <section className="card">
          <h2>选配挑战</h2>
          {optionalPool.map((challenge) => {
            const on = table.room.optionalChallengeIds.includes(challenge.id);
            return (
              <form key={challenge.id} action={setOptionalChallenge} className="row">
                <input type="hidden" name="classId" value={table.room.id} />
                <input type="hidden" name="challengeId" value={challenge.id} />
                <input type="hidden" name="on" value={on ? "0" : "1"} />
                <span>{challenge.title}{challenge.published ? "" : "（未发布）"}</span>
                <button className="btn ghost" type="submit">{on ? "从班级移出" : "配到班级"}</button>
              </form>
            );
          })}
          <p className="muted">必选案卷不能移出。未发布的挑战即使配上，学生也还看不到。</p>
        </section>
      </div>
    </>
  );
}
