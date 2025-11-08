import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { z } from "zod"
import { AssetType, AssetStatus } from "@/lib/prisma/enums"
import type { AssetUncheckedUpdateInput } from "@/lib/prisma/models/Asset"
import { logActivity } from "@/lib/activity-log"

const updateAssetSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  type: z.nativeEnum(AssetType).optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  category: z.string().optional(),
  assetCategory: z.enum(["RETURNABLE", "CONSUMABLE", "EXPIRABLE"]).optional(),
  location: z.string().optional(),
  room: z.string().optional(),
  purchaseDate: z.string().optional(),
  purchasePrice: z.number().optional(),
  serialNumber: z.string().optional(),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
  expiryDate: z.string().optional(),
  documentUrls: z.array(z.string().url()).optional(),
  allocatedTo: z.string().optional(),
  isArchived: z.boolean().optional(),
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
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        registeredByUser: {
          select: { name: true, email: true }
        },
        allocatedToUser: {
          select: { name: true, email: true }
        }
      }
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    console.error("Error fetching asset:", error)
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

    if (!hasPermission(session.user.role, "REGISTER_ASSETS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const data = updateAssetSchema.parse(body)

    // Check if asset exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id }
    })

    if (!existingAsset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Prepare update data
    const updateData: Partial<AssetUncheckedUpdateInput> = {}
    if (data.name) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.type) updateData.type = data.type
    if (data.status) updateData.status = data.status
    if (data.category !== undefined) updateData.category = data.category
    if (data.assetCategory) updateData.assetCategory = data.assetCategory
    if (data.location !== undefined) updateData.location = data.location
    if (data.room !== undefined) updateData.room = data.room
    if (data.purchaseDate) {
      updateData.purchaseDate = new Date(data.purchaseDate)
    }
    if (data.purchasePrice !== undefined) updateData.purchasePrice = data.purchasePrice
    if (data.serialNumber !== undefined) updateData.serialNumber = data.serialNumber
    if (data.manufacturer !== undefined) updateData.manufacturer = data.manufacturer
    if (data.model !== undefined) updateData.model = data.model
    if (data.expiryDate) {
      updateData.expiryDate = new Date(data.expiryDate)
    }
    if (data.documentUrls) {
      updateData.documentUrls = JSON.stringify(data.documentUrls)
    }
    if (data.allocatedTo !== undefined) updateData.allocatedTo = data.allocatedTo || null
    if (data.isArchived !== undefined) {
      updateData.isArchived = data.isArchived
      if (data.isArchived && !existingAsset.isArchived) {
        updateData.archivedAt = new Date()
      } else if (!data.isArchived) {
        updateData.archivedAt = null
      }
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: updateData,
      include: {
        registeredByUser: {
          select: { name: true, email: true }
        },
        allocatedToUser: {
          select: { name: true, email: true }
        }
      }
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "ASSET",
      entityId: id,
      description: `Updated asset: ${asset.name}`,
    })

    return NextResponse.json(asset)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating asset:", error)
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

    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id }
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    // Check if asset is allocated or has pending requests/transfers
    if (asset.status === AssetStatus.ALLOCATED || asset.status === AssetStatus.TRANSFER_PENDING) {
      return NextResponse.json({ 
        error: "Cannot delete asset that is allocated or has pending transfers" 
      }, { status: 400 })
    }

    // Check for pending requests
    const pendingRequests = await prisma.request.count({
      where: {
        assetId: id,
        status: "PENDING"
      }
    })

    if (pendingRequests > 0) {
      return NextResponse.json({ 
        error: "Cannot delete asset with pending requests" 
      }, { status: 400 })
    }

    // Log activity before deletion
    await logActivity({
      userId: session.user.id,
      action: "DELETE",
      entityType: "ASSET",
      entityId: id,
      description: `Deleted asset: ${asset.name} (${asset.assetCode})`,
    })

    // Delete asset
    await prisma.asset.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Asset deleted successfully" })
  } catch (error) {
    console.error("Error deleting asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

