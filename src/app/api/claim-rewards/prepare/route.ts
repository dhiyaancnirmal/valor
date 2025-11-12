import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { stationIdToBytes32, signClaimMessage } from "@/lib/rewards"
import { RewardVaultABI } from "@/lib/abi/RewardVault"

/**
 * Prepare claim transaction data for MiniKit popup
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const walletAddress = session.user.walletAddress as `0x${string}`
    const isDevMode = process.env.NODE_ENV === "development" || request.headers.get("x-dev-mode") === "true"

    // Check if it's past payout time (12:30 AM Buenos Aires = 03:30 UTC)
    if (!isDevMode) {
      const nowUTC = new Date()
      const buenosAiresOffset = -3 * 60 * 60 * 1000
      const buenosAiresTime = new Date(nowUTC.getTime() + buenosAiresOffset)
      const payoutTime = new Date(buenosAiresTime)
      payoutTime.setUTCHours(0, 30, 0, 0)
      
      if (buenosAiresTime < payoutTime) {
        return NextResponse.json(
          { error: "Rewards are not yet available. Payout time is 12:30 AM Buenos Aires." },
          { status: 400 }
        )
      }
    }

    // Get user's unpaid rewards
    const { data: unpaidRewards, error } = await supabaseAdmin
      .from("reward_transactions")
      .select("*")
      .eq("user_wallet_address", walletAddress)
      .eq("paid", false)
      .not("accrued_amount", "is", null)
      .gt("accrued_amount", 0)
      .limit(1) // For now, claim one at a time

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!unpaidRewards || unpaidRewards.length === 0) {
      return NextResponse.json(
        { error: "No rewards available to claim" },
        { status: 400 }
      )
    }

    const rewardContract = process.env.REWARD_CONTRACT_ADDRESS as `0x${string}` | undefined
    const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY as `0x${string}` | undefined

    if (!rewardContract || !signerKey) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      )
    }

    // Prepare transaction for first reward
    const tx = unpaidRewards[0]
    const submissionId = BigInt(tx.submission_id)
    const stationIdBytes32 = stationIdToBytes32(tx.gas_station_id)
    const amount = BigInt(tx.accrued_amount || 0)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60)

    // Sign the claim message
    const signature = await signClaimMessage(
      {
        contract: rewardContract,
        recipient: walletAddress,
        stationIdBytes32,
        submissionId,
        rewardAmount: amount,
        deadline,
      },
      signerKey
    )

    return NextResponse.json({
      transactions: [
        {
          stationIdBytes32,
          submissionId: submissionId.toString(),
          amount: amount.toString(),
          deadline: deadline.toString(),
          signature,
        },
      ],
      rewardIds: [tx.id.toString()],
      abi: RewardVaultABI,
    })
  } catch (error: any) {
    console.error("Prepare claim error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to prepare claim" },
      { status: 500 }
    )
  }
}

