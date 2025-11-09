import 'server-only'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

// This file is only imported at runtime in the authorize function
// It's separated to prevent middleware from analyzing Prisma imports
export async function authorizeUser(email: string, password: string) {
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

