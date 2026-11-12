"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { closeDesktop, extendDesktop, startDesktop } from "@/lib/actions";

export function DesktopHandoff({
  challengeId,
  provider,
  product,
  version,
  policy,
  remaining,
  active,
}: {
  challengeId: string;
  provider: string;
  product: string;
  version: string;
  policy: string;
  remaining: number;
  active: { reservedMinutes: number; extensions: number } | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function run(task: () => Promise<{ ok: boolean; error?: string }>) {
    setError("");
    startTransition(async () => {
      const result = await task();
      if (!result.ok) setError(result.error ?? "机时没有改成");
      else router.refresh();
    });
  }

  return (
    <section className="handoff">
      <div>
        <p className="kicker">{provider}</p>
        <h2>{product}</h2>
        <p>{version}</p>
        <p>{policy}</p>
      </div>
      <div className="handoff-meter">
        <b>{remaining}</b>
        <span>学校还可预约的分钟</span>
        {active ? <p>已锁定 {active.reservedMinutes} 分钟 · 延时 {active.extensions} 次</p> : <p>当前没有未结算的预约</p>}
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        {!active ? <button className="btn" type="button" disabled={pending} onClick={() => run(() => startDesktop(challengeId))}>预约 45 分钟</button> : null}
        {active ? <button className="btn ghost" type="button" disabled={pending} onClick={() => run(() => extendDesktop(challengeId))}>再锁 30 分钟</button> : null}
        {active ? <button className="btn" type="button" disabled={pending} onClick={() => run(() => closeDesktop(challengeId))}>结束预约并结算</button> : null}
        <button className="btn" type="button" disabled title="在线虚拟机将接入第三方平台，本站不提供镜像">打开虚拟机</button>
      </div>
    </section>
  );
}
