import { PageHead, StatusPill } from "@/components/bits";
import { PrintButton } from "@/components/print-button";
import { Radar } from "@/components/radar";
import { DIMENSIONS, dimensionLabel, formatWhen } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { portraitOf } from "@/lib/view";

export const metadata = { title: "能力画像" };

export default async function PortraitPage() {
  const user = await requireRole("student");
  const data = portraitOf(readDb(), user.id);
  const best = data.fit[0];
  return (
    <article>
      <div className="row noprint">
        <PrintButton label="导出画像报告" />
      </div>
      <PageHead
        kicker="岗位实践能力画像报告"
        title={user.name}
        lede={`${data.tenant?.name ?? ""} ${data.tenant?.college ?? ""} · ${data.room?.name ?? "未分班"} · 生成于 ${formatWhen(data.generatedAt)}`}
      />
      <p>本报告留在学校，可作岗位实践能力说明。平台不承诺就业，也不把档案交给科来筛选。</p>
      <div className="grid grid-2">
        <section className="card">
          <h2>六维实战能力</h2>
          <Radar axes={DIMENSIONS.map((dimension) => ({ label: dimension.label.slice(0, 4), value: data.scores[dimension.id] }))} />
          <ul>
            {DIMENSIONS.map((dimension) => (
              <li key={dimension.id}>{dimension.label}：{data.scores[dimension.id] == null ? "未覆盖" : data.scores[dimension.id]}</li>
            ))}
          </ul>
        </section>
        <section className="card">
          <h2>岗位契合</h2>
          <p>当前最接近「{best?.job.name ?? "—"}」，契合 {best?.score ?? 0}。这是和岗位技能块的对照，不是录取结果。</p>
          {data.fit.map((item) => (
            <div key={item.job.id}>
              <div className="row"><b>{item.job.name}</b><span>{item.score}</span></div>
              <div className="bar-track"><span className="bar-fill" style={{ width: `${item.score}%` }} /></div>
              <p className="muted">{item.job.dimensions.map((dimension) => dimensionLabel(dimension)).join("、")}</p>
            </div>
          ))}
          <p>班级进度第 {data.place || "—"} / {data.total}。云桌面累计 {data.minutes} 分钟。</p>
        </section>
      </div>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>勋章</h2>
        <div className="row">
          {data.badges.map((badge) => (
            <span key={badge.id} className="pill" title={badge.description}>{badge.earned ? badge.name : `${badge.name} · 未获得`}</span>
          ))}
        </div>
      </section>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>案卷与答辩</h2>
        <table>
          <tbody>
            {data.challenges.map((item) => (
              <tr key={item.challenge.id}>
                <td>{item.challenge.title}</td>
                <td><StatusPill status={item.submission?.status ?? "none"} /></td>
                <td>{item.submission?.review?.comment ?? "还没有教师评语"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.reviews.map((item) => (
          <p key={item.challengeTitle}><b>{item.challengeTitle}：</b>{item.review.tags.join("、") || "无标签"} {item.review.defenseNote}</p>
        ))}
      </section>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>云桌面足迹</h2>
        <ul>
          {data.sessions.map((session) => (
            <li key={session.id}>{formatWhen(session.startedAt)} · {session.status === "closed" ? `结算 ${session.chargedMinutes} 分钟` : "进行中"} · 重置 {session.resetCount} 次</li>
          ))}
        </ul>
      </section>
    </article>
  );
}
