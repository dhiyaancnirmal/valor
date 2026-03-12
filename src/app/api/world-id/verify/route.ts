import { NextRequest, NextResponse } from "next/server"
import { type ISuccessResult, type IVerifyResponse, verifyCloudProof } from "@worldcoin/minikit-js"
import { auth } from "@/auth"
import {
  createWorldIdCookieValue,
  getWorldIdConfig,
  getWorldIdCookieOptions,
} from "@/lib/world-id"
import { isWorldDevBypassEnabled } from "@/lib/world-dev"

type VerifyBody = {
  payload?: Partial<ISuccessResult> | null
  signal?: string
  proof?: string
  merkle_root?: string
  nullifier_hash?: string
  verification_level?: string
  action?: string
}

function isSuccessResultPayload(payload: Partial<ISuccessResult> | null | undefined): payload is ISuccessResult {
  return Boolean(
    payload
    && typeof payload.proof === "string"
    && typeof payload.merkle_root === "string"
    && typeof payload.nullifier_hash === "string"
    && typeof payload.verification_level === "string"
  )
}

function normalizeVerificationPayload(body: VerifyBody): ISuccessResult | null {
  if (isSuccessResultPayload(body.payload)) {
    return body.payload
  }

  if (
    typeof body.proof === "string"
    && typeof body.merkle_root === "string"
    && typeof body.nullifier_hash === "string"
    && typeof body.verification_level === "string"
  ) {
    return {
      proof: body.proof,
      merkle_root: body.merkle_root,
      nullifier_hash: body.nullifier_hash,
      verification_level: body.verification_level as ISuccessResult["verification_level"],
    }
  }

  return null
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
  const verificationPayload = normalizeVerificationPayload(body)
  if (!verificationPayload) {
    return NextResponse.json({ error: "Missing World ID proof payload" }, { status: 400 })
  }
  const action = body.action?.trim() || config.action

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
          action,
        }),
        getWorldIdCookieOptions()
      )

      return response
    }

    const providerPayload = await verifyCloudProof(
      verificationPayload,
      config.appId,
      action,
      body.signal
    ) as IVerifyResponse

    if (!providerPayload.success) {
      console.error("World ID provider rejected proof", {
        status: 400,
        appId: config.appId,
        action,
        verificationLevel: verificationPayload.verification_level,
        payload: providerPayload,
      })

      return NextResponse.json(
        {
          error: providerPayload.detail || providerPayload.code || "World ID verification failed",
          providerStatus: 400,
          providerPayload,
        },
        { status: 400 }
      )
    }

    const response = NextResponse.json({
      success: true,
      verified: true,
      providerResponse: providerPayload,
    })

    response.cookies.set(
      "valor_world_id_verified",
      createWorldIdCookieValue({
        walletAddress,
        verifiedAt: Date.now(),
        action,
      }),
      getWorldIdCookieOptions()
    )

    return response
  } catch (error) {
    console.error("World ID 4.0 verification failed", error)
    return NextResponse.json({ error: "World ID verification failed" }, { status: 500 })
  }
}
