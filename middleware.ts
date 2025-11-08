import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import { UserRole } from "@/lib/types"

export default auth((req) => {
  const session = req.auth
  const path = req.nextUrl.pathname

  // Allow NextAuth API routes to pass through
  if (path.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  if (!session?.user) {
    return NextResponse.redirect(new URL("/auth/signin", req.url))
  }

  const role = (session.user as { role?: UserRole }).role as UserRole

  // Role-based route protection
  if (path.startsWith("/admin") && role !== UserRole.FACULTY_ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (path.startsWith("/officer") && role !== UserRole.DEPARTMENTAL_OFFICER && role !== UserRole.FACULTY_ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (path.startsWith("/lecturer") && role !== UserRole.LECTURER && role !== UserRole.FACULTY_ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (path.startsWith("/course-rep") && role !== UserRole.COURSE_REP && role !== UserRole.FACULTY_ADMIN) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/officer/:path*",
    "/lecturer/:path*",
    "/course-rep/:path*",
    "/api/:path*",
  ],
}

