import { PageHead } from "@/components/bits";
import { badgesFor, classOfStudent, rankForClass } from "@/lib/logic";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";

export const metadata = { title: "班级排行" };

export default async function RankPage() {
  const user = await requireRole("student");
  const db = readDb();
  const room = classOfStudent(db, user.id);
  const rank = room ? rankForClass(db, room) : [];
  return (
    <>
      <PageHead kicker={room?.name} title="班级进度" lede="已验收的按教师打分计入，还没验收的只反映完成进度，避免和已经通过的人拉平。这不是就业排名。" />
      <table className="card">
        <thead><tr><th>名次</th><th>同学</th><th>综合</th><th>勋章</th></tr></thead>
        <tbody>
          {rank.map((item, index) => {
            const person = db.users.find((student) => student.id === item.studentId);
            const earned = badgesFor(db, item.studentId).filter((badge) => badge.earned);
            return (
              <tr key={item.studentId}>
                <td>{index + 1}</td>
                <td>{person?.name}{item.studentId === user.id ? "（我）" : ""}</td>
                <td>{item.score}</td>
                <td>{earned.map((badge) => badge.name).join("、") || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
