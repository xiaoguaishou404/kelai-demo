import { STATUS_LABEL } from "@/lib/labels";
import type { SubmissionStatus } from "@/lib/types";

export function PageHead({ kicker, title, lede }: { kicker?: string; title: string; lede?: string }) {
  return (
    <header className="page-head">
      {kicker ? <p className="kicker">{kicker}</p> : null}
      <h1>{title}</h1>
      {lede ? <p className="lede">{lede}</p> : null}
    </header>
  );
}

export function StatusPill({ status }: { status: SubmissionStatus | "none" }) {
  return <span className={`pill pill-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card metric">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}
