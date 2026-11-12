import { Shell } from "@/components/shell";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";

export default async function TeacherLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("teacher");
  const tenant = readDb().tenants.find((item) => item.id === user.tenantId);
  const room = readDb().classes.find((item) => item.teacherId === user.id);
  return (
    <Shell
      name={user.name}
      role={user.role}
      tenantLabel={tenant ? `${tenant.name} · ${tenant.college}` : "合作院校"}
      items={[
        { href: "/teacher", label: "验收队列" },
        { href: room ? `/teacher/class/${room.id}` : "/teacher", label: "班级" },
        { href: "/teacher/guide", label: "开课导引" },
      ]}
    >
      {children}
    </Shell>
  );
}
