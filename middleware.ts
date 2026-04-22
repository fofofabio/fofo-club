import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/adminAuth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const nextPath = pathname.replace("/admin", "/workspace") || "/workspace";
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  if (pathname === "/workspace/login") {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;

  if (await isValidAdminSession(sessionToken)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/workspace/login", request.url));
}

export const config = {
  matcher: ["/workspace/:path*", "/admin/:path*"],
};
