import { Metric, PageHead } from "@/components/bits";
import { PrintButton } from "@/components/print-button";
import { Radar } from "@/components/radar";
import { DIMENSIONS, dimensionLabel, formatWhen } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { leaderBoard } from "@/lib/view";

export const metadata = { title: "学情看板" };

export default async function LeaderPage() {
  const user = await requireRole("leader");
  const data = leaderBoard(readDb(), user.tenantId);
  const tenant = data.tenant;
  if (!tenant) return <PageHead title="找不到本校租户" />;
  const classCount = data.classes.length;
  const students = data.classes.reduce((sum, item) => sum + item.studentCount, 0);
  const minutes = data.classes.reduce((sum, item) => sum + item.desktopMinutes, 0);
  return (
    <article>
      <div className="row noprint"><PrintButton label="导出验收报告" /></div>
      <PageHead
        kicker="项目运行与验收报告"
        title={`${tenant.name} · ${tenant.college}`}
        lede={`${tenant.plan} · 生成于 ${formatWhen(data.generatedAt)}。明细留在本校，不向科来提供学生个人名单。`}
      />
      <div className="grid grid-3">
        <Metric value={classCount} label="开课班级" />
        <Metric value={students} label="在班学生" />
        <Metric value={`${minutes}/${tenant.desktopQuotaMinutes}`} label="云桌面已用 / 额度（分钟）" />
      </div>
      <p className="muted">本校启用能力块：{tenant.enabledDimensions.map((dimension) => dimensionLabel(dimension)).join("、")}。其中故障定位和汇报结论为必选。</p>
      {data.classes.map((item) => (
        <section key={item.room.id} className="card" style={{ marginTop: 14 }}>
          <h2>{item.room.term} {item.room.name}</h2>
          <p>教师 {item.teacherName} · {item.studentCount} 人 · 案卷通过率 {item.passRate}% · 机时 {item.desktopMinutes} 分钟</p>
          <p>最弱能力块：{dimensionLabel(item.weakest)}。退回卡点：{item.hotspot}</p>
          <Radar axes={DIMENSIONS.map((dimension) => ({ label: dimension.label.slice(0, 4), value: item.averages[dimension.id] }))} />
          <table>
            <thead>
              <tr>
                <th>学生</th>
                <th>综合</th>
                {DIMENSIONS.map((dimension) => <th key={dimension.id}>{dimension.label.slice(0, 2)}</th>)}
              </tr>
            </thead>
            <tbody>
              {item.students.map((student) => (
                <tr key={student.id}>
                  <td>{student.name}</td>
                  <td>{student.score}</td>
                  {DIMENSIONS.map((dimension) => <td key={dimension.id}>{student.scores[dimension.id] ?? "—"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="muted">未开始的能力块按 0 计入均分，用来暴露还没覆盖到的维度，而不是只平均已经交作业的人。</p>
        </section>
      ))}
    </article>
  );
}
