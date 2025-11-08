import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { UserRole, AssetStatus, RequestStatus, TransferStatus } from "@/lib/prisma/enums"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check permissions - admins can generate global reports, officers can generate departmental reports
    if (session.user.role === UserRole.FACULTY_ADMIN) {
      if (!hasPermission(session.user.role, "GENERATE_GLOBAL_REPORTS")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === UserRole.DEPARTMENTAL_OFFICER) {
      if (!hasPermission(session.user.role, "GENERATE_DEPARTMENTAL_REPORTS")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else if (session.user.role === UserRole.LECTURER) {
      // Lecturers can only view their own request/usage history
      if (type !== "requests" && type !== "summary") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "summary"

    if (type === "summary") {
      const [
        totalAssets,
        availableAssets,
        allocatedAssets,
        totalRequests,
        pendingRequests,
        totalTransfers,
        pendingTransfers
      ] = await Promise.all([
        prisma.asset.count(),
        prisma.asset.count({ where: { status: AssetStatus.AVAILABLE } }),
        prisma.asset.count({ where: { status: AssetStatus.ALLOCATED } }),
        prisma.request.count(),
        prisma.request.count({ where: { status: RequestStatus.PENDING } }),
        prisma.transfer.count(),
        prisma.transfer.count({ where: { status: TransferStatus.PENDING } })
      ])

      return NextResponse.json({
        assets: {
          total: totalAssets,
          available: availableAssets,
          allocated: allocatedAssets
        },
        requests: {
          total: totalRequests,
          pending: pendingRequests
        },
        transfers: {
          total: totalTransfers,
          pending: pendingTransfers
        }
      })
    }

    if (type === "assets") {
      const assets = await prisma.asset.findMany({
        include: {
          registeredByUser: { select: { name: true } },
          allocatedToUser: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(assets)
    }

    if (type === "requests") {
      const requests = await prisma.request.findMany({
        include: {
          asset: true,
          requestedByUser: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(requests)
    }

    if (type === "transfers") {
      const transfers = await prisma.transfer.findMany({
        include: {
          asset: true,
          fromUser: { select: { name: true, email: true } },
          toUser: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: "desc" }
      })
      return NextResponse.json(transfers)
    }

    if (type === "maintenance") {
      const maintenance = await prisma.maintenance.findMany({
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
        orderBy: { scheduledDate: "desc" },
      })
      return NextResponse.json(maintenance)
    }

    if (type === "consumables") {
      const consumables = await prisma.asset.findMany({
        where: {
          type: "CONSUMABLE",
        },
        include: {
          registeredByUser: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      })
      return NextResponse.json(consumables)
    }

    if (type === "depreciation") {
      const assets = await prisma.asset.findMany({
        where: {
          purchaseDate: { not: null },
          purchasePrice: { not: null },
        },
        select: {
          id: true,
          name: true,
          assetCode: true,
          purchaseDate: true,
          purchasePrice: true,
          type: true,
          status: true,
        },
        orderBy: { purchaseDate: "asc" },
      })

      const now = new Date()
      const depreciationReport = assets.map((asset) => {
        if (!asset.purchaseDate || !asset.purchasePrice) return null
        const ageInYears = (now.getTime() - asset.purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
        // Simple straight-line depreciation over 5 years
        const depreciationRate = Math.min(ageInYears / 5, 1)
        const currentValue = asset.purchasePrice * (1 - depreciationRate)
        return {
          ...asset,
          ageInYears: Math.round(ageInYears * 10) / 10,
          originalValue: asset.purchasePrice,
          currentValue: Math.round(currentValue * 100) / 100,
          depreciationAmount: Math.round((asset.purchasePrice - currentValue) * 100) / 100,
          depreciationPercentage: Math.round(depreciationRate * 100),
        }
      }).filter(Boolean)

      return NextResponse.json(depreciationReport)
    }

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

