import { Shell } from "@/components/shell";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("student");
  const tenant = readDb().tenants.find((item) => item.id === user.tenantId);
  return (
    <Shell
      name={user.name}
      role={user.role}
      tenantLabel={tenant ? `${tenant.name} · ${tenant.college}` : "合作院校"}
      items={[
        { href: "/student", label: "学习台" },
        { href: "/student/jobs", label: "岗位地图" },
        { href: "/student/challenges", label: "目标挑战" },
        { href: "/student/portrait", label: "能力画像" },
        { href: "/student/rank", label: "班级排行" },
      ]}
    >
      {children}
    </Shell>
  );
}
