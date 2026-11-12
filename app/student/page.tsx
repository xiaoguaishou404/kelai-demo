import { Metric, PageHead, StatusPill } from "@/components/bits";
import { Radar } from "@/components/radar";
import { DIMENSIONS } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { studentHome } from "@/lib/view";

export const metadata = { title: "学习台" };

export default async function StudentHome() {
  const user = await requireRole("student");
  const data = studentHome(readDb(), user.id);
  return (
    <>
      <PageHead
        kicker={data.room ? `${data.room.term} · ${data.room.name}` : "尚未分班"}
        title={`${user.name}，先看下一份该交的成果`}
        lede="挑战按目标问题组织，不按课时。通过验收就可以进入下一块。云桌面只记你自己的机时。"
      />
      <div className="grid grid-3">
        <Metric value={data.place ? `${data.place}/${data.total}` : "—"} label="班级进度名次" />
        <Metric value={`${data.minutes} 分钟`} label="已结算云桌面机时" />
        <Metric value={data.badges.length} label="已获得勋章" />
      </div>
      <div className="grid grid-2" style={{ marginTop: 14 }}>
        <section className="card">
          <h2>课表</h2>
          {data.rows.length === 0 ? <p>教师还没有把挑战配到你的班级。</p> : null}
          <table>
            <thead>
              <tr><th>案卷</th><th>状态</th><th></th></tr>
            </thead>
            <tbody>
              {data.rows.map((row) => (
                <tr key={row.challenge.id}>
                  <td>
                    <b>{row.challenge.title}</b>
                    <div className="muted">{row.challenge.code}</div>
                  </td>
                  <td>
                    <StatusPill status={row.submission?.status ?? "none"} />
                    {row.submission?.stuckOpened ? <div className="muted">看过范本</div> : null}
                  </td>
                  <td><a href={`/student/challenges/${row.challenge.id}`}>打开</a></td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.next ? (
            <p>建议先处理「{data.next.challenge.title}」。</p>
          ) : <p>当前课表里的案卷都已提交。</p>}
          {data.active ? <p>有一节云桌面还没结算。</p> : null}
        </section>
        <section className="card">
          <h2>六维</h2>
          <Radar axes={DIMENSIONS.map((dimension) => ({ label: dimension.label.slice(0, 4), value: data.scores[dimension.id] }))} />
          <div className="row">
            {data.badges.map((badge) => <span key={badge.id} className="pill">{badge.name}</span>)}
          </div>
        </section>
      </div>
    </>
  );
}
