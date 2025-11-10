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
    // Officers/Admins can initiate any transfers, Lecturers can only transfer assets they have
    if (!hasPermission(session.user.role, "INITIATE_TRANSFERS") && 
        !hasPermission(session.user.role, "TRANSFER_OWN_ASSETS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
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

    // If lecturer is initiating transfer, they must own the asset
    if (session.user.role === UserRole.LECTURER) {
      if (!asset.allocatedTo || asset.allocatedTo !== session.user.id) {
        return NextResponse.json({ 
          error: "You can only transfer assets that are allocated to you" 
        }, { status: 403 })
      }
      
      // Check if lecturer has enough allocated quantity
      // For lecturers, we need to check how much they actually have allocated
      // This is a simplified check - in reality, we'd need to track per-user allocations
      const totalQuantity = asset.quantity ?? 1
      const allocatedQuantity = asset.allocatedQuantity ?? 0
      
      // If all quantity is allocated and lecturer has it, they can transfer up to allocatedQuantity
      if (data.transferQuantity > allocatedQuantity) {
        return NextResponse.json({ 
          error: `Insufficient quantity. You have ${allocatedQuantity} unit(s) allocated, but requested ${data.transferQuantity}` 
        }, { status: 400 })
      }
    } else {
      // For officers/admins, check available quantity
      const totalQuantity = asset.quantity ?? 1
      const allocatedQuantity = asset.allocatedQuantity ?? 0
      const availableQuantity = totalQuantity - allocatedQuantity

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
          ...(session.user.department ? { department: session.user.department } : {})
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
      toUser = await prisma.user.findUnique({
        where: { id: data.toUserId },
        select: { department: true, role: true }
      })

      if (!toUser) {
        return NextResponse.json({ error: "Recipient user not found" }, { status: 404 })
      }
    }

    // Determine fromUserId
    let fromUserId: string | null = null
    if (session.user.role === UserRole.LECTURER) {
      // Lecturer transferring their own asset
      fromUserId = session.user.id
    } else if (data.fromUserId) {
      // Officer specifying a from user (lecturer to lecturer)
      fromUserId = data.fromUserId
    } else if (asset.allocatedTo) {
      // Transfer from current allocated user
      fromUserId = asset.allocatedTo
    }
    // If fromUserId is still null, it's an officer-to-lecturer transfer (from available stock)

    // Determine transfer type
    const fromDepartment = fromUserId ? asset.allocatedToUser?.department : null
    const toDepartment = toUser.department
    const transferType = (fromDepartment && toDepartment && fromDepartment === toDepartment) 
      ? "INTRA_DEPARTMENTAL" 
      : "INTER_DEPARTMENTAL"

    const transfer = await prisma.transfer.create({
      data: {
        assetId: data.assetId,
        fromUserId: fromUserId,
        toUserId: data.toUserId,
        transferQuantity: data.transferQuantity,
        reason: data.reason,
        notes: data.notes,
        initiatedBy: session.user.id,
        transferType,
        status: TransferStatus.PENDING
      },
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

    // Update asset status to transfer pending (don't change quantity yet - wait for approval)
    await prisma.asset.update({
      where: { id: data.assetId },
      data: { status: AssetStatus.TRANSFER_PENDING }
    })

    // Create notification for ALL Faculty Admins (all transfers require admin approval)
    const admins = await prisma.user.findMany({
      where: { role: UserRole.FACULTY_ADMIN }
    })

    const fromUserName = transfer.fromUser?.name || "Stock/Officer"
    const toUserName = transfer.toUser.name

    await Promise.all(
      admins.map(admin =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            type: "TRANSFER_PENDING",
            title: "Transfer Request Pending Approval",
            message: `${session.user.name || "User"} initiated a ${transferType.toLowerCase().replace("_", "-")} transfer of ${transfer.transferQuantity} unit(s) of "${asset.name}" (${asset.assetCode}) from ${fromUserName} to ${toUserName}. Requires admin approval.`,
            relatedAssetId: asset.id
          }
        })
      )
    )

    return NextResponse.json(transfer, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating transfer:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

