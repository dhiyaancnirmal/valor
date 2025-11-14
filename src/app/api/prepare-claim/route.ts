import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { stationIdToBytes32, signClaimMessage } from "@/lib/rewards"
import { RewardVaultABI } from "@/lib/abi/RewardVault"

/**
 * Prepare claim transaction data for MiniKit
 * Returns transaction parameters that can be used with MiniKit.sendTransaction
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const walletAddress = session.user.walletAddress as `0x${string}`
    const isDevMode = process.env.NODE_ENV === "development" || request.headers.get("x-dev-mode") === "true"

    // Get user's unpaid rewards first
    const { data: unpaidRewards, error } = await supabaseAdmin
      .from("reward_transactions")
      .select("*")
      .eq("user_wallet_address", walletAddress)
      .eq("paid", false)
      .not("accrued_amount", "is", null)
      .gt("accrued_amount", 0)

    if (error) {
      console.error("Error fetching unpaid rewards:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!unpaidRewards || unpaidRewards.length === 0) {
      return NextResponse.json(
        { error: "No rewards available to claim" },
        { status: 400 }
      )
    }

    // Filter rewards to only include those from days that have ended (past 12:00 AM UTC)
    // Rewards become claimable once the day they were earned has ended
    // Example: Rewards earned on Nov 13 become claimable at 12:00 AM UTC on Nov 14
    const nowUTC = new Date()
    const currentUTCDate = nowUTC.toISOString().split('T')[0] // YYYY-MM-DD
    
    const claimableRewards = unpaidRewards.filter(tx => {
      // In dev mode, allow all unpaid rewards
      if (isDevMode) return true
      
      const rewardDate = tx.reward_period_date // YYYY-MM-DD format
      
      // Rewards are only claimable if their date is BEFORE today
      // (i.e., the day has ended and we're now in a future day)
      // If rewardDate === currentUTCDate, the day hasn't ended yet, so not claimable
      return rewardDate < currentUTCDate
    })

    if (claimableRewards.length === 0) {
      return NextResponse.json(
        { error: "Rewards are not yet available. Rewards become claimable after 12:00 AM UTC the day after they were earned." },
        { status: 400 }
      )
    }

    // Setup contract interaction
    const rewardContract = process.env.REWARD_CONTRACT_ADDRESS as `0x${string}` | undefined
    const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY as `0x${string}` | undefined

    if (!rewardContract || !signerKey) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      )
    }

    // Prepare transaction data for each reward
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60)
    const transactions = []

    for (const tx of claimableRewards) {
      try {
        const submissionId = BigInt(tx.submission_id)
        const stationIdBytes32 = stationIdToBytes32(tx.gas_station_id)
        const amount = BigInt(tx.accrued_amount || 0)
        
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

        // Prepare transaction for MiniKit
        // Use the full ABI - MiniKit will extract the needed function
        // Convert BigInt values to strings for JSON serialization
        transactions.push({
          address: rewardContract,
          abi: RewardVaultABI,
          functionName: "claimReward",
          args: [
            walletAddress,
            stationIdBytes32,
            submissionId.toString(), // Convert BigInt to string
            amount.toString(), // Convert BigInt to string
            deadline.toString(), // Convert BigInt to string
            signature
          ],
          // Store transaction ID for database update after successful claim
          transactionId: tx.id.toString(),
        })
      } catch (err) {
        console.error(`Error preparing transaction ${tx.id}:`, err)
        continue
      }
    }

    if (transactions.length === 0) {
      return NextResponse.json(
        { error: "Failed to prepare rewards for claiming" },
        { status: 500 }
      )
    }

    const totalAmount = claimableRewards.reduce((sum, tx) => sum + BigInt(tx.accrued_amount || 0), 0n)
    const totalUSDC = Number(totalAmount) / 1_000_000

    return NextResponse.json({
      success: true,
      transactions,
      totalAmount: totalAmount.toString(),
      totalUSDC,
      rewardCount: transactions.length,
      transactionIds: transactions.map(tx => tx.transactionId),
    })
  } catch (error: any) {
    console.error("Prepare claim error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to prepare claim" },
      { status: 500 }
    )
  }
}

