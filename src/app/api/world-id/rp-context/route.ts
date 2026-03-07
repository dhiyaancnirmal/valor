import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createRpContext, getWorldIdConfig } from "@/lib/world-id"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = getWorldIdConfig()
  if (!config.enabled) {
    return NextResponse.json({ error: "World ID is not configured" }, { status: 503 })
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { action?: string }
    return NextResponse.json(createRpContext(body.action))
  } catch (error) {
    console.error("Failed to create World ID RP context", error)
    return NextResponse.json({ error: "Failed to create RP context" }, { status: 500 })
  }
}
