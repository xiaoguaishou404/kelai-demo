"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { reviewSubmission } from "@/lib/actions";
import { dimensionLabel } from "@/lib/labels";
import { REVIEW_TAGS, type DimensionId } from "@/lib/types";

export function ReviewForm({
  submissionId,
  dimensions,
}: {
  submissionId: string;
  dimensions: DimensionId[];
}) {
  const router = useRouter();
  const [scores, setScores] = useState<Partial<Record<DimensionId, number>>>({});
  const [tags, setTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [defenseNote, setDefenseNote] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function send(decision: "accept" | "return") {
    setError("");
    startTransition(async () => {
      const result = await reviewSubmission({ submissionId, decision, scores, tags, comment, defenseNote, reason });
      if (!result.ok) setError(result.error ?? "没有提交验收");
      else router.refresh();
    });
  }

  return (
    <section className="card stack">
      <h2>验收</h2>
      {dimensions.map((dimension) => (
        <div key={dimension} className="row">
          <b>{dimensionLabel(dimension)}</b>
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              className={scores[dimension] === score ? "choice on" : "choice"}
              onClick={() => setScores((current) => ({ ...current, [dimension]: score }))}
            >
              {score}
            </button>
          ))}
        </div>
      ))}
      <div className="row">
        {REVIEW_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className={tags.includes(tag) ? "choice on" : "choice"}
            onClick={() => setTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])}
          >
            {tag}
          </button>
        ))}
      </div>
      <label className="field">评语<textarea value={comment} onChange={(event) => setComment(event.target.value)} /></label>
      <label className="field">答辩注记<textarea value={defenseNote} onChange={(event) => setDefenseNote(event.target.value)} placeholder="学生有没有讲清为什么" /></label>
      <label className="field">退回时要改什么<textarea value={reason} onChange={(event) => setReason(event.target.value)} /></label>
      {error ? <p className="error">{error}</p> : null}
      <div className="row">
        <button className="btn" type="button" disabled={pending} onClick={() => send("accept")}>通过</button>
        <button className="btn danger" type="button" disabled={pending} onClick={() => send("return")}>退回重做</button>
      </div>
    </section>
  );
}
