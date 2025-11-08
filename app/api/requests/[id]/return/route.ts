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
    })

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

      // Update asset status based on condition
      let assetStatus = AssetStatus.AVAILABLE
      if (returnCondition === "DAMAGED" || returnCondition === "NEEDS_REPAIR") {
        assetStatus = AssetStatus.MAINTENANCE
      } else if (returnCondition === "LOST") {
        assetStatus = AssetStatus.RETIRED
      }

      await tx.asset.update({
        where: { id: request.assetId },
        data: {
          status: assetStatus,
          allocatedTo: null
        }
      })

      // Create notification for officers/admins about the return
      const officers = await tx.user.findMany({
        where: {
          role: {
            in: ["DEPARTMENTAL_OFFICER", "FACULTY_ADMIN"]
          }
        }
      })

      await Promise.all(
        officers.map(officer =>
          tx.notification.create({
            data: {
              userId: officer.id,
              type: "ASSET_RETURNED",
              title: "Asset Returned",
              message: `${request.requestedByUser.name} returned "${request.asset.name}". Condition: ${returnCondition}`,
              relatedRequestId: id
            }
          })
        )
      )

      return req
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error returning asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

