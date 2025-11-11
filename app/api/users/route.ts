import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/lib/prisma/enums"
import { hasPermission } from "@/lib/rbac"
import bcrypt from "bcryptjs"
import { z } from "zod"

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  role: z.nativeEnum(UserRole),
  department: z.string().min(1, "Department is required"),
  employeeId: z.string().optional(),
}).refine((data) => {
  // Employee ID is required for all roles except COURSE_REP
  if (data.role !== UserRole.COURSE_REP && !data.employeeId) {
    return false
  }
  return true
}, {
  message: "Employee ID is required for this role",
  path: ["employeeId"]
})

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permissions - admins can view all users, officers can view departmental staff, lecturers can view users for transfers
    if (session.user.role === UserRole.FACULTY_ADMIN) {
      if (!hasPermission(session.user.role, "MANAGE_ALL_USERS")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      // Admins can see all users
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          employeeId: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(users)
    } else if (session.user.role === UserRole.DEPARTMENTAL_OFFICER) {
      if (!hasPermission(session.user.role, "MANAGE_DEPARTMENTAL_STAFF")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      // Officers can only see users in their department
      // Fetch the user to get their department
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { department: true }
      })
      const where = currentUser?.department ? { department: currentUser.department } : {}
      // Exclude course reps from transfer recipient lists
      const users = await prisma.user.findMany({
        where: {
          ...where,
          role: {
            not: UserRole.COURSE_REP
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          employeeId: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(users)
    } else if (session.user.role === UserRole.LECTURER) {
      // Lecturers can see users for transfer purposes (lecturers, officers, admins)
      const users = await prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.LECTURER, UserRole.DEPARTMENTAL_OFFICER, UserRole.FACULTY_ADMIN]
          }
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          department: true,
          employeeId: true,
          createdAt: true
        },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(users)
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const data = userSchema.parse(body)

    // Check permissions - admins can create all users, officers can create departmental staff
    if (session.user.role === UserRole.FACULTY_ADMIN) {
      if (!hasPermission(session.user.role, "MANAGE_ALL_USERS")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === UserRole.DEPARTMENTAL_OFFICER) {
      if (!hasPermission(session.user.role, "MANAGE_DEPARTMENTAL_STAFF")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      // Officers can only create users in their department and cannot assign admin roles
      if (data.role === UserRole.FACULTY_ADMIN) {
        return NextResponse.json({ error: "Cannot assign Faculty Admin role" }, { status: 403 })
      }
      // Fetch the user to get their department
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { department: true }
      })
      if (data.department && data.department !== currentUser?.department) {
        return NextResponse.json({ error: "Cannot create users outside your department" }, { status: 403 })
      }
      // Force department to match officer's department
      data.department = currentUser?.department || data.department
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existing) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // For COURSE_REP, employeeId should be null/undefined
    const userData: {
      email: string
      password: string
      name: string
      role: UserRole
      department: string
      employeeId?: string | null
    } = {
      ...data,
      password: hashedPassword
    }

    // Set employeeId to null for course reps
    if (data.role === UserRole.COURSE_REP) {
      userData.employeeId = null
    }

    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        department: true,
        employeeId: true,
        createdAt: true
      }
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

