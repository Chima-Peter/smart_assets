import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { UserRole, RequestStatus } from "@/lib/prisma/enums"
import { z } from "zod"

const updateRequestSchema = z.object({
  purpose: z.string().optional(),
  notes: z.string().optional(),
}).strict()

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const request = await prisma.request.findUnique({
      where: { id },
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
      }
    })

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Lecturers can only see their own requests
    if (session.user.role === UserRole.LECTURER && request.requestedBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(request)
  } catch (error) {
    console.error("Error fetching request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(
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
    const data = updateRequestSchema.parse(body)

    const request = await prisma.request.findUnique({
      where: { id }
    })

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Only lecturers can update their own pending requests
    if (session.user.role === UserRole.LECTURER) {
      if (request.requestedBy !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (request.status !== RequestStatus.PENDING) {
        return NextResponse.json({ error: "Can only update pending requests" }, { status: 400 })
      }
    } else {
      // Officers and admins can update any request
      if (request.status !== RequestStatus.PENDING) {
        return NextResponse.json({ error: "Can only update pending requests" }, { status: 400 })
      }
    }

    const updatedRequest = await prisma.request.update({
      where: { id },
      data,
      include: {
        asset: true,
        requestedByUser: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(updatedRequest)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const request = await prisma.request.findUnique({
      where: { id }
    })

    if (!request) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 })
    }

    // Lecturers can only delete their own pending requests
    if (session.user.role === UserRole.LECTURER) {
      if (request.requestedBy !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      if (request.status !== RequestStatus.PENDING) {
        return NextResponse.json({ error: "Can only delete pending requests" }, { status: 400 })
      }
    } else {
      // Officers and admins can delete any pending request
      if (request.status !== RequestStatus.PENDING) {
        return NextResponse.json({ error: "Can only delete pending requests" }, { status: 400 })
      }
    }

    // Delete approvals first
    await prisma.approval.deleteMany({
      where: { requestId: id }
    })

    // Delete request
    await prisma.request.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Request deleted successfully" })
  } catch (error) {
    console.error("Error deleting request:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

