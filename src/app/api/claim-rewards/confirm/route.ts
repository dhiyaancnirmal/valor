import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/**
 * Confirm reward claim after transaction is submitted
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { transactionId, rewardIds } = await request.json()

    if (!transactionId || !rewardIds || !Array.isArray(rewardIds)) {
      return NextResponse.json(
        { error: "Missing transactionId or rewardIds" },
        { status: 400 }
      )
    }

    // Update database to mark as paid
    // Note: We mark as paid optimistically. In production, you might want to
    // verify the transaction status first using the Developer Portal API
    const { error: updateError } = await supabaseAdmin
      .from("reward_transactions")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        payout_tx_hash: transactionId,
      })
      .in("id", rewardIds)

    if (updateError) {
      console.error("Error updating transactions:", updateError)
      return NextResponse.json(
        { error: "Failed to update transactions" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Confirm claim error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to confirm claim" },
      { status: 500 }
    )
  }
}

