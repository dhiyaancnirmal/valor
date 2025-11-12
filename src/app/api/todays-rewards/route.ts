import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function GET(request: NextRequest) {
  try {
    // Get start of today (midnight)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Count successful USDC payouts today (reward_claimed = true)
    const { count, error } = await supabaseAdmin
      .from("price_submissions")
      .select("*", { count: "exact", head: true })
      .eq("reward_claimed", true)
      .gte("reward_claimed_at", todayISO)

    if (error) {
      console.error("Error counting rewards:", error)
      return NextResponse.json({ error: "Failed to fetch rewards data" }, { status: 500 })
    }

    // Calculate remaining rewards
    const DAILY_POOL = 20.00
    const REWARD_PER_SUBMISSION = 0.10
    const payoutsToday = count || 0
    const paidOut = payoutsToday * REWARD_PER_SUBMISSION
    const remaining = Math.max(0, DAILY_POOL - paidOut)

    return NextResponse.json({
      dailyPool: DAILY_POOL,
      rewardPerSubmission: REWARD_PER_SUBMISSION,
      payoutsToday,
      paidOut,
      remaining,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

