import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { UserRole, TransferStatus, AssetStatus } from "@/lib/prisma/enums"
import { z } from "zod"

const transferSchema = z.object({
  assetId: z.string(),
  toUserId: z.string(),
  fromUserId: z.string().optional(), // Optional for officer-to-lecturer transfers
  transferQuantity: z.number().int().min(1).default(1),
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
    } else if (session.user.role === UserRole.DEPARTMENTAL_OFFICER || session.user.role === UserRole.FACULTY_ADMIN) {
      // Officers can see all transfers (they initiate them)
      // No filter needed - they see everything
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

    // Check permissions for initiating transfers
    // Only Departmental Officers and Faculty Admins can initiate transfers
    if (!hasPermission(session.user.role, "INITIATE_TRANSFERS")) {
      return NextResponse.json({ 
        error: "Forbidden. Only Departmental Officers and Faculty Admins can initiate transfers." 
      }, { status: 403 })
    }

    const body = await req.json()
    const data = transferSchema.parse(body)

    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
      include: {
        allocatedToUser: {
          select: { department: true, role: true }
        }
      }
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    const assetAny = asset as any

    // Only officers/admins can initiate transfers - check available quantity
    const totalQuantity = assetAny.quantity ?? 1
    const allocatedQuantity = assetAny.allocatedQuantity ?? 0
    const availableQuantity = totalQuantity - allocatedQuantity

    // If transferring from a lecturer (fromUserId provided), check if that lecturer has enough
    if (data.fromUserId) {
      // Check if the fromUser actually has this asset allocated
      if (assetAny.allocatedTo !== data.fromUserId) {
        return NextResponse.json({ 
          error: "The specified sender does not have this asset allocated" 
        }, { status: 400 })
      }
      
      // For transfers from lecturers, we need to check their allocated quantity
      // Since we track allocatedQuantity at asset level, we'll validate based on the transfer quantity
      if (data.transferQuantity > allocatedQuantity) {
        return NextResponse.json({ 
          error: `Insufficient quantity. Allocated: ${allocatedQuantity}, Requested: ${data.transferQuantity}` 
        }, { status: 400 })
      }
    } else {
      // Transfer from available stock - check available quantity
      if (availableQuantity < data.transferQuantity) {
        return NextResponse.json({ 
          error: `Insufficient quantity. Available: ${availableQuantity}, Requested: ${data.transferQuantity}` 
        }, { status: 400 })
      }
    }

    // Get toUser to determine transfer type
    // If toUserId is "STOCK" or empty, it's a transfer back to stock (officer)
    let toUser: { department: string | null; role: UserRole } | null = null
    let isTransferBackToStock = false
    
    if (data.toUserId === "STOCK" || data.toUserId === "") {
      // Transfer back to stock - find an officer in the same department
      const officers = await prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.DEPARTMENTAL_OFFICER, UserRole.FACULTY_ADMIN]
          },
          ...((session.user as any).department ? { department: (session.user as any).department } : {})
        },
        take: 1,
        select: { id: true, department: true, role: true }
      })
      
      if (officers.length === 0) {
        return NextResponse.json({ error: "No officer found to receive the asset" }, { status: 404 })
      }
      
      // Use the first officer found
      toUser = officers[0]
      isTransferBackToStock = true
      // Update toUserId to the officer's ID
      data.toUserId = officers[0].id
    } else {
      const recipientUser = await prisma.user.findUnique({
        where: { id: data.toUserId },
        select: { department: true, role: true }
      })

      if (!recipientUser) {
        return NextResponse.json({ error: "Recipient user not found" }, { status: 404 })
      }

      toUser = recipientUser

      // Prevent transfers to course reps
      if (toUser.role === UserRole.COURSE_REP) {
        return NextResponse.json({ 
          error: "Course representatives cannot receive asset transfers" 
        }, { status: 400 })
      }
    }

    // Determine fromUserId
    // Only officers can initiate transfers, so fromUserId comes from the request or asset allocation
    let fromUserId: string | null = null
    if (data.fromUserId) {
      // Officer specifying a from user (lecturer to lecturer transfer)
      fromUserId = data.fromUserId
    } else if (asset.allocatedTo) {
      // Transfer from current allocated user (if asset is already allocated)
      fromUserId = asset.allocatedTo
    }
    // If fromUserId is still null, it's an officer-to-lecturer transfer (from available stock)

    // Determine transfer type
    const fromDepartment = fromUserId ? assetAny.allocatedToUser?.department : null
    const toDepartment = toUser.department
    const isIntraDepartmental = fromDepartment && toDepartment && fromDepartment === toDepartment
    const transferType = isIntraDepartmental ? "INTRA_DEPARTMENTAL" : "INTER_DEPARTMENTAL"

    // For intra-departmental transfers, auto-approve (set status to APPROVED)
    // For inter-departmental transfers, require faculty admin approval (set status to PENDING)
    const initialStatus = isIntraDepartmental ? TransferStatus.APPROVED : TransferStatus.PENDING

    const transfer = await prisma.transfer.create({
      data: {
        assetId: data.assetId,
        fromUserId: fromUserId ?? undefined,
        toUserId: data.toUserId,
        transferQuantity: data.transferQuantity,
        reason: data.reason,
        notes: data.notes,
        initiatedBy: session.user.id,
        transferType,
        status: initialStatus,
        approvedAt: isIntraDepartmental ? new Date() : null
      } as any,
      include: {
        asset: true,
        fromUser: {
          select: { name: true, email: true, department: true }
        },
        toUser: {
          select: { name: true, email: true, department: true }
        }
      }
    })

    // If intra-departmental, auto-approve and update asset immediately
    // If inter-departmental, set status to pending and wait for approval
    if (isIntraDepartmental) {
      // Auto-approve intra-departmental transfers
      const transferQuantity = data.transferQuantity
      const currentAllocated = assetAny.allocatedQuantity ?? 0
      const totalQuantity = assetAny.quantity ?? 1
      
      // Check if this is a transfer back to stock
      const isTransferBack = fromUserId && 
                            (toUser.role === UserRole.DEPARTMENTAL_OFFICER || toUser.role === UserRole.FACULTY_ADMIN)
      
      let newAllocatedQuantity: number
      let newStatus: AssetStatus
      let allocatedTo: string | null
      
      if (isTransferBack) {
        // Transfer back to stock: reduce allocated quantity
        newAllocatedQuantity = Math.max(0, currentAllocated - transferQuantity)
        const availableQuantity = totalQuantity - newAllocatedQuantity
        newStatus = availableQuantity > 0 ? AssetStatus.AVAILABLE : AssetStatus.ALLOCATED
        allocatedTo = newAllocatedQuantity > 0 ? fromUserId : null
      } else {
        // Normal transfer: increase allocated quantity
        newAllocatedQuantity = currentAllocated + transferQuantity
        const availableQuantity = totalQuantity - newAllocatedQuantity
        newStatus = availableQuantity <= 0 ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE
        allocatedTo = data.toUserId
      }

      // Update asset immediately for intra-departmental transfers
      await prisma.asset.update({
        where: { id: data.assetId },
        data: {
          allocatedQuantity: newAllocatedQuantity,
          allocatedTo: allocatedTo,
          status: newStatus,
          location: isTransferBack ? undefined : (toUser.department || undefined)
        } as any
      })

      // Create approval record for auto-approved transfer
      await prisma.approval.create({
        data: {
          transferId: transfer.id,
          approvedBy: session.user.id, // Officer who initiated
          status: "APPROVED",
          comments: "Auto-approved: Intra-departmental transfer"
        }
      })

      // Update transfer with completion
      await prisma.transfer.update({
        where: { id: transfer.id },
        data: {
          completedAt: new Date(),
          receiptNumber: `TRF-${Date.now()}-${transfer.id.substring(0, 6).toUpperCase()}`,
          receiptGeneratedAt: new Date()
        } as any
      })
    } else {
      // Inter-departmental: set status to pending and wait for approval
      await prisma.asset.update({
        where: { id: data.assetId },
        data: { status: AssetStatus.TRANSFER_PENDING }
      } as any)
    }

    // Notify all parties involved in the transfer
    const fromUserName = transfer.fromUser?.name || "Stock/Officer"
    const toUserName = transfer.toUser.name
    const transferQuantity = (transfer as any).transferQuantity ?? 1
    const initiatedByName = session.user.name || "Officer"

    // Fetch only the parties directly involved in the transfer
    const [admins, fromUserForNotification, toUserForNotification] = await Promise.all([
      // Only fetch admins for inter-departmental transfers
      isIntraDepartmental ? Promise.resolve([]) : prisma.user.findMany({
        where: { role: UserRole.FACULTY_ADMIN },
        select: { id: true }
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

    // Prepare notifications for only the parties directly involved
    const notificationsToCreate = []

    // Notify Faculty Admins only for inter-departmental transfers (for approval)
    if (!isIntraDepartmental) {
      notificationsToCreate.push(
        ...admins.map(admin => ({
          userId: admin.id,
          type: "TRANSFER_PENDING",
          title: "Transfer Request Pending Approval",
          message: `${initiatedByName} initiated an inter-departmental transfer of ${transferQuantity} unit(s) of "${assetAny.name}" (${assetAny.assetCode}) from ${fromUserName} to ${toUserName}. Requires admin approval.`,
          relatedAssetId: asset.id
        }))
      )
    }

    // Notify sender lecturer (if transfer is from a lecturer)
    if (fromUserForNotification) {
      notificationsToCreate.push({
        userId: fromUserForNotification.id,
        type: isIntraDepartmental ? "TRANSFER_APPROVED" : "TRANSFER_PENDING",
        title: isIntraDepartmental ? "Asset Transfer Completed" : "Asset Transfer Initiated",
        message: isIntraDepartmental
          ? `${initiatedByName} completed an intra-departmental transfer of ${transferQuantity} unit(s) of "${assetAny.name}" (${assetAny.assetCode}) from you to ${toUserName}.`
          : `${initiatedByName} initiated a transfer of ${transferQuantity} unit(s) of "${assetAny.name}" (${assetAny.assetCode}) from you to ${toUserName}. Pending admin approval.`,
        relatedAssetId: asset.id
      })
    }

    // Notify recipient lecturer (if recipient is a lecturer)
    if (toUserForNotification && toUserForNotification.role === UserRole.LECTURER) {
      notificationsToCreate.push({
        userId: toUserForNotification.id,
        type: isIntraDepartmental ? "TRANSFER_APPROVED" : "TRANSFER_PENDING",
        title: isIntraDepartmental ? "Asset Transfer Completed" : "Asset Transfer Initiated",
        message: isIntraDepartmental
          ? `${initiatedByName} completed an intra-departmental transfer of ${transferQuantity} unit(s) of "${assetAny.name}" (${assetAny.assetCode}) from ${fromUserName} to you.`
          : `${initiatedByName} initiated a transfer of ${transferQuantity} unit(s) of "${assetAny.name}" (${assetAny.assetCode}) from ${fromUserName} to you. Pending admin approval.`,
        relatedAssetId: asset.id
      })
    }

    // Create all notifications in batch (non-blocking)
    if (notificationsToCreate.length > 0) {
      prisma.notification.createMany({
        data: notificationsToCreate
      }).catch(err => {
        console.error("Error creating transfer initiation notifications:", err)
      })
    }

    return NextResponse.json(transfer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating transfer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

