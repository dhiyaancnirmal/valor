import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Sum all unpaid accrued rewards for this user
    const { data, error } = await supabaseAdmin
      .from("reward_transactions")
      .select("accrued_amount")
      .eq("user_wallet_address", session.user.walletAddress)
      .eq("paid", false)
      .not("accrued_amount", "is", null)

    if (error) {
      console.error("Error fetching rewards:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const totalAccrued = data.reduce((sum, row) => {
      return sum + BigInt(row.accrued_amount || 0)
    }, 0n)

    // Convert to USDC (6 decimals)
    const totalUSDC = Number(totalAccrued) / 1_000_000

    return NextResponse.json({
      totalAccrued: totalAccrued.toString(),
      totalUSDC,
      submissionCount: data.length,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

