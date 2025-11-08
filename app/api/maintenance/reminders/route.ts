import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole } from "@/lib/prisma/enums"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Only admins and officers can check reminders
    if (session.user.role !== UserRole.FACULTY_ADMIN && session.user.role !== UserRole.DEPARTMENTAL_OFFICER) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const daysAhead = parseInt(searchParams.get("daysAhead") || "7")

    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + daysAhead)

    // Find maintenance scheduled within the next N days that haven't had reminders sent
    const upcomingMaintenance = await prisma.maintenance.findMany({
      where: {
        status: { in: ["SCHEDULED", "IN_PROGRESS"] },
        scheduledDate: {
          lte: targetDate,
          gte: new Date(),
        },
        reminderSent: false,
      },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetCode: true,
            type: true,
          },
        },
      },
      orderBy: { scheduledDate: "asc" },
    })

    // Also check for expired consumables
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expiryDate = new Date(today)
    expiryDate.setDate(expiryDate.getDate() + daysAhead)

    const expiringAssets = await prisma.asset.findMany({
      where: {
        expiryDate: {
          gte: today,
          lte: expiryDate,
        },
        assetCategory: "EXPIRABLE",
      },
      include: {
        registeredByUser: {
          select: { name: true, email: true },
        },
      },
    })

    // Create notifications for upcoming maintenance
    const officers = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.DEPARTMENTAL_OFFICER, UserRole.FACULTY_ADMIN] },
      },
    })

    for (const maintenance of upcomingMaintenance) {
      // Create notifications
      await Promise.all(
        officers.map((officer) =>
          prisma.notification.create({
            data: {
              userId: officer.id,
              type: "MAINTENANCE_DUE",
              title: "Upcoming Maintenance",
              message: `${maintenance.asset.name} has scheduled ${maintenance.type.toLowerCase()} maintenance on ${new Date(maintenance.scheduledDate!).toLocaleDateString()}`,
              relatedAssetId: maintenance.assetId,
              relatedMaintenanceId: maintenance.id,
            },
          })
        )
      )

      // Mark reminder as sent
      await prisma.maintenance.update({
        where: { id: maintenance.id },
        data: { reminderSent: true },
      })
    }

    // Create notifications for expiring assets
    for (const asset of expiringAssets) {
      await Promise.all(
        officers.map((officer) =>
          prisma.notification.create({
            data: {
              userId: officer.id,
              type: "EXPIRY_ALERT",
              title: "Asset Expiring Soon",
              message: `${asset.name} expires on ${new Date(asset.expiryDate!).toLocaleDateString()}`,
              relatedAssetId: asset.id,
            },
          })
        )
      )
    }

    return NextResponse.json({
      upcomingMaintenance: upcomingMaintenance.length,
      expiringAssets: expiringAssets.length,
      reminders: {
        maintenance: upcomingMaintenance.map((m) => ({
          id: m.id,
          asset: m.asset.name,
          type: m.type,
          scheduledDate: m.scheduledDate,
        })),
        expiring: expiringAssets.map((a) => ({
          id: a.id,
          name: a.name,
          expiryDate: a.expiryDate,
        })),
      },
    })
  } catch (error) {
    console.error("Error checking maintenance reminders:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

