import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { UserRole, TransferStatus, AssetStatus } from "@/lib/prisma/enums"
import { z } from "zod"

const transferSchema = z.object({
  assetId: z.string(),
  toUserId: z.string(),
  reason: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")

    const where: {
      status?: TransferStatus
      OR?: Array<{ fromUserId: string } | { toUserId: string }>
    } = {}
    if (status) where.status = status as TransferStatus

    // Users can see transfers they're involved in
    if (session.user.role === UserRole.LECTURER) {
      where.OR = [
        { fromUserId: session.user.id },
        { toUserId: session.user.id }
      ] as Array<{ fromUserId: string } | { toUserId: string }>
    }

    const transfers = await prisma.transfer.findMany({
      where,
      include: {
        asset: true,
        fromUser: {
          select: { name: true, email: true }
        },
        toUser: {
          select: { name: true, email: true }
        },
        approvals: {
          include: {
            approvedByUser: {
              select: { name: true, email: true }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(transfers)
  } catch (error) {
    console.error("Error fetching transfers:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "CREATE_TRANSFER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = transferSchema.parse(body)

    // Check if asset exists and is allocated
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId }
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (asset.status !== AssetStatus.ALLOCATED) {
      return NextResponse.json({ error: "Asset is not allocated" }, { status: 400 })
    }

    // Check if user owns the asset or is an officer
    if (session.user.role !== UserRole.DEPARTMENTAL_OFFICER && 
        session.user.role !== UserRole.FACULTY_ADMIN &&
        asset.allocatedTo !== session.user.id) {
      return NextResponse.json({ error: "You don't own this asset" }, { status: 403 })
    }

    const transfer = await prisma.transfer.create({
      data: {
        ...data,
        fromUserId: asset.allocatedTo || session.user.id,
        status: TransferStatus.PENDING
      },
      include: {
        asset: true,
        fromUser: {
          select: { name: true, email: true }
        },
        toUser: {
          select: { name: true, email: true }
        }
      }
    })

    // Update asset status
    await prisma.asset.update({
      where: { id: data.assetId },
      data: { status: AssetStatus.TRANSFER_PENDING }
    })

    return NextResponse.json(transfer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating transfer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

