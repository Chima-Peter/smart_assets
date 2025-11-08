import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { AssetStatus, RequestStatus, TransferStatus } from "@/lib/prisma/enums"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "GENERATE_REPORTS")) {
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

    return NextResponse.json({ error: "Invalid report type" }, { status: 400 })
  } catch (error) {
    console.error("Error generating report:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

