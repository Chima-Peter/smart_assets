import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { RequestStatus, AssetStatus } from "@/lib/prisma/enums"
import { z } from "zod"

const verifySchema = z.object({
  verifiedCondition: z.enum(["FUNCTIONAL", "DAMAGED", "LOST", "NEEDS_REPAIR", "GOOD", "FAIR"]),
  verificationNotes: z.string().optional(),
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

    if (!hasPermission(session.user.role, "VERIFY_RETURNS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { verifiedCondition, verificationNotes } = verifySchema.parse(body)

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

    if (request.status !== RequestStatus.RETURNED) {
      return NextResponse.json({ error: "Request is not in returned status" }, { status: 400 })
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const req = await tx.request.update({
        where: { id },
        data: {
          verifiedBy: session.user.id,
          verifiedAt: new Date(),
          returnCondition: verifiedCondition,
          returnNotes: verificationNotes || request.returnNotes
        },
        include: {
          requestedByUser: {
            select: { name: true, email: true }
          },
          asset: true
        }
      })

      // Update asset status based on verified condition
      let assetStatus: AssetStatus = AssetStatus.AVAILABLE
      if (verifiedCondition === "DAMAGED" || verifiedCondition === "NEEDS_REPAIR") {
        assetStatus = AssetStatus.MAINTENANCE
      } else if (verifiedCondition === "LOST") {
        assetStatus = AssetStatus.RETIRED
      }

      await tx.asset.update({
        where: { id: request.assetId },
        data: {
          status: assetStatus
        }
      })

      // Notify requester about verification
      await tx.notification.create({
        data: {
          userId: request.requestedBy,
          type: "RETURN_VERIFIED",
          title: "Return Verified",
          message: `Your return of "${request.asset.name}" has been verified. Condition: ${verifiedCondition}`,
          relatedRequestId: id
        }
      })

      return req
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error verifying return:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

