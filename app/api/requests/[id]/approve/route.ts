import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { RequestStatus, AssetStatus, UserRole } from "@/lib/prisma/enums"
import { z } from "zod"

const approveSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  comments: z.string().optional(),
  issuanceCondition: z.string().optional(),
  issuanceNotes: z.string().optional(),
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

    if (!hasPermission(session.user.role, "APPROVE_REQUESTS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, comments, issuanceCondition, issuanceNotes } = approveSchema.parse(body)

    const request = await prisma.request.findUnique({
      where: { id },
      include: { asset: true }
    }) as any

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (request.status !== RequestStatus.PENDING) {
      return NextResponse.json({ error: "Request is not pending" }, { status: 400 })
    }

    // Check available quantity if approving
    if (status === "APPROVED") {
      const totalQuantity = request.asset.quantity ?? 1
      const allocatedQuantity = request.asset.allocatedQuantity ?? 0
      const availableQuantity = totalQuantity - allocatedQuantity
      const requestedQuantity = request.requestedQuantity ?? 1

      if (availableQuantity < requestedQuantity) {
        return NextResponse.json({ 
          error: `Insufficient quantity. Available: ${availableQuantity}, Requested: ${requestedQuantity}` 
        }, { status: 400 })
      }
    }

    // Fetch officers outside transaction to reduce transaction time
    // Only fetch if we need to send notifications (when approving)
    let officers: Array<{ id: string }> = []
    if (status === "APPROVED") {
      officers = await prisma.user.findMany({
        where: {
          role: {
            in: [UserRole.DEPARTMENTAL_OFFICER, UserRole.FACULTY_ADMIN]
          }
        },
        select: { id: true }
      })
    }

    // Update request and asset status
    // Transaction only includes critical operations (request, approval, asset update)
    // Notifications are created outside transaction for better performance
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updateData: {
        status: RequestStatus
        approvedAt: Date
        issuedBy?: string
        issuedAt?: Date
        issuanceCondition?: string
        issuanceNotes?: string
        fulfilledAt?: Date
      } = {
        status: status as RequestStatus,
        approvedAt: new Date(),
      }

      if (status === "APPROVED") {
        // When approving, we also fulfill the request (issue the asset)
        // So set status to FULFILLED since the asset is being issued immediately
        updateData.status = RequestStatus.FULFILLED
        updateData.issuedBy = session.user.id
        updateData.issuedAt = new Date()
        updateData.fulfilledAt = new Date()
        if (issuanceCondition) updateData.issuanceCondition = issuanceCondition
        if (issuanceNotes) updateData.issuanceNotes = issuanceNotes
      }

      // Update request and create approval in parallel for better performance
      const [req, _approval] = await Promise.all([
        tx.request.update({
          where: { id },
          data: updateData,
          include: {
            requestedByUser: {
              select: { name: true, email: true }
            },
            asset: true
          }
        }) as any,
        tx.approval.create({
          data: {
            requestId: id,
            approvedBy: session.user.id,
            status,
            comments
          }
        })
      ])

      if (status === "APPROVED") {
        const requestedQuantity = request.requestedQuantity ?? 1
        const currentAllocated = request.asset.allocatedQuantity ?? 0
        const newAllocatedQuantity = currentAllocated + requestedQuantity
        const totalQuantity = request.asset.quantity ?? 1
        const availableQuantity = totalQuantity - newAllocatedQuantity

        // Update asset with new allocated quantity
        await tx.asset.update({
          where: { id: request.assetId },
          data: {
            allocatedQuantity: newAllocatedQuantity,
            allocatedTo: request.requestedBy, // Track who has it (for single-item assets)
            // Update status based on availability
            status: availableQuantity <= 0 ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE
          } as any
        })
      }

      return req
    }, {
      maxWait: 5000, // Maximum time to wait for a transaction slot (reduced since less work)
      timeout: 10000, // Maximum time the transaction can run (10 seconds, reduced since notifications moved out)
    })

    // Create notifications outside transaction for better performance
    // Notifications don't need to be in the same transaction as the approval
    if (status === "APPROVED") {
      const requestedQuantity = request.requestedQuantity ?? 1
      const currentAllocated = request.asset.allocatedQuantity ?? 0
      const newAllocatedQuantity = currentAllocated + requestedQuantity
      const totalQuantity = request.asset.quantity ?? 1
      const availableQuantity = totalQuantity - newAllocatedQuantity

      // Prepare all notifications to create in parallel
      const notificationsToCreate = []

      // Notify if quantity is zero or all allocated
      if (availableQuantity <= 0 && officers.length > 0) {
        notificationsToCreate.push(
          ...officers.map(officer => ({
            userId: officer.id,
            type: "STOCK_OUT",
            title: "Asset Stock Depleted",
            message: `All units of "${request.asset.name}" (${request.asset.assetCode}) have been allocated. Total: ${totalQuantity}, Allocated: ${newAllocatedQuantity}`,
            relatedAssetId: request.assetId
          }))
        )
      } else if (request.asset.minStockLevel && availableQuantity <= request.asset.minStockLevel && officers.length > 0) {
        notificationsToCreate.push(
          ...officers.map(officer => ({
            userId: officer.id,
            type: "STOCK_LOW",
            title: "Low Stock Alert",
            message: `"${request.asset.name}" (${request.asset.assetCode}) is running low. Available: ${availableQuantity}, Minimum: ${request.asset.minStockLevel}`,
            relatedAssetId: request.assetId
          }))
        )
      }

      // Create notification for requester
      notificationsToCreate.push({
        userId: request.requestedBy,
        type: "REQUEST_APPROVED",
        title: "Asset Request Approved",
        message: `Your request for ${requestedQuantity} unit(s) of "${request.asset.name}" has been approved.`,
        relatedRequestId: id
      })

      // Create all notifications in batch (non-blocking)
      if (notificationsToCreate.length > 0) {
        prisma.notification.createMany({
          data: notificationsToCreate
        }).catch(err => {
          // Log error but don't fail the request
          console.error("Error creating notifications:", err)
        })
      }
    } else {
      // Create notification for rejection (non-blocking)
      prisma.notification.create({
        data: {
          userId: request.requestedBy,
          type: "REQUEST_REJECTED",
          title: "Asset Request Rejected",
          message: `Your request for "${request.asset.name}" has been rejected.${comments ? ` Reason: ${comments}` : ""}`,
          relatedRequestId: id
        }
      }).catch(err => {
        // Log error but don't fail the request
        console.error("Error creating rejection notification:", err)
      })
    }

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error approving request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

