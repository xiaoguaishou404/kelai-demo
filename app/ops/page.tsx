import { Metric, PageHead } from "@/components/bits";
import { resetDemo } from "@/lib/actions";
import { formatWhen } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { opsBoard } from "@/lib/view";

export const metadata = { title: "使用热度" };

export default async function OpsHome() {
  await requireRole("ops");
  const board = opsBoard(readDb());
  const classes = board.schools.reduce((sum, school) => sum + school.classes, 0);
  const used = board.schools.reduce((sum, school) => sum + school.used, 0);
  return (
    <>
      <PageHead kicker="科来运营" title="开课规模和内容热度" lede="这里只有学校、班级数、人数规模和机时。没有学生姓名，也不能从这里点进个人成果。" />
      <div className="grid grid-3">
        <Metric value={board.schools.length} label="合作院校" />
        <Metric value={classes} label="开课班级规模" />
        <Metric value={`${used} 分钟`} label="已记录云桌面机时" />
      </div>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>院校用量</h2>
        <table>
          <thead><tr><th>学校</th><th>方案</th><th>班级</th><th>学生规模</th><th>机时</th><th>数据</th></tr></thead>
          <tbody>
            {board.schools.map((school) => (
              <tr key={school.id}>
                <td>{school.name}<div className="muted">{school.college}</div></td>
                <td>{school.plan}</td>
                <td>{school.classes}</td>
                <td>{school.students}</td>
                <td>{school.used}/{school.quota}</td>
                <td>{school.aggregate ? "校方汇总，无名单" : "仅规模，无名单"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>挑战热度</h2>
        <p className="muted">提交次数和机时来自已接入明细库的学校，按挑战汇总，不按学生展开。</p>
        <table>
          <thead><tr><th>案卷</th><th>状态</th><th>已提交</th><th>机时</th></tr></thead>
          <tbody>
            {board.heat.map((item) => (
              <tr key={item.challengeId}>
                <td>{item.title}</td>
                <td>{item.published ? "已发布" : "未发布"}</td>
                <td>{item.submissions}</td>
                <td>{item.desktopMinutes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>最近发布</h2>
        <ul>{board.releases.slice(0, 3).map((release) => <li key={release.id}>{formatWhen(release.at, false)} · {release.title}</li>)}</ul>
        <form action={resetDemo}>
          <button className="btn ghost" type="submit">恢复演示数据</button>
        </form>
      </section>
    </>
  );
}
