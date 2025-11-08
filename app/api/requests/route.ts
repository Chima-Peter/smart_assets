import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { UserRole, RequestStatus } from "@/lib/prisma/enums"
import { z } from "zod"

const requestSchema = z.object({
  assetId: z.string(),
  purpose: z.string().optional(),
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

    // Lecturers can only see their own requests
    if (session.user.role === UserRole.LECTURER) {
      const requests = await prisma.request.findMany({
        where: {
          requestedBy: session.user.id,
          ...(status ? { status: status as RequestStatus } : {})
        },
        include: {
          asset: true,
          requestedByUser: {
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
      return NextResponse.json(requests)
    }

    // Officers and Admins can see all requests
    const where: {
      status?: RequestStatus
    } = {}
    if (status) where.status = status as RequestStatus

    const requests = await prisma.request.findMany({
      where,
      include: {
        asset: true,
        requestedByUser: {
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

    return NextResponse.json(requests)
  } catch (error) {
    console.error("Error fetching requests:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "CREATE_REQUEST")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = requestSchema.parse(body)

    // Check if asset exists and is available
    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId }
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (asset.status !== "AVAILABLE") {
      return NextResponse.json({ error: "Asset is not available" }, { status: 400 })
    }

    const request = await prisma.request.create({
      data: {
        ...data,
        requestedBy: session.user.id,
        status: RequestStatus.PENDING
      },
      include: {
        asset: true,
        requestedByUser: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(request, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

