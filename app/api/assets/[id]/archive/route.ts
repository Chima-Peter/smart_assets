import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "REGISTER_ASSETS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const asset = await prisma.asset.findUnique({
      where: { id }
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (asset.isArchived) {
      return NextResponse.json({ error: "Asset is already archived" }, { status: 400 })
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        isArchived: true,
        archivedAt: new Date()
      },
      include: {
        registeredByUser: {
          select: { name: true, email: true }
        },
        allocatedToUser: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(updatedAsset)
  } catch (error) {
    console.error("Error archiving asset:", error)
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

    if (!hasPermission(session.user.role, "REGISTER_ASSETS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params

    const asset = await prisma.asset.findUnique({
      where: { id }
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (!asset.isArchived) {
      return NextResponse.json({ error: "Asset is not archived" }, { status: 400 })
    }

    const updatedAsset = await prisma.asset.update({
      where: { id },
      data: {
        isArchived: false,
        archivedAt: null
      },
      include: {
        registeredByUser: {
          select: { name: true, email: true }
        },
        allocatedToUser: {
          select: { name: true, email: true }
        }
      }
    })

    return NextResponse.json(updatedAsset)
  } catch (error) {
    console.error("Error unarchiving asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

