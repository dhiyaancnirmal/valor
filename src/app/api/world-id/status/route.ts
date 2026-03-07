import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getWorldIdConfig, isWalletVerifiedByCookie, WORLD_ID_COOKIE_NAME } from "@/lib/world-id"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = getWorldIdConfig()
  const rawCookie = request.cookies.get(WORLD_ID_COOKIE_NAME)?.value

  return NextResponse.json({
    enabled: config.enabled,
    verified: isWalletVerifiedByCookie(rawCookie, session.user.walletAddress),
    appId: config.appId,
    action: config.action,
  })
}
