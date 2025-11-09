import 'server-only'
import bcrypt from 'bcryptjs'

// This file is only imported at runtime in the authorize function
// It's separated to prevent middleware from analyzing Prisma imports
// Prisma is imported dynamically to prevent static analysis
export async function authorizeUser(email: string, password: string) {
  // Dynamic import of Prisma to prevent middleware bundler from analyzing it
  const prismaModule = await import('./prisma')
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

