import { NextResponse, type NextRequest } from "next/server"
import { SESSION_COOKIE, verifySession } from "@/lib/session"

/**
 * First line of defence only.
 *
 * Middleware runs on the Edge runtime, so it can verify the JWT with `jose`
 * but cannot touch Prisma or bcrypt. It exists to send signed-out visitors
 * to the login page — it is *not* where authorization happens. Ownership is
 * enforced per query in `lib/guard.ts`, because a route match is not a
 * permission: `/trips/<someone-elses-id>` matches this middleware perfectly.
 */

const PROTECTED = [
  "/dashboard",
  "/trips",
  "/inspiration",
  "/cities",
  "/activities",
  "/wishlist",
  "/profile",
  "/admin",
]
const AUTH_PAGES = ["/login", "/signup"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const token = request.cookies.get(SESSION_COOKIE)?.value
  const userId = token ? await verifySession(token) : null

  if (!userId && PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", pathname) // return here after signing in
    return NextResponse.redirect(login)
  }

  if (userId && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Everything except Next internals, the public share route, and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|t/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
