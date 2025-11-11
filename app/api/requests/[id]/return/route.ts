import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { RequestStatus, AssetStatus } from "@/lib/prisma/enums"
import { z } from "zod"

const returnSchema = z.object({
  returnCondition: z.enum(["FUNCTIONAL", "DAMAGED", "LOST", "NEEDS_REPAIR", "GOOD", "FAIR"]),
  returnNotes: z.string().optional(),
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
    const body = await req.json()
    const { returnCondition, returnNotes } = returnSchema.parse(body)

    const request = await prisma.request.findUnique({
      where: { id },
      include: {
        asset: true,
        requestedByUser: {
          select: { name: true, email: true }
        }
      }
    }) as any

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Check permissions - only the requester can return assets
    if (request.requestedBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!hasPermission(session.user.role, "RETURN_ASSETS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (request.status !== RequestStatus.FULFILLED) {
      return NextResponse.json({ error: "Request is not fulfilled" }, { status: 400 })
    }

    // Check if asset is returnable
    if (request.asset.assetCategory !== "RETURNABLE" && request.asset.assetCategory !== null) {
      return NextResponse.json({ 
        error: "This asset is not returnable. Only returnable assets can be returned." 
      }, { status: 400 })
    }

    const requestedQuantity = request.requestedQuantity ?? 1
    const currentAllocated = request.asset.allocatedQuantity ?? 0

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const req = await tx.request.update({
        where: { id },
        data: {
          status: RequestStatus.RETURNED,
          returnedAt: new Date(),
          returnCondition,
          returnNotes
        }
      })
      
      // Update asset based on return condition
      let assetStatus: AssetStatus = AssetStatus.AVAILABLE
      let newAllocatedQuantity = currentAllocated
      let quantityToReduce = requestedQuantity

      if (returnCondition === "LOST") {
        // Lost items: reduce total quantity, don't reduce allocated (they're gone)
        const currentQuantity = request.asset.quantity ?? 1
        await tx.asset.update({
          where: { id: request.assetId },
          data: {
            quantity: Math.max(0, currentQuantity - quantityToReduce),
            allocatedQuantity: Math.max(0, currentAllocated - quantityToReduce),
            status: AssetStatus.RETIRED // Mark as retired if all lost
          } as any
        })
      } else if (returnCondition === "DAMAGED" || returnCondition === "NEEDS_REPAIR") {
        // Damaged items: reduce allocated, but don't make available (needs repair)
        newAllocatedQuantity = Math.max(0, currentAllocated - quantityToReduce)
        assetStatus = AssetStatus.MAINTENANCE
        await tx.asset.update({
          where: { id: request.assetId },
          data: {
            allocatedQuantity: newAllocatedQuantity,
            status: assetStatus
          } as any
        })
      } else {
        // Functional/Good returns: reduce allocated, make available
        newAllocatedQuantity = Math.max(0, currentAllocated - quantityToReduce)
        const totalQuantity = request.asset.quantity ?? 1
        const availableQuantity = totalQuantity - newAllocatedQuantity
        
        await tx.asset.update({
          where: { id: request.assetId },
          data: {
            allocatedQuantity: newAllocatedQuantity,
            allocatedTo: newAllocatedQuantity > 0 ? request.requestedBy : null, // Clear if all returned
            status: availableQuantity > 0 ? AssetStatus.AVAILABLE : AssetStatus.ALLOCATED
          } as any
        })
      }

      // Notifications will be created outside the transaction to avoid timeout
      return req
    }, {
      maxWait: 10000, // Maximum time to wait for a transaction slot (10 seconds)
      timeout: 15000, // Maximum time the transaction can run (15 seconds)
    })

    // Create notification for officers/admins about the return (outside transaction)
    const officers = await prisma.user.findMany({
      where: {
        role: {
          in: ["DEPARTMENTAL_OFFICER", "FACULTY_ADMIN"]
        }
      },
      select: { id: true }
    })

    // Create notifications in batch (non-blocking)
    if (officers.length > 0) {
      const requestedQuantity = request.requestedQuantity ?? 1
      prisma.notification.createMany({
        data: officers.map(officer => ({
          userId: officer.id,
          type: "ASSET_RETURNED",
          title: "Asset Returned",
          message: `${request.requestedByUser.name} returned ${requestedQuantity} unit(s) of "${request.asset.name}". Condition: ${returnCondition}`,
          relatedRequestId: id,
          relatedAssetId: request.assetId
        }))
      }).catch(err => {
        console.error("Error creating return notifications:", err)
      })
    }

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error returning asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

