import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { NextResponse } from "next/server"

type RewardSummaryRow = {
  accrued_amount: string | number | null
  reward_period_date: string
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all unpaid accrued rewards for this user
    const { data, error } = await supabaseAdmin
      .from("reward_transactions")
      .select("accrued_amount, reward_period_date")
      .eq("user_wallet_address", session.user.walletAddress)
      .eq("paid", false)
      .not("accrued_amount", "is", null)

    if (error) {
      console.error("Error fetching rewards:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Filter to only claimable rewards (from days that have ended)
    // Rewards become claimable after 12:00 AM UTC the day after they were earned
    const nowUTC = new Date()
    const currentUTCDate = nowUTC.toISOString().split('T')[0] // YYYY-MM-DD
    
    const rewardRows = (data ?? []) as RewardSummaryRow[]

    const claimableRewards = rewardRows.filter(tx => {
      const rewardDate = tx.reward_period_date // YYYY-MM-DD format
      // Only include rewards from days that have ended (before today)
      return rewardDate < currentUTCDate
    })

    const totalAccrued = claimableRewards.reduce((sum, row) => {
      return sum + BigInt(row.accrued_amount || 0)
    }, 0n)

    // Convert to USDC (6 decimals)
    const totalUSDC = Number(totalAccrued) / 1_000_000

    return NextResponse.json({
      totalAccrued: totalAccrued.toString(),
      totalUSDC,
      submissionCount: claimableRewards.length,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
