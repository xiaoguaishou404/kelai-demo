import { Shell } from "@/components/shell";
import { requireRole } from "@/lib/session";

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("ops");
  return (
    <Shell
      name={user.name}
      role={user.role}
      tenantLabel="科来 · 内容与租户"
      items={[
        { href: "/ops", label: "使用热度" },
        { href: "/ops/content", label: "风向与内容" },
        { href: "/ops/tenants", label: "租户额度" },
      ]}
    >
      {children}
    </Shell>
  );
}
