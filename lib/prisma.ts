import 'server-only'
import { PrismaClient } from './prisma/client'

// This file should only be imported in server-side code (API routes, server components)
// Do not import in middleware or Edge Runtime code

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

