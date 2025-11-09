import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { UserRole } from "@/lib/types"

// This config is safe for Edge Runtime (middleware)
// Prisma is imported lazily in the authorize function
export const authOptions: NextAuthConfig = {
  // Trust host for Edge Runtime compatibility
  trustHost: true,
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Lazy import the authorize function to avoid Edge Runtime issues in middleware
        // Direct dynamic import - this only runs in Node.js runtime (API routes), not Edge
        // The authorize function is only called from API routes, never from middleware
        try {
          // Direct dynamic import with path alias - Next.js resolves this at runtime
          // This is safe because authorize() only executes in Node.js runtime, not Edge
          const libModule = await import('@/lib/auth-authorize')
          const { authorizeUser } = libModule

          const email = credentials.email as string
          const password = credentials.password as string

          return await authorizeUser(email, password)
        } catch (error) {
          console.error('Authorization error:', error)
          return null
        }
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

