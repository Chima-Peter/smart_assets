import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { TransferStatus, AssetStatus } from "@/lib/prisma/enums"
import { z } from "zod"

const approveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const transfer = await prisma.transfer.findUnique({
      where: { id: params.id },
      include: { 
        asset: true,
        fromUser: { select: { department: true } },
        toUser: { select: { department: true } }
      }
    })

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    if (transfer.status !== TransferStatus.PENDING) {
      return NextResponse.json({ error: "Transfer is not pending" }, { status: 400 })
    }

    // Check permissions
    const isInDepartmentTransfer = transfer.fromUser.department === transfer.toUser.department && 
                                   transfer.fromUser.department !== null
    const canApprove = 
      (isInDepartmentTransfer && hasPermission(session.user.role, "APPROVE_IN_DEPARTMENT_TRANSFERS")) ||
      hasPermission(session.user.role, "APPROVE_TRANSFERS")

    if (!canApprove) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { status, comments } = approveSchema.parse(body)

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      const tr = await tx.transfer.update({
        where: { id: params.id },
        data: {
          status: status as TransferStatus,
          approvedAt: status === "APPROVED" ? new Date() : null,
        }
      })

      await tx.approval.create({
        data: {
          transferId: params.id,
          approvedBy: session.user.id,
          status,
          comments
        }
      })

      if (status === "APPROVED") {
        await tx.asset.update({
          where: { id: transfer.assetId },
          data: {
            status: AssetStatus.ALLOCATED,
            allocatedTo: transfer.toUserId
          }
        })

        await tx.transfer.update({
          where: { id: params.id },
          data: {
            completedAt: new Date()
          }
        })
      } else {
        // Reject - revert asset status
        await tx.asset.update({
          where: { id: transfer.assetId },
          data: {
            status: AssetStatus.ALLOCATED,
          }
        })
      }

      return tr
    })

    return NextResponse.json(updatedTransfer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error approving transfer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

