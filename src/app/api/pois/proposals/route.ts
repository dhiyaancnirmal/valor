import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getWorldIdRequirementStatus, WORLD_ID_COOKIE_NAME } from "@/lib/world-id"
import { createPoiProposal } from "@/services/pois/service"
import { parseProposalPayload } from "@/services/pois/validation"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const walletAddress = session?.user?.walletAddress

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const worldIdStatus = getWorldIdRequirementStatus(request.cookies.get(WORLD_ID_COOKIE_NAME)?.value, walletAddress)
    if (worldIdStatus.enabled && !worldIdStatus.verified) {
      return NextResponse.json(
        { error: "World ID verification is required before adding stores." },
        { status: 403 }
      )
    }

    const body = (await request.json()) as Record<string, unknown>
    const parsed = parseProposalPayload(body)
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const result = await createPoiProposal({
      ...parsed.data,
      createdByWallet: walletAddress,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("/api/pois/proposals error", error)
    return NextResponse.json({ error: "Failed to create POI proposal" }, { status: 500 })
  }
}
