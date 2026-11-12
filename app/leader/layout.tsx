import { Shell } from "@/components/shell";
import { requireRole } from "@/lib/session";
import { readDb } from "@/lib/store";

export default async function LeaderLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("leader");
  const tenant = readDb().tenants.find((item) => item.id === user.tenantId);
  return (
    <Shell
      name={user.name}
      role={user.role}
      tenantLabel={tenant ? `${tenant.name} · ${tenant.college}` : "合作院校"}
      items={[{ href: "/leader", label: "学情看板" }]}
    >
      {children}
    </Shell>
  );
}
