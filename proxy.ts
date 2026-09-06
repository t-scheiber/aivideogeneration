import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getCookieCache } from "better-auth/cookies";

export default async function proxy(req: NextRequest) {
  const session = await getCookieCache(req);
  const isLoggedIn = !!session?.user;
  const { nextUrl } = req;

  // Allow access to public pages
  if (nextUrl.pathname.startsWith('/auth/') || 
      nextUrl.pathname === '/' ||
      nextUrl.pathname === '/api/health' ||
      nextUrl.pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }
  
  // Require authentication for video generation
  if (nextUrl.pathname.startsWith('/api/generate-video')) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
  }
  
  // Require authentication for other protected routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/auth/signin', nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

