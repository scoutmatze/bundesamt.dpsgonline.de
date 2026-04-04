import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("dpsg-session");
  const { pathname } = request.nextUrl;

  // Public routes
  if (["/", "/login", "/impressum", "/datenschutz", "/api/auth/login", "/api/signature", "/api/sync"].some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Protected routes: redirect to login if no session
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
