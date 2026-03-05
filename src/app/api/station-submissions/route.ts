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
      
      // Calculate remaining reward pool for this station today from reward_transactions
      const REWARD_POOL_MICRO = 100000n // 0.1 USDC in 6-decimal smallest units
      let totalAccruedMicro = 0n
      try {
        const { data: rewardTxs } = await supabaseAdmin
          .from("reward_transactions")
          .select("accrued_amount")
          .eq("gas_station_id", stationId)
          .eq("reward_period_date", currentUTCDate)
        
        if (Array.isArray(rewardTxs)) {
          for (const tx of rewardTxs) {
            const amt = tx?.accrued_amount ? BigInt(tx.accrued_amount) : 0n
            totalAccruedMicro += amt
          }
        }
      } catch (e) {
        // If this fails, assume no accrued yet
        totalAccruedMicro = 0n
      }
      
      const remainingMicro = REWARD_POOL_MICRO > totalAccruedMicro ? (REWARD_POOL_MICRO - totalAccruedMicro) : 0n
      const potentialMicro = submissionCount >= 0 ? (remainingMicro / BigInt(submissionCount + 1)) : remainingMicro
      const potentialEarning = Number(potentialMicro) / 1_000_000

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
        latestPrice: latestSubmission?.price ? Number(latestSubmission.price) : undefined,
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
