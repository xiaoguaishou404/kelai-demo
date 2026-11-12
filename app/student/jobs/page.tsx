import { PageHead } from "@/components/bits";
import { DIMENSIONS, dimensionLabel } from "@/lib/labels";
import { readDb } from "@/lib/store";

export const metadata = { title: "岗位地图" };

export default function JobsPage() {
  const db = readDb();
  return (
    <>
      <PageHead
        kicker={`${db.trend.season} 风向`}
        title={db.trend.headline}
        lede="地图覆盖科来和同业岗位，用来对照自己的六维，不是招聘投递，也不承诺去哪家公司。"
      />
      <section className="card">
        <ul>{db.trend.notes.map((note) => <li key={note}>{note}</li>)}</ul>
      </section>
      <div className="grid" style={{ marginTop: 14 }}>
        {db.jobs.map((job) => (
          <article key={job.id} className="card">
            <h2>{job.name}</h2>
            <p>{job.summary}</p>
            <p className="muted">职责：{job.duties.join("；")}</p>
            <p className="muted">公司类型：{job.companyTypes.join("、")}</p>
            <div className="row">
              {job.dimensions.map((dimension) => <span key={dimension} className="pill">{dimensionLabel(dimension)}</span>)}
            </div>
            <p className="muted">当下技能：{job.skills.join("、")}</p>
          </article>
        ))}
      </div>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>能力块对应</h2>
        <table className="matrix">
          <thead>
            <tr>
              <th>岗位</th>
              {DIMENSIONS.map((dimension) => <th key={dimension.id}>{dimension.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {db.jobs.map((job) => (
              <tr key={job.id}>
                <td>{job.name}</td>
                {DIMENSIONS.map((dimension) => <td key={dimension.id}>{job.dimensions.includes(dimension.id) ? "●" : ""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted">故障定位和汇报结论是合作院校的必选块。其余四块由学校在合同里选配。CSNA 由认证机构考试发证，平台只说明它和取证、链路、告警相关，不在站内报名或发证。</p>
      </section>
    </>
  );
}
