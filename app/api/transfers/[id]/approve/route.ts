import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { TransferStatus, AssetStatus, UserRole } from "@/lib/prisma/enums"
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

    // Check permissions - ALL transfers must be approved by Faculty Admin only
    if (!hasPermission(session.user.role, "APPROVE_TRANSFERS")) {
      return NextResponse.json({ 
        error: "Forbidden. Only Faculty Admins can approve or reject transfers." 
      }, { status: 403 })
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
          toUser: { select: { name: true, email: true, department: true, role: true } }
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

        const transferQuantity = transfer.transferQuantity ?? 1
        const currentAllocated = transfer.asset.allocatedQuantity ?? 0
        const totalQuantity = transfer.asset.quantity ?? 1
        
        // Check if this is a transfer back to stock (from lecturer to officer)
        const toUserRole = tr.toUser.role
        const isTransferBack = transfer.fromUserId && 
                               (toUserRole === "DEPARTMENTAL_OFFICER" || toUserRole === "FACULTY_ADMIN")
        
        let newAllocatedQuantity: number
        let newStatus: AssetStatus
        let allocatedTo: string | null
        
        if (isTransferBack) {
          // Transfer back to stock: reduce allocated quantity
          newAllocatedQuantity = Math.max(0, currentAllocated - transferQuantity)
          const availableQuantity = totalQuantity - newAllocatedQuantity
          newStatus = availableQuantity > 0 ? AssetStatus.AVAILABLE : AssetStatus.ALLOCATED
          // If all returned, clear allocatedTo; otherwise keep it if there's still allocation
          allocatedTo = newAllocatedQuantity > 0 ? transfer.fromUserId : null
        } else {
          // Normal transfer: increase allocated quantity
          newAllocatedQuantity = currentAllocated + transferQuantity
          const availableQuantity = totalQuantity - newAllocatedQuantity
          newStatus = availableQuantity <= 0 ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE
          allocatedTo = transfer.toUserId
        }

        // Update asset with quantity and ownership
        const updatedAsset = await tx.asset.update({
          where: { id: transfer.assetId },
          data: {
            allocatedQuantity: newAllocatedQuantity,
            allocatedTo: allocatedTo, // New holder of the asset
            status: newStatus,
            // Update location to recipient's department if available (not for transfers back)
            location: isTransferBack ? undefined : (tr.toUser.department || undefined)
          },
          include: {
            allocatedToUser: {
              select: { name: true, email: true }
            }
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
        const notifications = [
          // Notify recipient
          tx.notification.create({
            data: {
              userId: transfer.toUserId,
              type: "TRANSFER_APPROVED",
              title: "Asset Transfer Approved",
              message: transfer.fromUserId 
                ? `Transfer of ${transferQuantity} unit(s) of "${tr.asset.name}" from ${tr.fromUser?.name || "Officer"} has been approved. Receipt: ${receiptNumber}`
                : `Transfer of ${transferQuantity} unit(s) of "${tr.asset.name}" from Officer has been approved. Receipt: ${receiptNumber}`,
            }
          })
        ]

        // Only notify sender if transfer is from a user (not officer-to-lecturer)
        if (transfer.fromUserId) {
          notifications.push(
            tx.notification.create({
              data: {
                userId: transfer.fromUserId,
                type: "TRANSFER_APPROVED",
                title: "Asset Transfer Approved",
                message: `Transfer of ${transferQuantity} unit(s) of "${tr.asset.name}" to ${tr.toUser.name} has been approved. Receipt: ${receiptNumber}`,
              }
            })
          )
        }

        await Promise.all(notifications)

        // Get IP and user agent for activity logs (within transaction context)
        const headersList = await headers()
        const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
        const userAgent = headersList.get("user-agent") || "unknown"

        // Create activity logs for all parties involved (within transaction)
        const activityLogs = []
        
        // Activity log for Faculty Admin (who approved)
        activityLogs.push(
          tx.activityLog.create({
            data: {
              userId: session.user.id,
              action: "APPROVE",
              entityType: "TRANSFER",
              entityId: id,
              description: `Approved transfer of ${transferQuantity} unit(s) of "${tr.asset.name}" (${tr.asset.assetCode}) from ${tr.fromUser?.name || "Stock"} to ${tr.toUser.name}`,
              metadata: JSON.stringify({
                transferId: id,
                assetId: transfer.assetId,
                assetCode: tr.asset.assetCode,
                fromUserId: transfer.fromUserId,
                toUserId: transfer.toUserId,
                transferQuantity,
                receiptNumber,
                transferType: transfer.transferType
              }),
              ipAddress,
              userAgent
            }
          })
        )

        // Activity log for recipient lecturer (new holder) - only if not transfer back to stock
        if (transfer.toUserId && !isTransferBack) {
          activityLogs.push(
            tx.activityLog.create({
              data: {
                userId: transfer.toUserId,
                action: "RECEIVE",
                entityType: "TRANSFER",
                entityId: id,
                description: `Received ${transferQuantity} unit(s) of "${tr.asset.name}" (${tr.asset.assetCode}) from ${tr.fromUser?.name || "Officer"}`,
                metadata: JSON.stringify({
                  transferId: id,
                  assetId: transfer.assetId,
                  assetCode: tr.asset.assetCode,
                  fromUserId: transfer.fromUserId,
                  receiptNumber,
                  transferType: transfer.transferType
                }),
                ipAddress,
                userAgent
              }
            })
          )
        }

        // Activity log for sender lecturer (if transfer is from a lecturer)
        if (transfer.fromUserId) {
          activityLogs.push(
            tx.activityLog.create({
              data: {
                userId: transfer.fromUserId,
                action: "TRANSFER",
                entityType: "TRANSFER",
                entityId: id,
                description: isTransferBack
                  ? `Transferred ${transferQuantity} unit(s) of "${tr.asset.name}" (${tr.asset.assetCode}) back to stock`
                  : `Transferred ${transferQuantity} unit(s) of "${tr.asset.name}" (${tr.asset.assetCode}) to ${tr.toUser.name}`,
                metadata: JSON.stringify({
                  transferId: id,
                  assetId: transfer.assetId,
                  assetCode: tr.asset.assetCode,
                  toUserId: transfer.toUserId,
                  receiptNumber,
                  transferType: transfer.transferType,
                  isTransferBack
                }),
                ipAddress,
                userAgent
              }
            })
          )
        }

        // Execute all activity logs in parallel
        await Promise.all(activityLogs)
      } else {
        // Reject - revert asset status
        await tx.asset.update({
          where: { id: transfer.assetId },
          data: {
            status: AssetStatus.ALLOCATED,
          }
        })

        // Notify all parties about rejection
        const rejectNotifications = [
          tx.notification.create({
            data: {
              userId: transfer.toUserId,
              type: "TRANSFER_REJECTED",
              title: "Asset Transfer Rejected",
              message: `Transfer of "${tr.asset.name}" has been rejected.${comments ? ` Reason: ${comments}` : ""}`,
            }
          })
        ]

        // Only notify sender if transfer is from a user
        if (transfer.fromUserId) {
          rejectNotifications.push(
            tx.notification.create({
              data: {
                userId: transfer.fromUserId,
                type: "TRANSFER_REJECTED",
                title: "Asset Transfer Rejected",
                message: `Transfer of "${tr.asset.name}" to ${tr.toUser.name} has been rejected.${comments ? ` Reason: ${comments}` : ""}`,
              }
            })
          )
        }

        await Promise.all(rejectNotifications)
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

