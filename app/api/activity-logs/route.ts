import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/lib/prisma/enums"
import { hasPermission } from "@/lib/rbac"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get("userId")
    const entityType = searchParams.get("entityType")
    const entityId = searchParams.get("entityId")
    const action = searchParams.get("action")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const limit = parseInt(searchParams.get("limit") || "100")

    // Check permissions based on role
    if (session.user.role === UserRole.LECTURER) {
      // Lecturers can only view their own activity history
      if (!hasPermission(session.user.role, "VIEW_OWN_ACTIVITY_HISTORY")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === UserRole.DEPARTMENTAL_OFFICER) {
      if (!hasPermission(session.user.role, "VIEW_DEPARTMENTAL_LOGS")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === UserRole.FACULTY_ADMIN) {
      if (!hasPermission(session.user.role, "VIEW_ALL_SYSTEM_LOGS")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const where: {
      userId?: string
      entityType?: string
      entityId?: string
      action?: string
      createdAt?: {
        gte?: Date
        lte?: Date
      }
    } = {}

    // For lecturers, force filter to their own logs
    if (session.user.role === UserRole.LECTURER) {
      where.userId = session.user.id
    } else {
      if (userId) where.userId = userId
    }
    if (entityType) where.entityType = entityType
    if (entityId) where.entityId = entityId
    if (action) where.action = action
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const logs = await prisma.activityLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error("Error fetching activity logs:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

