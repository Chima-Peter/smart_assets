import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { hasPermission } from "@/lib/rbac"
import { UserRole, AssetType, AssetStatus } from "@/lib/prisma/enums"
import { z } from "zod"
import { logActivity } from "@/lib/activity-log"

const assetSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  assetCode: z.string().min(1),
  type: z.nativeEnum(AssetType),
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
  quantity: z.number().int().min(0).optional(),
  minStockLevel: z.number().int().min(0).optional(),
  unit: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type")
    const status = searchParams.get("status")
    const role = session.user.role

    // Course Rep can only view available consumables and teaching aids
    if (role === UserRole.COURSE_REP) {
      const assets = await prisma.asset.findMany({
        where: {
          status: AssetStatus.AVAILABLE,
          type: {
            in: [AssetType.CONSUMABLE, AssetType.TEACHING_AID]
          },
          ...(type ? { type: type as AssetType } : {})
        },
        include: {
          registeredByUser: {
            select: { name: true, email: true }
          }
        }
      })
      return NextResponse.json(assets)
    }

    // Other roles can see more
    const where: {
      type?: AssetType
      status?: AssetStatus
      allocatedTo?: string
    } = {}
    if (type) where.type = type as AssetType
    if (status) where.status = status as AssetStatus
    
    // Lecturers can only see assets allocated to them when status is ALLOCATED
    if (role === UserRole.LECTURER && status === AssetStatus.ALLOCATED) {
      where.allocatedTo = session.user.id
    }

    const assets = await prisma.asset.findMany({
      where,
      include: {
        registeredByUser: {
          select: { name: true, email: true }
        },
        allocatedToUser: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(assets)
  } catch (error) {
    console.error("Error fetching assets:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!hasPermission(session.user.role, "REGISTER_ASSETS")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json()
    const data = assetSchema.parse(body)

    // Check if asset code already exists
    const existing = await prisma.asset.findUnique({
      where: { assetCode: data.assetCode }
    })

    if (existing) {
      return NextResponse.json({ error: "Asset code already exists" }, { status: 400 })
    }

           const asset = await prisma.asset.create({
             data: {
               ...data,
               purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
               expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
               documentUrls: data.documentUrls ? JSON.stringify(data.documentUrls) : null,
               quantity: data.type === AssetType.CONSUMABLE ? (data.quantity ?? null) : null,
               minStockLevel: data.type === AssetType.CONSUMABLE ? (data.minStockLevel ?? null) : null,
               unit: data.type === AssetType.CONSUMABLE ? (data.unit ?? null) : null,
               registeredBy: session.user.id,
               status: data.allocatedTo ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE
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

           // Log activity
           await logActivity({
             userId: session.user.id,
             action: "CREATE",
             entityType: "ASSET",
             entityId: asset.id,
             description: `Registered new asset: ${asset.name} (${asset.assetCode})`,
           })

           return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 })
    }
    console.error("Error creating asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

