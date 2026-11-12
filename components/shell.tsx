"use client";

import { logout } from "@/lib/actions";
import { ROLE_LABEL } from "@/lib/labels";
import type { Role } from "@/lib/types";
import { usePathname } from "next/navigation";

export function Shell({
  name,
  role,
  tenantLabel,
  items,
  children,
}: {
  name: string;
  role: Role;
  tenantLabel: string;
  items: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const matches = items.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const current = matches.sort((a, b) => b.href.length - a.href.length)[0]?.href;
  return (
    <div className="shell">
      <aside className="nav">
        <div className="brand">
          <span className="brand-mark">科</span>
          <div>
            <strong>教学平台</strong>
            <small>岗位实训 · 成果验收</small>
          </div>
        </div>
        <p className="tenant">{tenantLabel}</p>
        <nav>
          {items.map((item) => (
            <a key={item.href} href={item.href} className={item.href === current ? "active" : undefined}>
              {item.label}
            </a>
          ))}
        </nav>
        <div className="nav-user">
          <b>{name}</b>
          <span>{ROLE_LABEL[role]}</span>
          <form action={logout}>
            <button className="text-btn" type="submit">退出租户</button>
          </form>
        </div>
      </aside>
      <main className="main">{children}</main>
    </div>
  );
}
