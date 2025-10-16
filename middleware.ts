import { auth } from "@/lib/auth"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth

  // Allow access to public pages
  if (nextUrl.pathname.startsWith('/auth/') || 
      nextUrl.pathname === '/' ||
      nextUrl.pathname.startsWith('/api/auth/')) {
    return
  }
  
  // Require authentication for video generation
  if (nextUrl.pathname.startsWith('/api/generate-video')) {
    if (!isLoggedIn) {
      return Response.redirect(new URL('/auth/signin', nextUrl))
    }
  }
  
  // Require authentication for other protected routes
  if (!isLoggedIn) {
    return Response.redirect(new URL('/auth/signin', nextUrl))
  }
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
