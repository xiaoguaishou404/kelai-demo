"use client";

import type { StudentChallengeView } from "@/lib/logic";
import type { AlertDecision, HopMark, WorkDraft } from "@/lib/types";

type EditorProps = {
  view: StudentChallengeView;
  work: WorkDraft;
  setWork: (work: WorkDraft) => void;
  readOnly: boolean;
};

export function ListenEditor({ work, setWork, readOnly }: EditorProps) {
  return (
    <label className="field">
      业务痛点
      <textarea
        disabled={readOnly}
        value={work.listenNote}
        onChange={(event) => setWork({ ...work, listenNote: event.target.value })}
        placeholder="谁，在什么时候，遇到什么业务现象？现在还不能归到哪类原因？"
      />
    </label>
  );
}

export function TopologyEditor({ view, work, setWork, readOnly }: EditorProps) {
  function cycle(id: string) {
    if (readOnly) return;
    const marks = { ...work.hopMarks };
    const current = marks[id];
    const next: HopMark | undefined = !current || current === "pass" ? "capture" : current === "capture" ? "blind" : undefined;
    if (!next) delete marks[id];
    else marks[id] = next;
    setWork({ ...work, hopMarks: marks });
  }
  return (
    <div className="stack">
      <p className="muted">点每一跳切换：未标记 → 采集点 → 盲区。看不见的第三方标成盲区，不要写成已经采到。</p>
      {view.hops.map((hop) => (
        <button key={hop.id} type="button" className="hop" onClick={() => cycle(hop.id)} disabled={readOnly}>
          <b>{hop.name}</b>
          <span>{labelMark(work.hopMarks[hop.id])}</span>
          <small>{hop.note}</small>
        </button>
      ))}
    </div>
  );
}

export function FaultEditor({ view, work, setWork, readOnly, showChart }: EditorProps & { showChart?: boolean }) {
  const max = Math.max(...view.hops.map((hop) => (hop.visible && hop.latencyMs ? hop.latencyMs : 0)), 1);
  return (
    <div className="stack">
      {showChart ? <p className="muted">{view.sampleNote}</p> : <p className="muted">时延图在云桌面里。这里写下你选定的慢点和不可见边界。</p>}
      {showChart
        ? view.hops.map((hop) => (
            <button
              key={hop.id}
              type="button"
              className={work.slowHopId === hop.id ? "hop selected" : "hop"}
              disabled={readOnly || !hop.visible}
              onClick={() => setWork({ ...work, slowHopId: hop.id })}
            >
              <b>{hop.name}</b>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: hop.visible && hop.latencyMs ? `${(hop.latencyMs / max) * 100}%` : "8%" }} />
              </span>
              <span>{hop.visible && hop.latencyMs != null ? `${hop.latencyMs} ms` : "不可见，不能当成已测量的慢点"}</span>
              <small>{hop.note}</small>
            </button>
          ))
        : null}
      <label className="field">
        时延依据
        <textarea
          disabled={readOnly}
          value={work.faultEvidence}
          onChange={(event) => setWork({ ...work, faultEvidence: event.target.value })}
          placeholder="慢在哪一跳，数字是多少，哪些跳已经排除。"
        />
      </label>
      <label className="field">
        不可见边界
        <textarea
          disabled={readOnly}
          value={work.invisibleBoundary}
          onChange={(event) => setWork({ ...work, invisibleBoundary: event.target.value })}
          placeholder="哪一段没有镜像，所以不能编造时延。"
        />
      </label>
    </div>
  );
}

export function AlertEditor({ view, work, setWork, readOnly }: EditorProps) {
  function choose(id: string, decision: AlertDecision) {
    if (readOnly) return;
    setWork({ ...work, alertDecisions: { ...work.alertDecisions, [id]: decision } });
  }
  return (
    <div className="stack">
      {view.alerts.map((alert) => (
        <article key={alert.id} className="alert-row">
          <b>{alert.title}</b>
          <small>{alert.time} · {alert.source} · {alert.detail}</small>
          <div className="choices">
            {(["investigate", "noise", "correlate"] as const).map((decision) => (
              <button
                key={decision}
                type="button"
                className={work.alertDecisions[alert.id] === decision ? "choice on" : "choice"}
                onClick={() => choose(alert.id, decision)}
                disabled={readOnly}
              >
                {decision === "investigate" ? "值得深查" : decision === "noise" ? "重复噪音" : "关联查看"}
              </button>
            ))}
          </div>
          <input
            type="text"
            disabled={readOnly}
            value={work.alertReasons[alert.id] ?? ""}
            placeholder="一句理由"
            onChange={(event) => setWork({ ...work, alertReasons: { ...work.alertReasons, [alert.id]: event.target.value } })}
          />
        </article>
      ))}
    </div>
  );
}

export function InstallEditor({ view, work, setWork, readOnly }: EditorProps) {
  const nextIndex = view.installSteps.findIndex((step) => !work.installDone.includes(step.id));
  return (
    <div className="stack">
      <p className="muted">只能做当前这一步。跳步会把「镜像没接」误判成软件故障。重置云桌面会清空进度。</p>
      {view.installSteps.map((step, index) => {
        const done = work.installDone.includes(step.id);
        return (
          <button
            key={step.id}
            type="button"
            className={done ? "step done" : "step"}
            disabled={readOnly || done || index !== nextIndex}
            onClick={() => setWork({ ...work, installDone: [...work.installDone, step.id] })}
          >
            <b>{index + 1}. {step.title}</b>
            <small>{step.detail}</small>
            <span>{done ? "已完成" : index === nextIndex ? "当前可做" : "先做上一步"}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ReportEditor({ work, setWork, readOnly }: EditorProps) {
  const fields: { key: keyof WorkDraft["report"]; label: string; placeholder: string }[] = [
    { key: "need", label: "需求", placeholder: "客户真正要解决的业务问题" },
    { key: "path", label: "链路", placeholder: "经过哪些跳，哪里是边界" },
    { key: "conclusion", label: "结论", placeholder: "慢或该处理的点在哪，不是什么" },
    { key: "evidence", label: "证据", placeholder: "数字、样本名、排除了什么" },
    { key: "next", label: "下一步", placeholder: "一个具体动作，而不是泛泛扩容" },
  ];
  return (
    <div className="stack">
      {fields.map((field) => (
        <label key={field.key} className="field">
          {field.label}
          <textarea
            disabled={readOnly}
            value={work.report[field.key]}
            placeholder={field.placeholder}
            onChange={(event) => setWork({ ...work, report: { ...work.report, [field.key]: event.target.value } })}
          />
        </label>
      ))}
    </div>
  );
}

function labelMark(mark: HopMark | undefined): string {
  if (mark === "capture") return "采集点";
  if (mark === "blind") return "盲区";
  if (mark === "pass") return "放行";
  return "未标记";
}
