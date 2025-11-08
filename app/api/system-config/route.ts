import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/lib/prisma/enums"
import { hasPermission } from "@/lib/rbac"
import { z } from "zod"
import { logActivity } from "@/lib/activity-log"

const configSchema = z.object({
  key: z.string(),
  value: z.string(),
  description: z.string().optional(),
  category: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const category = searchParams.get("category")
    const key = searchParams.get("key")

    // Check permissions - admins can configure global parameters, officers can configure departmental data
    if (session.user.role === UserRole.FACULTY_ADMIN) {
      if (!hasPermission(session.user.role, "CONFIGURE_GLOBAL_PARAMETERS")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === UserRole.DEPARTMENTAL_OFFICER) {
      if (!hasPermission(session.user.role, "CONFIGURE_DEPARTMENTAL_DATA")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      // Officers can only view/update departmental configs
      if (category && category !== "DEPARTMENTAL") {
        return NextResponse.json({ error: "Can only access departmental configurations" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const where: {
      category?: string
      key?: string
    } = {}

    if (category) where.category = category
    if (key) where.key = key

    const configs = await prisma.systemConfig.findMany({
      where,
      include: {
        updatedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { category: "asc" },
    })

    return NextResponse.json(configs)
  } catch (error) {
    console.error("Error fetching system config:", error)
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
    const data = configSchema.parse(body)

    // Check permissions - admins can configure global parameters, officers can configure departmental data
    if (session.user.role === UserRole.FACULTY_ADMIN) {
      if (!hasPermission(session.user.role, "CONFIGURE_GLOBAL_PARAMETERS")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === UserRole.DEPARTMENTAL_OFFICER) {
      if (!hasPermission(session.user.role, "CONFIGURE_DEPARTMENTAL_DATA")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      // Officers can only update departmental configs
      if (data.category && data.category !== "DEPARTMENTAL") {
        return NextResponse.json({ error: "Can only update departmental configurations" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const config = await prisma.systemConfig.upsert({
      where: { key: data.key },
      update: {
        value: data.value,
        description: data.description,
        category: data.category,
        updatedBy: session.user.id,
      },
      create: {
        ...data,
        updatedBy: session.user.id,
      },
      include: {
        updatedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "SYSTEM_CONFIG",
      entityId: config.id,
      description: `Updated system configuration: ${data.key} = ${data.value}`,
    })

    return NextResponse.json(config, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating system config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

