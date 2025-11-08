import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        asset: {
          select: {
            id: true,
            name: true,
            assetCode: true,
            type: true,
            category: true,
            serialNumber: true,
            manufacturer: true,
            model: true,
            location: true,
            room: true
          }
        },
        fromUser: {
          select: {
            name: true,
            email: true,
            department: true,
            employeeId: true
          }
        },
        toUser: {
          select: {
            name: true,
            email: true,
            department: true,
            employeeId: true
          }
        },
        approvals: {
          include: {
            approvedByUser: {
              select: {
                name: true,
                email: true,
                employeeId: true
              }
            }
          },
          orderBy: { approvedAt: "desc" },
          take: 1
        }
      }
    })

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 })
    }

    // Users can only view receipts for transfers they're involved in
    const transferWithInit = transfer as typeof transfer & { initiatedBy?: string; receiptNumber?: string; receiptGeneratedAt?: Date; transferType?: string }
    if (session.user.role !== "FACULTY_ADMIN" && 
        transfer.fromUserId !== session.user.id && 
        transfer.toUserId !== session.user.id &&
        transferWithInit.initiatedBy !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    if (transfer.status !== "COMPLETED" && transfer.status !== "APPROVED") {
      return NextResponse.json({ error: "Transfer receipt can only be generated for completed transfers" }, { status: 400 })
    }

    return NextResponse.json({
      receipt: {
        receiptNumber: transferWithInit.receiptNumber || `TRF-${transfer.id.substring(0, 8).toUpperCase()}`,
        generatedAt: transferWithInit.receiptGeneratedAt || transfer.completedAt,
        transferDate: transfer.completedAt || transfer.approvedAt,
        transferType: transferWithInit.transferType,
        status: transfer.status
      },
      asset: transfer.asset,
      fromUser: transfer.fromUser,
      toUser: transfer.toUser,
      initiatedBy: transferWithInit.initiatedBy ? {
        id: transferWithInit.initiatedBy,
        name: "Officer",
        email: "",
        employeeId: null
      } : null,
      approvedBy: transfer.approvals[0]?.approvedByUser || null,
      reason: transfer.reason,
      notes: transfer.notes,
      requestedAt: transfer.requestedAt,
      approvedAt: transfer.approvedAt,
      completedAt: transfer.completedAt
    })
  } catch (error) {
    console.error("Error fetching transfer receipt:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

