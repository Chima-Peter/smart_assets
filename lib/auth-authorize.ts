import 'server-only'
import bcrypt from 'bcryptjs'

// This file is only imported at runtime in the authorize function
// It's separated to prevent middleware from analyzing Prisma imports
// Prisma is imported dynamically to prevent static analysis
export async function authorizeUser(email: string, password: string) {
  // Direct dynamic import of Prisma - this only runs in Node.js runtime (not Edge)
  // This is safe because this function is only called from API routes (Node.js runtime)
  // The dynamic import prevents the middleware bundler from analyzing Prisma
  const prismaModule = await import('@/lib/prisma')
  const { prisma } = prismaModule

  const user = await prisma.user.findUnique({
    where: { email }
  })

  if (!user) {
    return null
  }

  const isPasswordValid = await bcrypt.compare(password, user.password)

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

