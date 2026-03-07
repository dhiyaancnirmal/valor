import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getMapMetricsSnapshot, resetMapMetrics } from "@/services/maps/runtime-cache"

export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const session = await auth()
  const allowAnonymous = process.env.NODE_ENV !== "production"
  if (!session?.user?.walletAddress && !allowAnonymous) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (allowAnonymous && request.nextUrl.searchParams.get("reset") === "1") {
    resetMapMetrics()
  }

  return NextResponse.json(getMapMetricsSnapshot())
}
