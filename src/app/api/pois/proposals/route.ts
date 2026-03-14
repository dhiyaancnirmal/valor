import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
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
