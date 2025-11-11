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
      const assets = await (prisma.asset.findMany as any)({
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
    // And they must have at least 1 quantity available
    if (role === UserRole.LECTURER && status === AssetStatus.ALLOCATED) {
      where.allocatedTo = session.user.id
      // Ensure lecturer has at least 1 quantity
      // For assets allocated to lecturer, we assume they have the allocatedQuantity
      // We'll filter in the result to ensure allocatedQuantity >= 1
    }

    const assets = await (prisma.asset.findMany as any)({
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

    // For lecturers viewing ALLOCATED assets, filter to only show assets where they have at least 1 quantity
    if (role === UserRole.LECTURER && status === AssetStatus.ALLOCATED) {
      const filteredAssets = assets.filter((asset: any) => {
        // Lecturer must have at least 1 allocated quantity
        const allocatedQty = asset.allocatedQuantity ?? 0
        return allocatedQty >= 1
      })
      return NextResponse.json(filteredAssets)
    }

    return NextResponse.json(assets)
  } catch (error: any) {
    console.error("Error fetching assets:", error)
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      meta: error?.meta
    })
    return NextResponse.json({ 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? error?.message : undefined
    }, { status: 500 })
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

           // Set default quantity to 1 if not specified
           const quantity = data.quantity ?? 1
           const allocatedQuantity = data.allocatedTo ? quantity : 0
           
           // If registered by departmental officer, require faculty admin approval
           // If registered by faculty admin, auto-approve
           const requiresApproval = session.user.role === UserRole.DEPARTMENTAL_OFFICER
           const initialStatus = requiresApproval 
             ? AssetStatus.PENDING_APPROVAL 
             : (data.allocatedTo ? AssetStatus.ALLOCATED : AssetStatus.AVAILABLE)
           
           const asset = await prisma.asset.create({
             data: {
               name: data.name,
               description: data.description ?? null,
               assetCode: data.assetCode,
               type: data.type,
               category: data.category ?? null,
               assetCategory: data.assetCategory ?? null,
               location: data.location ?? null,
               room: data.room ?? null,
               purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
               purchasePrice: data.purchasePrice ?? null,
               serialNumber: data.serialNumber ?? null,
               manufacturer: data.manufacturer ?? null,
               model: data.model ?? null,
               expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
               documentUrls: data.documentUrls ? JSON.stringify(data.documentUrls) : null,
               quantity: quantity,
               allocatedQuantity: allocatedQuantity,
               minStockLevel: data.minStockLevel ?? null,
               unit: data.unit ?? (data.type === AssetType.CONSUMABLE ? "units" : "pieces"),
               registeredBy: session.user.id,
               allocatedTo: data.allocatedTo ?? null,
               status: initialStatus
             } as any,
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
             description: `Registered new asset: ${asset.name} (${asset.assetCode})${requiresApproval ? " - Pending faculty approval" : ""}`,
           })

           // Notify faculty admins if approval is required
           if (requiresApproval) {
             const admins = await prisma.user.findMany({
               where: { role: UserRole.FACULTY_ADMIN },
               select: { id: true }
             })

             await Promise.all(
               admins.map(admin =>
                 prisma.notification.create({
                   data: {
                     userId: admin.id,
                     type: "REQUEST_APPROVED", // Reusing notification type
                     title: "Asset Registration Pending Approval",
                     message: `${session.user.name} registered a new asset "${asset.name}" (${asset.assetCode}). Requires faculty approval.`,
                     relatedAssetId: asset.id
                   }
                 })
               )
             )
           }

           return NextResponse.json(asset, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format Zod validation errors into a readable message
      const errorMessages = error.issues.map(issue => {
        const path = issue.path.join(".")
        return `${path ? `${path}: ` : ""}${issue.message}`
      })
      return NextResponse.json({ 
        error: errorMessages.join("; ") 
      }, { status: 400 })
    }
    console.error("Error creating asset:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

