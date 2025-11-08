import { UserRole } from "@/lib/prisma/enums"

export const ROLES = {
  FACULTY_ADMIN: "FACULTY_ADMIN",
  DEPARTMENTAL_OFFICER: "DEPARTMENTAL_OFFICER",
  LECTURER: "LECTURER",
  COURSE_REP: "COURSE_REP",
} as const

export type Role = UserRole

// Permission definitions
export const PERMISSIONS = {
  // Asset Management
  REGISTER_ASSETS: [ROLES.DEPARTMENTAL_OFFICER],
  VIEW_ALL_ASSETS: [ROLES.FACULTY_ADMIN, ROLES.DEPARTMENTAL_OFFICER],
  VIEW_AVAILABLE_CONSUMABLES: [ROLES.COURSE_REP, ROLES.LECTURER, ROLES.DEPARTMENTAL_OFFICER, ROLES.FACULTY_ADMIN],
  VIEW_AVAILABLE_TEACHING_AIDS: [ROLES.COURSE_REP, ROLES.LECTURER, ROLES.DEPARTMENTAL_OFFICER, ROLES.FACULTY_ADMIN],
  
  // Request Management
  CREATE_REQUEST: [ROLES.LECTURER],
  VIEW_PERSONAL_REQUESTS: [ROLES.LECTURER],
  VIEW_PERSONAL_ALLOCATIONS: [ROLES.LECTURER],
  APPROVE_REQUESTS: [ROLES.DEPARTMENTAL_OFFICER, ROLES.FACULTY_ADMIN],
  
  // Transfer Management
  CREATE_TRANSFER: [ROLES.DEPARTMENTAL_OFFICER, ROLES.LECTURER],
  APPROVE_IN_DEPARTMENT_TRANSFERS: [ROLES.FACULTY_ADMIN],
  APPROVE_TRANSFERS: [ROLES.DEPARTMENTAL_OFFICER, ROLES.FACULTY_ADMIN],
  MANAGE_INTERNAL_TRANSFERS: [ROLES.DEPARTMENTAL_OFFICER],
  
  // Reports
  GENERATE_REPORTS: [ROLES.FACULTY_ADMIN],
  
  // View Only
  VIEW_REPORTS: [ROLES.FACULTY_ADMIN, ROLES.DEPARTMENTAL_OFFICER],
} as const

export function hasPermission(role: Role, permission: keyof typeof PERMISSIONS): boolean {
  const allowedRoles = PERMISSIONS[permission]
  return (allowedRoles as readonly string[]).includes(role)
}

export function hasAnyPermission(role: Role, permissions: Array<keyof typeof PERMISSIONS>): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

export function hasAllPermissions(role: Role, permissions: Array<keyof typeof PERMISSIONS>): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}

