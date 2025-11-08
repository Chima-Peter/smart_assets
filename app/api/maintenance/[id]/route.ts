import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { AssetStatus } from "@/lib/prisma/enums"
import { z } from "zod"
import { logActivity } from "@/lib/activity-log"

const updateMaintenanceSchema = z.object({
  type: z.enum(["PREVENTIVE", "REPAIR", "CALIBRATION", "INSPECTION"]).optional(),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  serviceType: z.string().optional(),
  cost: z.number().optional(),
  vendor: z.string().optional(),
  technician: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  nextMaintenanceDate: z.string().optional(),
  performedBy: z.string().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetCode: true,
            type: true,
            status: true,
          },
        },
        performedByUser: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    })

    if (!maintenance) {
      return NextResponse.json({ error: "Maintenance record not found" }, { status: 404 })
    }

    return NextResponse.json(maintenance)
  } catch (error) {
    console.error("Error fetching maintenance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "RECORD_MAINTENANCE") && !hasPermission(session.user.role, "SCHEDULE_MAINTENANCE")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const data = updateMaintenanceSchema.parse(body)

    const existing = await prisma.maintenance.findUnique({
      where: { id },
      include: { asset: true },
    })

    if (!existing) {
      return NextResponse.json({ error: "Maintenance record not found" }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (data.type) updateData.type = data.type
    if (data.scheduledDate) updateData.scheduledDate = new Date(data.scheduledDate)
    if (data.completedDate) updateData.completedDate = new Date(data.completedDate)
    if (data.serviceType !== undefined) updateData.serviceType = data.serviceType
    if (data.cost !== undefined) updateData.cost = data.cost
    if (data.vendor !== undefined) updateData.vendor = data.vendor
    if (data.technician !== undefined) updateData.technician = data.technician
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.status) updateData.status = data.status
    if (data.nextMaintenanceDate) updateData.nextMaintenanceDate = new Date(data.nextMaintenanceDate)
    if (data.performedBy) updateData.performedBy = data.performedBy

    const maintenance = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenance.update({
        where: { id },
        data: updateData,
        include: {
          asset: true,
          performedByUser: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      })

      // Update asset status based on maintenance status
      if (data.status === "COMPLETED") {
        // If maintenance is completed, check if asset should be available
        const hasOtherMaintenance = await tx.maintenance.count({
          where: {
            assetId: existing.assetId,
            status: { in: ["SCHEDULED", "IN_PROGRESS"] },
            id: { not: id },
          },
        })

        if (hasOtherMaintenance === 0 && existing.asset.status === AssetStatus.MAINTENANCE) {
          await tx.asset.update({
            where: { id: existing.assetId },
            data: { status: AssetStatus.AVAILABLE },
          })
        }
      } else if (data.status === "IN_PROGRESS" || data.status === "SCHEDULED") {
        // Set asset to maintenance if not already
        if (existing.asset.status !== AssetStatus.MAINTENANCE) {
          await tx.asset.update({
            where: { id: existing.assetId },
            data: { status: AssetStatus.MAINTENANCE },
          })
        }
      }

      return updated
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "MAINTENANCE",
      entityId: id,
      description: `Updated maintenance record for ${maintenance.asset.name}`,
    })

    return NextResponse.json(maintenance)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating maintenance:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

