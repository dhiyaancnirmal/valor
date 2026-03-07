import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { getMyPoiProposals } from "@/services/pois/service"

export const runtime = "nodejs"

export async function GET() {
  try {
    const session = await auth()
    const walletAddress = session?.user?.walletAddress

    if (!walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const proposals = await getMyPoiProposals(walletAddress)
    return NextResponse.json({ proposals })
  } catch (error) {
    console.error("/api/pois/proposals/mine error", error)
    return NextResponse.json({ error: "Failed to fetch POI proposals" }, { status: 500 })
  }
}
