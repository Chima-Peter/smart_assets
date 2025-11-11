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
    }) as any

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    if (transfer.status !== TransferStatus.PENDING) {
      return NextResponse.json({ error: "Transfer is not pending" }, { status: 400 })
    }

    // Only inter-departmental transfers require faculty admin approval
    // Intra-departmental transfers are auto-approved
    if (transfer.transferType === "INTRA_DEPARTMENTAL") {
      return NextResponse.json({ 
        error: "Intra-departmental transfers are auto-approved and do not require manual approval." 
      }, { status: 400 })
    }

    // Check permissions - Only inter-departmental transfers must be approved by Faculty Admin
    if (!hasPermission(session.user.role, "APPROVE_TRANSFERS")) {
      return NextResponse.json({ 
        error: "Forbidden. Only Faculty Admins can approve or reject inter-departmental transfers." 
      }, { status: 403 })
    }

    const body = await req.json()
    const { status, comments } = approveSchema.parse(body)

    // Generate receipt number once (only used if approved)
    const receiptNumber = status === "APPROVED" 
      ? `TRF-${Date.now()}-${id.substring(0, 6).toUpperCase()}`
      : null

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
          } as any,
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

        // Fetch all parties to notify (outside transaction for better performance)
        // We'll create notifications after the transaction completes
        // This is done outside the transaction to avoid timeout issues

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

        // Notifications will be created outside the transaction
      }

      return tr
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
      timeout: 15000, // Maximum time the transaction can run (15 seconds)
    })

    // Create notifications outside transaction for only the parties directly involved
    // Fetch only the parties directly involved in the transfer
    const [admins, initiator, fromUser, toUser] = await Promise.all([
      prisma.user.findMany({
        where: { role: UserRole.FACULTY_ADMIN },
        select: { id: true, name: true }
      }),
      prisma.user.findUnique({
        where: { id: transfer.initiatedBy },
        select: { id: true, name: true, role: true, department: true }
      }),
      transfer.fromUserId ? prisma.user.findUnique({
        where: { id: transfer.fromUserId },
        select: { id: true, name: true }
      }) : Promise.resolve(null),
      prisma.user.findUnique({
        where: { id: transfer.toUserId },
        select: { id: true, name: true, role: true }
      })
    ])

    const transferQuantity = transfer.transferQuantity ?? 1
    const approvedByName = session.user.name || "Admin"
    const assetName = updatedTransfer.asset.name
    const assetCode = updatedTransfer.asset.assetCode
    const fromUserName = updatedTransfer.fromUser?.name || "Stock/Officer"
    const toUserName = updatedTransfer.toUser.name

    // Prepare notifications for all parties
    const notificationsToCreate = []

    if (status === "APPROVED" && receiptNumber) {
      // Notify all Faculty Admins (except the one who approved)
      notificationsToCreate.push(
        ...admins
          .filter(admin => admin.id !== session.user.id)
          .map(admin => ({
            userId: admin.id,
            type: "TRANSFER_APPROVED",
            title: "Transfer Approved",
            message: `${approvedByName} approved a transfer of ${transferQuantity} unit(s) of "${assetName}" (${assetCode}) from ${fromUserName} to ${toUserName}. Receipt: ${receiptNumber}`,
            relatedAssetId: transfer.assetId
          }))
      )

      // Notify initiator (Departmental Officer who initiated)
      if (initiator && initiator.role === UserRole.DEPARTMENTAL_OFFICER) {
        notificationsToCreate.push({
          userId: initiator.id,
          type: "TRANSFER_APPROVED",
          title: "Transfer Approved",
          message: `Your transfer of ${transferQuantity} unit(s) of "${assetName}" (${assetCode}) from ${fromUserName} to ${toUserName} has been approved by ${approvedByName}. Receipt: ${receiptNumber}`,
          relatedAssetId: transfer.assetId,
          relatedTransferId: id
        })
      }

      // Notify sender lecturer (if transfer is from a lecturer)
      if (fromUser) {
        notificationsToCreate.push({
          userId: fromUser.id,
          type: "TRANSFER_APPROVED",
          title: "Asset Transfer Approved",
          message: `Transfer of ${transferQuantity} unit(s) of "${assetName}" (${assetCode}) from you to ${toUserName} has been approved by ${approvedByName}. Receipt: ${receiptNumber}`,
          relatedAssetId: transfer.assetId,
          relatedTransferId: id
        })
      }

      // Notify recipient lecturer (if recipient is a lecturer)
      if (toUser && toUser.role === UserRole.LECTURER) {
        notificationsToCreate.push({
          userId: toUser.id,
          type: "TRANSFER_APPROVED",
          title: "Asset Transfer Approved",
          message: `Transfer of ${transferQuantity} unit(s) of "${assetName}" (${assetCode}) from ${fromUserName} to you has been approved by ${approvedByName}. Receipt: ${receiptNumber}`,
          relatedAssetId: transfer.assetId,
          relatedTransferId: id
        })
      }
    } else {
      // REJECTED - notify only the parties directly involved
      // Notify all Faculty Admins (except the one who rejected)
      notificationsToCreate.push(
        ...admins
          .filter(admin => admin.id !== session.user.id)
          .map(admin => ({
            userId: admin.id,
            type: "TRANSFER_REJECTED",
            title: "Transfer Rejected",
            message: `${approvedByName} rejected a transfer of "${assetName}" (${assetCode}) from ${fromUserName} to ${toUserName}.${comments ? ` Reason: ${comments}` : ""}`,
            relatedAssetId: transfer.assetId
          }))
      )

      // Notify initiator
      if (initiator && initiator.role === UserRole.DEPARTMENTAL_OFFICER) {
        notificationsToCreate.push({
          userId: initiator.id,
          type: "TRANSFER_REJECTED",
          title: "Transfer Rejected",
          message: `Your transfer of "${assetName}" (${assetCode}) from ${fromUserName} to ${toUserName} has been rejected by ${approvedByName}.${comments ? ` Reason: ${comments}` : ""}`,
          relatedAssetId: transfer.assetId,
          relatedTransferId: id
        })
      }

      // Notify sender lecturer
      if (fromUser) {
        notificationsToCreate.push({
          userId: fromUser.id,
          type: "TRANSFER_REJECTED",
          title: "Asset Transfer Rejected",
          message: `Transfer of "${assetName}" (${assetCode}) from you to ${toUserName} has been rejected by ${approvedByName}.${comments ? ` Reason: ${comments}` : ""}`,
          relatedAssetId: transfer.assetId,
          relatedTransferId: id
        })
      }

      // Notify recipient lecturer
      if (toUser && toUser.role === UserRole.LECTURER) {
        notificationsToCreate.push({
          userId: toUser.id,
          type: "TRANSFER_REJECTED",
          title: "Asset Transfer Rejected",
          message: `Transfer of "${assetName}" (${assetCode}) from ${fromUserName} to you has been rejected by ${approvedByName}.${comments ? ` Reason: ${comments}` : ""}`,
          relatedAssetId: transfer.assetId,
          relatedTransferId: id
        })
      }
    }

    // Create all notifications in batch (non-blocking)
    if (notificationsToCreate.length > 0) {
      prisma.notification.createMany({
        data: notificationsToCreate
      }).catch(err => {
        console.error("Error creating transfer approval notifications:", err)
      })
    }

    return NextResponse.json(updatedTransfer)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error approving transfer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

