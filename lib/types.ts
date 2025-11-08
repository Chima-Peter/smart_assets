// Edge Runtime safe types - can be imported in middleware
// This file is separate from Prisma to avoid Edge Runtime issues

export const UserRole = {
  FACULTY_ADMIN: 'FACULTY_ADMIN',
  DEPARTMENTAL_OFFICER: 'DEPARTMENTAL_OFFICER',
  LECTURER: 'LECTURER',
  COURSE_REP: 'COURSE_REP'
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

