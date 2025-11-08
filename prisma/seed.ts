import { PrismaClient } from '../lib/prisma/client'
import bcrypt from 'bcryptjs'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  // Create Faculty Admin
  const adminPassword = await bcrypt.hash('admin123', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@university.edu' },
    update: {},
    create: {
      email: 'admin@university.edu',
      password: adminPassword,
      name: 'Faculty Admin',
      role: 'FACULTY_ADMIN',
      department: 'Administration',
      employeeId: 'ADM001',
    },
  })

  // Create Departmental Officer
  const officerPassword = await bcrypt.hash('officer123', 10)
  const officer = await prisma.user.upsert({
    where: { email: 'officer@university.edu' },
    update: {},
    create: {
      email: 'officer@university.edu',
      password: officerPassword,
      name: 'Departmental Officer',
      role: 'DEPARTMENTAL_OFFICER',
      department: 'Computer Science',
      employeeId: 'OFF001',
    },
  })

  // Create Lecturer
  const lecturerPassword = await bcrypt.hash('lecturer123', 10)
  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer@university.edu' },
    update: {},
    create: {
      email: 'lecturer@university.edu',
      password: lecturerPassword,
      name: 'Dr. John Lecturer',
      role: 'LECTURER',
      department: 'Computer Science',
      employeeId: 'LEC001',
    },
  })

  // Create Course Rep
  const repPassword = await bcrypt.hash('rep123', 10)
  const rep = await prisma.user.upsert({
    where: { email: 'rep@university.edu' },
    update: {},
    create: {
      email: 'rep@university.edu',
      password: repPassword,
      name: 'Course Representative',
      role: 'COURSE_REP',
      department: 'Computer Science',
      employeeId: 'REP001',
    },
  })

  console.log('Seed data created:', { admin, officer, lecturer, rep })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

