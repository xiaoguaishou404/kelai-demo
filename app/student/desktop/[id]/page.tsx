import { DesktopConsole } from "@/components/desktop-console";
import { PageHead } from "@/components/bits";
import { findSubmission, remainingMinutes, toStudentView } from "@/lib/logic";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { emptyWork } from "@/lib/types";
import { studentHome } from "@/lib/view";

export const metadata = { title: "云桌面" };

export default async function DesktopPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("student");
  const { id } = await params;
  const db = readDb();
  const row = studentHome(db, user.id).rows.find((item) => item.challenge.id === id);
  if (!row) return <PageHead title="这门挑战没有云桌面" />;
  const submission = findSubmission(db, user.id, id);
  const tenant = db.tenants.find((item) => item.id === user.tenantId);
  const active = db.sessions.find((session) => session.studentId === user.id && session.challengeId === id && session.status === "active");
  const past = db.sessions.filter((session) => session.studentId === user.id && session.challengeId === id && session.status === "closed");
  return (
    <>
      <PageHead
        kicker="云虚拟桌面"
        title={row.challenge.title}
        lede="桌面在平台云端打开。软件和脱敏样本不能下载，也不能拷成镜像带走。"
      />
      <DesktopConsole
        view={toStudentView(row.challenge, false)}
        initialWork={submission?.work ?? emptyWork()}
        status={submission?.status ?? "none"}
        updatedAt={submission?.updatedAt ?? ""}
        product={db.desktop.product}
        version={db.desktop.version}
        policy={db.desktop.policy}
        remaining={tenant ? remainingMinutes(tenant) : 0}
        active={active ? {
          startedAt: active.startedAt,
          reservedMinutes: active.reservedMinutes,
          extensions: active.extensions,
          resetCount: active.resetCount,
        } : null}
      />
      <section className="card" style={{ marginTop: 14 }}>
        <h2>这门案卷的机时</h2>
        {past.length === 0 ? <p className="muted">还没有结算过。</p> : null}
        <ul>
          {past.map((session) => (
            <li key={session.id}>结算 {session.chargedMinutes} 分钟 · 重置 {session.resetCount} 次</li>
          ))}
        </ul>
        <p><a href={`/student/challenges/${id}`}>回到案卷</a></p>
      </section>
    </>
  );
}
