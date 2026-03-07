import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { createOrGetAppleMapsToken, hasAppleMapsConfig } from "@/services/maps/token"
import { getClientIp } from "@/services/maps/http"
import { isRateLimited } from "@/services/maps/runtime-cache"

const TOKEN_RATE_LIMIT_WINDOW_MS = 60_000
const TOKEN_RATE_LIMIT_REQUESTS = 20

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ip = getClientIp(request)
    if (isRateLimited(`maps-token:${ip}`, TOKEN_RATE_LIMIT_REQUESTS, TOKEN_RATE_LIMIT_WINDOW_MS)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 })
    }

    if (!hasAppleMapsConfig()) {
      return NextResponse.json({ error: "Apple Maps is not configured" }, { status: 503 })
    }

    const payload = createOrGetAppleMapsToken()
    return NextResponse.json(payload)
  } catch (error) {
    console.error("/api/maps/token error", error)
    return NextResponse.json({ error: "Failed to create map token" }, { status: 500 })
  }
}
