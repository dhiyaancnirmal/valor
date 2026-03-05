import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Failed to confirm claim"

/**
 * Confirm claim transaction and update database
 * Called after MiniKit transaction succeeds
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { transactionIds, txHash } = body

    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
      return NextResponse.json(
        { error: "Missing transaction IDs" },
        { status: 400 }
      )
    }

    if (!txHash) {
      return NextResponse.json(
        { error: "Missing transaction hash" },
        { status: 400 }
      )
    }

    // Update database to mark transactions as paid
    const { error: updateError } = await supabaseAdmin
      .from("reward_transactions")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        payout_tx_hash: txHash,
        updated_at: new Date().toISOString(),
      })
      .in("id", transactionIds)
      .eq("user_wallet_address", session.user.walletAddress)
      .eq("paid", false)

    if (updateError) {
      console.error("Error updating transactions:", updateError)
      return NextResponse.json(
        { error: "Failed to update transaction records", details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Claim confirmed successfully",
      txHash,
      transactionCount: transactionIds.length,
    })
  } catch (error: unknown) {
    console.error("Confirm claim error:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
