"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearInstall, openExpert, saveWork, submitWork } from "@/lib/actions";
import type { StudentChallengeView } from "@/lib/logic";
import { dimensionLabel } from "@/lib/labels";
import type { SubmissionStatus, WorkDraft } from "@/lib/types";
import { AlertEditor, FaultEditor, InstallEditor, ListenEditor, ReportEditor, TopologyEditor } from "./editors";
import { StatusPill } from "./bits";

export function ChallengeWorkspace({
  view,
  initialWork,
  status,
  updatedAt,
  stuckOpened,
}: {
  view: StudentChallengeView;
  initialWork: WorkDraft;
  status: SubmissionStatus | "none";
  updatedAt: string;
  stuckOpened: boolean;
}) {
  const router = useRouter();
  const [work, setWork] = useState(initialWork);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    setWork(initialWork);
  }, [updatedAt, initialWork]);
  const readOnly = status === "submitted" || status === "accepted";

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "没有完成");
      else router.refresh();
    });
  }

  const needsDesk = view.stages.some((stage) => stage.kind === "fault" || stage.kind === "alert" || stage.kind === "install");

  return (
    <div className="stack">
      <ol className="stage-rail">
        {view.stages.map((stage, index) => (
          <li key={stage.id}><span>{index + 1}</span>{stage.title}</li>
        ))}
      </ol>
      <div className="row">
        <StatusPill status={status === "none" ? "none" : status} />
        {stuckOpened ? <span className="pill">已查看专家范本</span> : null}
        {view.dimensions.map((dimension) => (
          <span key={dimension} className="pill">{dimensionLabel(dimension)}</span>
        ))}
      </div>
      <blockquote className="quote">{view.quote}</blockquote>
      <section className="card">
        <h2>完成指标</h2>
        <ul>
          {view.indicators.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      {view.stages.map((stage) => (
        <section key={stage.id} className="card">
          <h2>{stage.title}</h2>
          <p className="muted">{stage.prompt}</p>
          {stage.kind === "listen" ? <ListenEditor view={view} work={work} setWork={setWork} readOnly={readOnly} /> : null}
          {stage.kind === "topology" ? <TopologyEditor view={view} work={work} setWork={setWork} readOnly={readOnly} /> : null}
          {stage.kind === "fault" ? <FaultEditor view={view} work={work} setWork={setWork} readOnly={readOnly} /> : null}
          {stage.kind === "alert" ? <AlertEditor view={view} work={work} setWork={setWork} readOnly={readOnly} /> : null}
          {stage.kind === "install" ? <InstallEditor view={view} work={work} setWork={setWork} readOnly={readOnly} /> : null}
          {stage.kind === "report" ? <ReportEditor view={view} work={work} setWork={setWork} readOnly={readOnly} /> : null}
        </section>
      ))}
      {view.expert ? (
        <section className="card expert">
          <h2>专家参考范本</h2>
          <p>教师能看到你打开过范本。答辩时要讲自己的证据，而不是背这段话。</p>
          <ul>{view.expert.mindset.map((item) => <li key={item}>{item}</li>)}</ul>
          <p><b>容易走偏：</b>{view.expert.pitfalls.join("；")}</p>
          <p>{view.expert.answer}</p>
        </section>
      ) : status !== "accepted" ? (
        <button
          className="btn ghost noprint"
          type="button"
          disabled={pending}
          onClick={() => run(async () => {
            const saved = await saveWork(view.id, work);
            if (!saved.ok) return saved;
            return openExpert(view.id);
          })}
        >
          我卡壳了，查看专家范本
        </button>
      ) : null}
      {error ? <p className="error">{error}</p> : null}
      <div className="row noprint">
        {needsDesk ? (
          <button
            className="btn ghost"
            type="button"
            disabled={pending}
            onClick={() => {
              if (readOnly) {
                router.push(`/student/desktop/${view.id}`);
                return;
              }
              run(async () => {
                const saved = await saveWork(view.id, work);
                if (saved.ok) router.push(`/student/desktop/${view.id}`);
                return saved;
              });
            }}
          >
            预约云桌面机时
          </button>
        ) : null}
        {view.installSteps.length > 0 ? (
          <button className="btn ghost" type="button" disabled={pending || readOnly} onClick={() => run(() => clearInstall(view.id))}>重做装机勾选</button>
        ) : null}
        <button className="btn ghost" type="button" disabled={pending || readOnly} onClick={() => run(() => saveWork(view.id, work))}>保存进度</button>
        <button className="btn" type="button" disabled={pending || readOnly} onClick={() => run(() => submitWork(view.id, work))}>提交验收</button>
      </div>
    </div>
  );
}
