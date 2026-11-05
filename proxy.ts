import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic check: only looks for the session cookie. API routes still
// validate the session itself (see lib/auth-server.ts).
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // The studio API serves guests who bring their own keys, so these routes
  // decide access themselves instead of requiring a session cookie.
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/api/auth/") ||
    pathname === "/api/health" ||
    pathname === "/api/providers" ||
    pathname === "/api/generate-video";
  if (isPublic) {
    return NextResponse.next();
  }

  if (!getSessionCookie(req)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/signin", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.png).*)',
  ],
}
