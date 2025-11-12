import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: NextRequest) {
  try {
    const { stationIds } = await request.json()

    if (!Array.isArray(stationIds) || stationIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid station IDs" },
        { status: 400 }
      )
    }

    // Get current UTC day
    const currentUTCDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const startOfDay = new Date(currentUTCDate + 'T00:00:00.000Z')
    const endOfDay = new Date(currentUTCDate + 'T23:59:59.999Z')

    const stationData: Record<string, {
      submissionCount: number
      potentialEarning: number
      latestPrice?: number
      latestFuelType?: string
      priceUpdatedAt?: string
    }> = {}

    // Process each station
    for (const stationId of stationIds) {
      // Get submission count for today
      const { count } = await supabaseAdmin
        .from("price_submissions")
        .select("*", { count: "exact", head: true })
        .eq("gas_station_id", stationId)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())

      const submissionCount = count || 0

      // Calculate potential earning (0.50 USDC split among submissions + 1 for the user)
      const rewardPool = 0.50
      const potentialEarning = rewardPool / (submissionCount + 1)

      // Get latest price submission for this station
      const { data: latestSubmission } = await supabaseAdmin
        .from("price_submissions")
        .select("price, fuel_type, created_at")
        .eq("gas_station_id", stationId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      stationData[stationId] = {
        submissionCount,
        potentialEarning: parseFloat(potentialEarning.toFixed(3)),
        latestPrice: latestSubmission?.price ? parseFloat(latestSubmission.price) : undefined,
        latestFuelType: latestSubmission?.fuel_type || undefined,
        priceUpdatedAt: latestSubmission?.created_at || undefined,
      }
    }

    return NextResponse.json({
      success: true,
      stationData,
    })
  } catch (error) {
    console.error("Error fetching station submissions:", error)
    return NextResponse.json(
      { error: "Failed to fetch station data" },
      { status: 500 }
    )
  }
}
