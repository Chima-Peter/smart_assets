import "server-only"
import { prisma } from "./prisma"
import { headers } from "next/headers"

interface LogActivityParams {
  userId?: string
  action: string
  entityType: string
  entityId?: string
  description: string
  metadata?: Record<string, unknown>
}

export async function logActivity(params: LogActivityParams) {
  try {
    const headersList = await headers()
    const ipAddress = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown"
    const userAgent = headersList.get("user-agent") || "unknown"

    await prisma.activityLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        description: params.description,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // Don't throw - activity logging should not break the main flow
    console.error("Error logging activity:", error)
  }
}

