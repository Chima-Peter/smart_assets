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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "APPROVE_REQUESTS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const { status, comments } = approveSchema.parse(body)

    const request = await prisma.request.findUnique({
      where: { id: params.id },
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
      const req = await tx.request.update({
        where: { id: params.id },
        data: {
          status: status as RequestStatus,
          approvedAt: new Date(),
        }
      })

      await tx.approval.create({
        data: {
          requestId: params.id,
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

        await tx.request.update({
          where: { id: params.id },
          data: {
            fulfilledAt: new Date()
          }
        })
      }

      return req
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error("Error approving request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

