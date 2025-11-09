import { handlers } from "@/lib/auth"

// Force Node.js runtime to prevent Edge Runtime from analyzing Prisma imports
export const runtime = 'nodejs'

export const { GET, POST } = handlers

