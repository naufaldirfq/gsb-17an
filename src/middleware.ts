import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_AUTH_COOKIE } from "@/lib/constants";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get(ADMIN_AUTH_COOKIE);
  const expectedPassword = process.env.ADMIN_PASSWORD || "admin123";
  const isAuthenticated = authCookie?.value === expectedPassword;

  // If going to an admin route (not login) and not authenticated
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // If going to admin login and already authenticated
  if (pathname.startsWith("/admin/login")) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
