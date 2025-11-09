import NextAuth from "next-auth"
import { authOptionsEdge } from "./auth-config-edge"

// Edge-safe auth export for middleware
// This does NOT include the authorize function, so Prisma won't be bundled
export const { auth } = NextAuth(authOptionsEdge)

