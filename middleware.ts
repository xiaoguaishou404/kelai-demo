import { NextResponse, type NextRequest } from "next/server";

const homes: Record<string, string> = {
  student: "/student",
  teacher: "/teacher",
  leader: "/leader",
  ops: "/ops",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/") return NextResponse.next();
  const role = request.cookies.get("kelai_role")?.value ?? "";
  const uid = request.cookies.get("kelai_uid")?.value;
  if (!uid || !homes[role]) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  const allowed = pathname === homes[role] || pathname.startsWith(`${homes[role]}/`);
  if (!allowed) {
    const url = request.nextUrl.clone();
    url.pathname = homes[role];
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
