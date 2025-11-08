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

        // Lazy import Prisma to avoid Edge Runtime issues in middleware
        // Using Function constructor with relative path to prevent static analysis
        // This prevents the bundler from analyzing the import chain
        const prismaImport = new Function('p', 'return import(p)')
        const prismaModule = await prismaImport('./prisma')
        const { prisma } = prismaModule
        const bcrypt = await import("bcryptjs")

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email }
        })

        if (!user) {
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          password,
          user.password
        )

        if (!isPasswordValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
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

