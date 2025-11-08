import { NextRequest, NextResponse } from "next/server"
import { getSystemConfigBoolean, getSystemConfigNumber, getSystemConfig } from "@/lib/system-config"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const key = searchParams.get("key")
    const type = searchParams.get("type") // "boolean", "number", or "string"

    if (!key) {
      return NextResponse.json({ error: "Key parameter is required" }, { status: 400 })
    }

    let value: string | boolean | number | null

    switch (type) {
      case "boolean":
        value = await getSystemConfigBoolean(key, false)
        break
      case "number":
        value = await getSystemConfigNumber(key, 0)
        break
      default:
        value = await getSystemConfig(key)
    }

    return NextResponse.json({ key, value, type: type || "string" })
  } catch (error) {
    console.error("Error checking system config:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

