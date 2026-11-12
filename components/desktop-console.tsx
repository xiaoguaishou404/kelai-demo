"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeDesktop, extendDesktop, resetDesktop, saveWork, startDesktop } from "@/lib/actions";
import type { StudentChallengeView } from "@/lib/logic";
import type { SubmissionStatus, WorkDraft } from "@/lib/types";
import { AlertEditor, FaultEditor, InstallEditor } from "./editors";

export function DesktopConsole({
  view,
  initialWork,
  status,
  updatedAt,
  product,
  version,
  policy,
  remaining,
  active,
}: {
  view: StudentChallengeView;
  initialWork: WorkDraft;
  status: SubmissionStatus | "none";
  updatedAt: string;
  product: string;
  version: string;
  policy: string;
  remaining: number;
  active: { startedAt: string; reservedMinutes: number; extensions: number; resetCount: number } | null;
}) {
  const router = useRouter();
  const [work, setWork] = useState(initialWork);
  const [error, setError] = useState("");
  const [now, setNow] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();
  const readOnly = status === "submitted" || status === "accepted";
  useEffect(() => {
    setWork(initialWork);
  }, [updatedAt, initialWork]);
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [active]);

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "云桌面没有完成这个操作");
      else router.refresh();
    });
  }

  const elapsedMin = active && now ? Math.max(0, Math.floor((now - Date.parse(active.startedAt)) / 60000)) : 0;
  const elapsedSec = active && now ? Math.max(0, Math.floor((now - Date.parse(active.startedAt)) / 1000) % 60) : 0;
  const overtime = active ? elapsedMin >= active.reservedMinutes : false;
  const kinds = new Set(view.stages.map((stage) => stage.kind));

  return (
    <section className="desktop">
      <header className="desktop-chrome">
        <div>
          <b>{product}</b>
          <div>{version} · 样本 {view.sampleName}</div>
        </div>
        <div>
          {active ? <div>会话 {elapsedMin}:{String(elapsedSec).padStart(2, "0")} / 已申请 {active.reservedMinutes} 分钟</div> : <div>还没有开始会话</div>}
          <div>学校剩余可申请 {remaining} 分钟 · 已延时 {active?.extensions ?? 0} 次 · 重置 {active?.resetCount ?? 0} 次</div>
        </div>
      </header>
      <div className="desktop-window">
        {overtime ? <p className="banner banner-return">已超过申请机时。先结算，或在额度够的时候再延 30 分钟。</p> : null}
        <p className="muted">{policy}</p>
        {kinds.has("fault") ? <FaultEditor view={view} work={work} setWork={setWork} readOnly={readOnly} showChart /> : null}
        {kinds.has("alert") ? <AlertEditor view={view} work={work} setWork={setWork} readOnly={readOnly} /> : null}
        {kinds.has("install") ? <InstallEditor view={view} work={work} setWork={setWork} readOnly={readOnly} /> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
      <footer className="desktop-foot">
        <div className="row">
          {!active ? <button className="btn" type="button" disabled={pending} onClick={() => run(() => startDesktop(view.id))}>开始 45 分钟</button> : null}
          {active ? <button className="btn ghost" type="button" disabled={pending} onClick={() => run(() => extendDesktop(view.id))}>延时 30 分钟</button> : null}
          {active ? <button className="btn ghost" type="button" disabled={pending} onClick={() => run(() => resetDesktop(view.id))}>恢复初始桌面</button> : null}
          {active ? <button className="btn" type="button" disabled={pending} onClick={() => run(() => closeDesktop(view.id))}>结束并记入机时</button> : null}
          <button className="btn ghost" type="button" disabled={pending || readOnly} onClick={() => run(() => saveWork(view.id, work))}>保存取证</button>
        </div>
        <button className="btn" type="button" disabled title={policy}>下载镜像</button>
      </footer>
    </section>
  );
}
