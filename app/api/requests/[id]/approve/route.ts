import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { RequestStatus, AssetStatus } from "@/lib/prisma/enums"
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

    if (!hasPermission(session.user.role, "APPROVE_REQUESTS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const { status, comments, issuanceCondition, issuanceNotes } = approveSchema.parse(body)

    const request = await prisma.request.findUnique({
      where: { id },
      include: { asset: true }
    })

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (request.status !== RequestStatus.PENDING) {
      return NextResponse.json({ error: "Request is not pending" }, { status: 400 })
    }

    // Update request and asset status
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
        updateData.issuedBy = session.user.id
        updateData.issuedAt = new Date()
        updateData.fulfilledAt = new Date()
        if (issuanceCondition) updateData.issuanceCondition = issuanceCondition
        if (issuanceNotes) updateData.issuanceNotes = issuanceNotes
      }

      const req = await tx.request.update({
        where: { id },
        data: updateData,
        include: {
          requestedByUser: {
            select: { name: true, email: true }
          },
          issuedByUser: {
            select: { name: true, email: true }
          },
          asset: true
        }
      })

      await tx.approval.create({
        data: {
          requestId: id,
          approvedBy: session.user.id,
          status,
          comments
        }
      })

      if (status === "APPROVED") {
        await tx.asset.update({
          where: { id: request.assetId },
          data: {
            status: AssetStatus.ALLOCATED,
            allocatedTo: request.requestedBy
          }
        })

        // Create notification for requester
        await tx.notification.create({
          data: {
            userId: request.requestedBy,
            type: "REQUEST_APPROVED",
            title: "Asset Request Approved",
            message: `Your request for "${req.asset.name}" has been approved.`,
            relatedRequestId: id
          }
        })
      } else {
        // Create notification for rejection
        await tx.notification.create({
          data: {
            userId: request.requestedBy,
            type: "REQUEST_REJECTED",
            title: "Asset Request Rejected",
            message: `Your request for "${req.asset.name}" has been rejected.${comments ? ` Reason: ${comments}` : ""}`,
            relatedRequestId: id
          }
        })
      }

      return req
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error approving request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

