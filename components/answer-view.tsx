import { decisionLabel, markLabel } from "@/lib/labels";
import type { Challenge, WorkDraft } from "@/lib/types";

export function AnswerView({ challenge, work }: { challenge: Challenge; work: WorkDraft }) {
  return (
    <div className="stack">
      {challenge.stages.map((stage) => (
        <section key={stage.id} className="card">
          <h3>{stage.title}</h3>
          {stage.kind === "listen" ? <p>{work.listenNote || "（空）"}</p> : null}
          {stage.kind === "topology" ? (
            <ul>
              {challenge.hops.map((hop) => (
                <li key={hop.id}>{hop.name}：{markLabel(work.hopMarks[hop.id])}</li>
              ))}
            </ul>
          ) : null}
          {stage.kind === "fault" ? (
            <>
              <p>慢点：{challenge.hops.find((hop) => hop.id === work.slowHopId)?.name || "未选"}</p>
              <p>{work.faultEvidence || "（没有时延依据）"}</p>
              <p>边界：{work.invisibleBoundary || "（没有写边界）"}</p>
            </>
          ) : null}
          {stage.kind === "alert" ? (
            <ul>
              {challenge.alerts.map((alert) => (
                <li key={alert.id}>
                  {alert.title}：{decisionLabel(work.alertDecisions[alert.id])}
                  {work.alertReasons[alert.id] ? `。${work.alertReasons[alert.id]}` : ""}
                </li>
              ))}
            </ul>
          ) : null}
          {stage.kind === "install" ? (
            <ul>
              {challenge.installSteps.map((step) => (
                <li key={step.id}>{work.installDone.includes(step.id) ? "已做" : "未做"} · {step.title}</li>
              ))}
            </ul>
          ) : null}
          {stage.kind === "report" ? (
            <ul>
              <li>需求：{work.report.need || "（空）"}</li>
              <li>链路：{work.report.path || "（空）"}</li>
              <li>结论：{work.report.conclusion || "（空）"}</li>
              <li>证据：{work.report.evidence || "（空）"}</li>
              <li>下一步：{work.report.next || "（空）"}</li>
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
