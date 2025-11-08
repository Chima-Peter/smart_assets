import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { AssetType } from "@/lib/prisma/enums"
import { z } from "zod"
import { logActivity } from "@/lib/activity-log"

const updateQuantitySchema = z.object({
  assetId: z.string(),
  quantity: z.number().int().min(0),
  operation: z.enum(["SET", "ADD", "SUBTRACT"]).optional().default("SET"),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const lowStock = searchParams.get("lowStock") === "true"

    const where: {
      type: AssetType
      quantity?: { lte: number }
    } = {
      type: AssetType.CONSUMABLE,
    }

    if (lowStock) {
      // Find consumables where quantity <= minStockLevel
      const assets = await prisma.asset.findMany({
        where: {
          type: AssetType.CONSUMABLE,
          quantity: { not: null },
          minStockLevel: { not: null },
        },
        include: {
          registeredByUser: {
            select: { name: true, email: true },
          },
        },
      })

      const lowStockAssets = assets.filter((asset) => {
        if (!asset.quantity || !asset.minStockLevel) return false
        return asset.quantity <= asset.minStockLevel
      })

      return NextResponse.json(lowStockAssets)
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        registeredByUser: {
          select: { name: true, email: true },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error("Error fetching inventory:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "MANAGE_CONSUMABLES") && !hasPermission(session.user.role, "UPDATE_CONSUMABLE_QUANTITIES")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = updateQuantitySchema.parse(body)

    const asset = await prisma.asset.findUnique({
      where: { id: data.assetId },
    })

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 })
    }

    if (asset.type !== AssetType.CONSUMABLE) {
      return NextResponse.json({ error: "Only consumables can have quantity updated" }, { status: 400 })
    }

    let newQuantity = data.quantity
    if (data.operation === "ADD") {
      newQuantity = (asset.quantity || 0) + data.quantity
    } else if (data.operation === "SUBTRACT") {
      newQuantity = Math.max(0, (asset.quantity || 0) - data.quantity)
    }

    const updated = await prisma.asset.update({
      where: { id: data.assetId },
      data: { quantity: newQuantity },
      include: {
        registeredByUser: {
          select: { name: true, email: true },
        },
      },
    })

    // Check if stock is low and create notification
    if (updated.minStockLevel && newQuantity <= updated.minStockLevel) {
      const officers = await prisma.user.findMany({
        where: {
          role: { in: ["DEPARTMENTAL_OFFICER", "FACULTY_ADMIN"] },
        },
      })

      await Promise.all(
        officers.map((officer) =>
          prisma.notification.create({
            data: {
              userId: officer.id,
              type: "STOCK_LOW",
              title: "Low Stock Alert",
              message: `${asset.name} stock is low (${newQuantity} ${asset.unit || "units"} remaining). Minimum: ${updated.minStockLevel}`,
              relatedAssetId: asset.id,
            },
          })
        )
      )
    }

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: "UPDATE",
      entityType: "ASSET",
      entityId: asset.id,
      description: `Updated ${asset.name} quantity to ${newQuantity} ${asset.unit || "units"}`,
      metadata: {
        previousQuantity: asset.quantity,
        newQuantity,
        operation: data.operation,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error updating inventory:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

