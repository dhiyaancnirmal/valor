import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  createWorldIdCookieValue,
  getWorldIdConfig,
  getWorldIdCookieOptions,
} from "@/lib/world-id"
import { isWorldDevBypassEnabled } from "@/lib/world-dev"

type VerifyBody = {
  proof?: string
  merkle_root?: string
  nullifier_hash?: string
  verification_level?: string
  action?: string
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const walletAddress = session?.user?.walletAddress
  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = getWorldIdConfig()
  if (!config.enabled || !config.appId) {
    return NextResponse.json({ error: "World ID is not configured" }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as VerifyBody
  if (!body.proof || !body.merkle_root || !body.nullifier_hash || !body.verification_level) {
    return NextResponse.json({ error: "Missing World ID proof payload" }, { status: 400 })
  }

  try {
    if (isWorldDevBypassEnabled) {
      const response = NextResponse.json({
        success: true,
        verified: true,
        providerResponse: { success: true, mode: "dev-bypass" },
      })

      response.cookies.set(
        "valor_world_id_verified",
        createWorldIdCookieValue({
          walletAddress,
          verifiedAt: Date.now(),
          action: body.action || config.action,
        }),
        getWorldIdCookieOptions()
      )

      return response
    }

    const verifyResponse = await fetch(`https://developer.worldcoin.org/api/v2/verify/${config.appId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        proof: body.proof,
        merkle_root: body.merkle_root,
        nullifier_hash: body.nullifier_hash,
        verification_level: body.verification_level,
        action: body.action || config.action,
      }),
      cache: "no-store",
    })

    const payload = (await verifyResponse.json().catch(() => null)) as
      | {
          success?: boolean
          code?: string
          detail?: string
          attribute?: string | null
          [key: string]: unknown
        }
      | null

    if (!verifyResponse.ok || !payload?.success) {
      console.error("World ID provider rejected proof", {
        status: verifyResponse.status,
        appId: config.appId,
        action: body.action || config.action,
        verificationLevel: body.verification_level,
        payload,
      })

      return NextResponse.json(
        {
          error: payload?.detail || payload?.code || "World ID verification failed",
          providerStatus: verifyResponse.status,
          providerPayload: payload,
        },
        { status: verifyResponse.status || 400 }
      )
    }

    const response = NextResponse.json({
      success: true,
      verified: true,
      providerResponse: payload,
    })

    response.cookies.set(
      "valor_world_id_verified",
      createWorldIdCookieValue({
          walletAddress,
          verifiedAt: Date.now(),
          action: body.action || config.action,
        }),
        getWorldIdCookieOptions()
      )

    return response
  } catch (error) {
    console.error("World ID 4.0 verification failed", error)
    return NextResponse.json({ error: "World ID verification failed" }, { status: 500 })
  }
}
