import { PageHead } from "@/components/bits";
import { addRelease, setChallengePublished, updateDesktopVersion, updateTrend } from "@/lib/actions";
import { formatWhen } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { opsBoard } from "@/lib/view";

export const metadata = { title: "风向与内容" };

export default async function ContentPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  await requireRole("ops");
  const { e } = await searchParams;
  const board = opsBoard(readDb());
  return (
    <>
      <PageHead kicker={board.trend.season} title="岗位风向与挑战发布" lede="科来统一更新风向、案卷和云桌面版本。学校看不到这里的发布开关。" />
      {e ? <p className="error">还有空着的字段，没有保存。</p> : null}
      <section className="card">
        <h2>当前风向</h2>
        <form action={updateTrend} className="stack">
          <label className="field">标题<input name="headline" type="text" defaultValue={board.trend.headline} required /></label>
          <label className="field">要点，一行一条<textarea name="notes" defaultValue={board.trend.notes.join("\n")} /></label>
          <button className="btn" type="submit">更新风向</button>
        </form>
      </section>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>云桌面版本</h2>
        <p>{board.desktop.product} · {board.desktop.policy}</p>
        <form action={updateDesktopVersion} className="row">
          <input name="version" type="text" defaultValue={board.desktop.version} />
          <button className="btn" type="submit">更新版本号</button>
        </form>
      </section>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>案卷上下架</h2>
        {board.challenges.map((challenge) => (
          <form key={challenge.id} action={setChallengePublished} className="row">
            <input type="hidden" name="challengeId" value={challenge.id} />
            <input type="hidden" name="published" value={challenge.published ? "0" : "1"} />
            <span>{challenge.code} {challenge.title}{challenge.core ? " · 必选素材" : ""}</span>
            <button className="btn ghost" type="submit">{challenge.published ? "下架" : "发布"}</button>
          </form>
        ))}
      </section>
      <section className="card" style={{ marginTop: 14 }}>
        <h2>发布记录</h2>
        <ul>{board.releases.map((release) => <li key={release.id}>{formatWhen(release.at)} · {release.title}：{release.body}</li>)}</ul>
        <form action={addRelease} className="stack">
          <label className="field">标题<input name="title" type="text" required /></label>
          <label className="field">说明<textarea name="body" required /></label>
          <button className="btn" type="submit">记一笔发布</button>
        </form>
      </section>
    </>
  );
}
