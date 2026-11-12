import { PageHead, StatusPill } from "@/components/bits";
import { dimensionLabel } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { studentHome } from "@/lib/view";

export const metadata = { title: "目标挑战" };

export default async function ChallengesPage() {
  const user = await requireRole("student");
  const data = studentHome(readDb(), user.id);
  return (
    <>
      <PageHead kicker="目标挑战" title="每门案卷只问一个值得解决的问题" lede="可以查资料，也可以在卡壳时打开专家范本。打开过会留痕，答辩时要讲清为什么。" />
      <div className="stack">
        {data.rows.map((row) => (
          <a key={row.challenge.id} className="card" href={`/student/challenges/${row.challenge.id}`}>
            <div className="row">
              <b>{row.challenge.code}</b>
              <StatusPill status={row.submission?.status ?? "none"} />
              {row.challenge.core ? <span className="pill">必选</span> : <span className="pill">学校选配</span>}
            </div>
            <h2>{row.challenge.title}</h2>
            <p>{row.challenge.summary}</p>
            <div className="row">{row.challenge.dimensions.map((dimension) => <span key={dimension} className="pill">{dimensionLabel(dimension)}</span>)}</div>
          </a>
        ))}
      </div>
    </>
  );
}
