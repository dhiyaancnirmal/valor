import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  createWorldIdCookieValue,
  getWorldIdConfig,
  getWorldIdCookieOptions,
} from "@/lib/world-id"

type VerifyBody = {
  idkitResponse?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const walletAddress = session?.user?.walletAddress
  if (!walletAddress) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const config = getWorldIdConfig()
  if (!config.enabled || !config.rpId) {
    return NextResponse.json({ error: "World ID is not configured" }, { status: 503 })
  }

  const body = (await request.json().catch(() => ({}))) as VerifyBody
  if (!body.idkitResponse) {
    return NextResponse.json({ error: "Missing World ID response" }, { status: 400 })
  }

  try {
    const verifyResponse = await fetch(`https://developer.world.org/api/v4/verify/${config.rpId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.idkitResponse),
      cache: "no-store",
    })

    const payload = (await verifyResponse.json().catch(() => null)) as
      | {
          success?: boolean
          results?: Array<{ code?: string; detail?: string }>
          [key: string]: unknown
        }
      | null

    const codes = Array.isArray(payload?.results) ? payload.results.map((item) => item.code) : []
    const alreadyVerified = codes.includes("already_verified")

    if (!verifyResponse.ok && !alreadyVerified) {
      return NextResponse.json(payload ?? { error: "World ID verification failed" }, { status: verifyResponse.status })
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
        action: config.action,
      }),
      getWorldIdCookieOptions()
    )

    return response
  } catch (error) {
    console.error("World ID 4.0 verification failed", error)
    return NextResponse.json({ error: "World ID verification failed" }, { status: 500 })
  }
}
