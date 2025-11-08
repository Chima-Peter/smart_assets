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
        fromUser: { select: { name: true, email: true, department: true } },
        toUser: { select: { name: true, email: true, department: true } }
      }
    })

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    if (transfer.status !== TransferStatus.PENDING) {
      return NextResponse.json({ error: "Transfer is not pending" }, { status: 400 })
    }

    // Check permissions - only Faculty Admins can approve inter-departmental transfers
    if (!hasPermission(session.user.role, "APPROVE_INTER_DEPARTMENTAL_TRANSFERS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { status, comments } = approveSchema.parse(body)

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      const tr = await tx.transfer.update({
        where: { id },
        data: {
          status: status as TransferStatus,
          approvedAt: status === "APPROVED" ? new Date() : null,
        },
        include: {
          asset: true,
          fromUser: { select: { name: true, email: true, department: true } },
          toUser: { select: { name: true, email: true, department: true } }
        }
      })

      await tx.approval.create({
        data: {
          transferId: id,
          approvedBy: session.user.id,
          status,
          comments
        }
      })

      if (status === "APPROVED") {
        // Generate receipt number
        const receiptNumber = `TRF-${Date.now()}-${id.substring(0, 6).toUpperCase()}`

        // Update asset ownership and location
        await tx.asset.update({
          where: { id: transfer.assetId },
          data: {
            status: AssetStatus.ALLOCATED,
            allocatedTo: transfer.toUserId,
            // Update location to recipient's department if available
            location: tr.toUser.department || undefined
          }
        })

        // Update transfer with completion and receipt (will work after migration)
        const updateData: Record<string, unknown> = {
          completedAt: new Date()
        }
        // These fields will be available after migration
        updateData.receiptNumber = receiptNumber
        updateData.receiptGeneratedAt = new Date()

        await tx.transfer.update({
          where: { id },
          data: updateData as Parameters<typeof tx.transfer.update>[0]['data']
        })

        // Create notifications
        await Promise.all([
          // Notify recipient
          tx.notification.create({
            data: {
              userId: transfer.toUserId,
              type: "TRANSFER_APPROVED",
              title: "Asset Transfer Approved",
              message: `Transfer of "${tr.asset.name}" from ${tr.fromUser.name} has been approved. Receipt: ${receiptNumber}`,
            }
          }),
          // Notify sender
          tx.notification.create({
            data: {
              userId: transfer.fromUserId,
              type: "TRANSFER_APPROVED",
              title: "Asset Transfer Approved",
              message: `Transfer of "${tr.asset.name}" to ${tr.toUser.name} has been approved. Receipt: ${receiptNumber}`,
            }
          })
        ])
      } else {
        // Reject - revert asset status
        await tx.asset.update({
          where: { id: transfer.assetId },
          data: {
            status: AssetStatus.ALLOCATED,
          }
        })

        // Notify all parties about rejection
        await Promise.all([
          tx.notification.create({
            data: {
              userId: transfer.toUserId,
              type: "TRANSFER_REJECTED",
              title: "Asset Transfer Rejected",
              message: `Transfer of "${tr.asset.name}" has been rejected.${comments ? ` Reason: ${comments}` : ""}`,
            }
          }),
          tx.notification.create({
            data: {
              userId: transfer.fromUserId,
              type: "TRANSFER_REJECTED",
              title: "Asset Transfer Rejected",
              message: `Transfer of "${tr.asset.name}" to ${tr.toUser.name} has been rejected.${comments ? ` Reason: ${comments}` : ""}`,
            }
          })
        ])
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

