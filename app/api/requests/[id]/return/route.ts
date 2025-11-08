import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { RequestStatus, AssetStatus } from "@/lib/prisma/enums"

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const request = await prisma.request.findUnique({
      where: { id: params.id },
      include: { asset: true }
    })

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    if (request.requestedBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (request.status !== RequestStatus.FULFILLED) {
      return NextResponse.json({ error: "Request is not fulfilled" }, { status: 400 })
    }

    const updatedRequest = await prisma.$transaction(async (tx) => {
      const req = await tx.request.update({
        where: { id: params.id },
        data: {
          status: RequestStatus.RETURNED,
          returnedAt: new Date()
        }
      })

      await tx.asset.update({
        where: { id: request.assetId },
        data: {
          status: AssetStatus.AVAILABLE,
          allocatedTo: null
        }
      })

      return req
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    console.error("Error returning asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

