import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { UserRole } from "@/lib/types"

// Edge-safe auth config for middleware
// This config has a minimal provider without authorize to prevent Prisma from being bundled
// The authorize function is only used in the API route (Node.js runtime)
// Middleware only reads existing sessions, so authorize is never called
export const authOptionsEdge: NextAuthConfig = {
  // Trust host for Edge Runtime compatibility
  trustHost: true,
  providers: [
    // Minimal provider for Edge - authorize is never called in middleware
    // This is just to satisfy NextAuth's requirement for at least one provider
    CredentialsProvider({
      name: "Credentials",
      credentials: {},
      async authorize() {
        // This is never called in middleware - middleware only reads existing sessions
        // The actual authentication happens in the API route with the full config
        return null
      }
    })
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as UserRole
      }
      return session
    }
  },
  pages: {
    signIn: "/auth/signin",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET || (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET environment variable is required in production")
    }
    return "development-secret-change-in-production"
  })(),
}

