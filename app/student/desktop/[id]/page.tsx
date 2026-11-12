import { DesktopHandoff } from "@/components/desktop-handoff";
import { PageHead } from "@/components/bits";
import { remainingMinutes } from "@/lib/logic";
import { formatWhen } from "@/lib/labels";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";
import { studentHome } from "@/lib/view";

export const metadata = { title: "云桌面机时" };

export default async function DesktopPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("student");
  const { id } = await params;
  const db = readDb();
  const row = studentHome(db, user.id).rows.find((item) => item.challenge.id === id);
  if (!row) return <PageHead title="这门挑战不在你的课表里" />;
  const tenant = db.tenants.find((item) => item.id === user.tenantId);
  const active = db.sessions.find((session) => session.studentId === user.id && session.challengeId === id && session.status === "active");
  const past = db.sessions.filter((session) => session.studentId === user.id && session.challengeId === id && session.status === "closed");
  return (
    <>
      <PageHead
        kicker="机时预约"
        title={row.challenge.title}
        lede="在线虚拟机不在这里运行，后面会接到第三方桌面。现在只能按案卷锁定学校机时，写结论仍回到案卷页。"
      />
      <DesktopHandoff
        challengeId={id}
        provider={db.desktop.provider}
        product={db.desktop.product}
        version={db.desktop.version}
        policy={db.desktop.policy}
        remaining={tenant ? remainingMinutes(tenant) : 0}
        active={active ? { reservedMinutes: active.reservedMinutes, extensions: active.extensions } : null}
      />
      <section className="card" style={{ marginTop: 14 }}>
        <h2>这门案卷已结算的机时</h2>
        {past.length === 0 ? <p className="muted">还没有结算记录。</p> : null}
        <ul>
          {past.map((session) => (
            <li key={session.id}>{formatWhen(session.startedAt)} · 结算 {session.chargedMinutes} 分钟</li>
          ))}
        </ul>
        <p><a href={`/student/challenges/${id}`}>回到案卷继续写</a></p>
      </section>
    </>
  );
}
