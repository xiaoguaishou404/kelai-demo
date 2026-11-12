import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { homeFor } from "./labels";
import { readDb } from "./store";
import type { Role, User } from "./types";

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const id = jar.get("kelai_uid")?.value;
  if (!id) return null;
  return readDb().users.find((user) => user.id === id) ?? null;
}

export async function requireRole(role: Role): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.role !== role) redirect(homeFor(user.role));
  return user;
}
