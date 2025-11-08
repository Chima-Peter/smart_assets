import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, TransferStatus } from "@/lib/prisma/enums"
import { z } from "zod"

const updateTransferSchema = z.object({
  reason: z.string().optional(),
  notes: z.string().optional(),
}).strict()

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
    const transfer = await prisma.transfer.findUnique({
      where: { id },
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
      }
    })

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    // Lecturers can only see transfers they're involved in
    if (session.user.role === UserRole.LECTURER) {
      if (transfer.fromUserId !== session.user.id && transfer.toUserId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    return NextResponse.json(transfer)
  } catch (error) {
    console.error("Error fetching transfer:", error)
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

    const { id } = await params
    const body = await req.json()
    const data = updateTransferSchema.parse(body)

    const transfer = await prisma.transfer.findUnique({
      where: { id }
    })

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    // Only pending transfers can be updated
    if (transfer.status !== TransferStatus.PENDING) {
      return NextResponse.json({ error: "Can only update pending transfers" }, { status: 400 })
    }

    // Lecturers can only update transfers they initiated
    if (session.user.role === UserRole.LECTURER) {
      if (transfer.fromUserId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    const updatedTransfer = await prisma.transfer.update({
      where: { id },
      data,
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

    return NextResponse.json(updatedTransfer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating transfer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: { asset: true }
    })

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    // Only pending transfers can be deleted
    if (transfer.status !== TransferStatus.PENDING) {
      return NextResponse.json({ error: "Can only delete pending transfers" }, { status: 400 })
    }

    // Lecturers can only delete transfers they initiated
    if (session.user.role === UserRole.LECTURER) {
      if (transfer.fromUserId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }

    // Revert asset status if needed
    if (transfer.asset.status === "TRANSFER_PENDING") {
      await prisma.asset.update({
        where: { id: transfer.assetId },
        data: { status: "ALLOCATED" }
      })
    }

    // Delete approvals first
    await prisma.approval.deleteMany({
      where: { transferId: id }
    })

    // Delete transfer
    await prisma.transfer.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Transfer deleted successfully" })
  } catch (error) {
    console.error("Error deleting transfer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

