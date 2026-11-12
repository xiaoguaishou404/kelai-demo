import { PageHead } from "@/components/bits";
import { adjustQuota } from "@/lib/actions";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { opsBoard } from "@/lib/view";

export const metadata = { title: "租户额度" };

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  await requireRole("ops");
  const { e } = await searchParams;
  const board = opsBoard(readDb());
  return (
    <>
      <PageHead kicker="租户" title="云桌面机时额度" lede="增补的是学校额度，不是某个学生的账号。额度不能调到已用量以下。" />
      {e ? <p className="error">请填写不为 0 的分钟数。</p> : null}
      <div className="stack">
        {board.schools.map((school) => {
          const over = school.used > school.quota;
          return (
            <section key={school.id} className="card">
              <h2>{school.name}</h2>
              <p>{school.college} · {school.plan}</p>
              <p>已用 {school.used} / 额度 {school.quota} 分钟{over ? "，已经超出额度" : ""}</p>
              <p className="muted">{school.aggregate ? "这所学校只上报规模，增补额度不会展开学生。" : "明细学校也只在这里改额度。"}</p>
              <form action={adjustQuota} className="row">
                <input type="hidden" name="tenantId" value={school.id} />
                <input name="delta" type="number" placeholder="正数增补，负数调减" required />
                <button className="btn" type="submit">调整额度</button>
              </form>
            </section>
          );
        })}
      </div>
    </>
  );
}
