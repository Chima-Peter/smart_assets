import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { AssetStatus } from "@/lib/prisma/enums"
import { z } from "zod"
import { logActivity } from "@/lib/activity-log"

const maintenanceSchema = z.object({
  assetId: z.string(),
  type: z.enum(["PREVENTIVE", "REPAIR", "CALIBRATION", "INSPECTION"]),
  scheduledDate: z.string().optional(),
  serviceType: z.string().optional(),
  cost: z.number().optional(),
  vendor: z.string().optional(),
  technician: z.string().optional(),
  notes: z.string().optional(),
  nextMaintenanceDate: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const assetId = searchParams.get("assetId")
    const status = searchParams.get("status")
    const upcoming = searchParams.get("upcoming") === "true"

    const where: {
      assetId?: string
      status?: string
      scheduledDate?: { gte: Date }
    } = {}

    if (assetId) where.assetId = assetId
    if (status) where.status = status
    if (upcoming) {
      where.scheduledDate = { gte: new Date() }
    }

    const maintenance = await prisma.maintenance.findMany({
      where,
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetCode: true,
            type: true,
          },
        },
        performedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    })

    return NextResponse.json(maintenance)
  } catch (error) {
    console.error("Error fetching maintenance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "RECORD_MAINTENANCE") && !hasPermission(session.user.role, "SCHEDULE_MAINTENANCE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = maintenanceSchema.parse(body)

    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const maintenance = await prisma.maintenance.create({
      data: {
        ...data,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : null,
        nextMaintenanceDate: data.nextMaintenanceDate ? new Date(data.nextMaintenanceDate) : null,
        status: "SCHEDULED",
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetCode: true,
          },
        },
      },
    })

    // Update asset status to MAINTENANCE if scheduled
    if (data.type === "REPAIR" && data.scheduledDate) {
      await prisma.asset.update({
        where: { id: data.assetId },
        data: { status: AssetStatus.MAINTENANCE },
      })
    }

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "CREATE",
      entityType: "MAINTENANCE",
      entityId: maintenance.id,
      description: `Scheduled ${data.type.toLowerCase()} maintenance for ${asset.name}`,
    })

    return NextResponse.json(maintenance, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating maintenance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

