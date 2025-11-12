import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { stationIdToBytes32, signClaimMessage } from "@/lib/rewards"
import { RewardVaultABI } from "@/lib/abi/RewardVault"

/**
 * User-facing claim rewards API
 * Allows users to claim their accrued rewards after payout time
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
    // Or allow in dev mode
    if (!isDevMode) {
      const nowUTC = new Date()
      const buenosAiresOffset = -3 * 60 * 60 * 1000 // -3 hours
      const buenosAiresTime = new Date(nowUTC.getTime() + buenosAiresOffset)
      
      // Check if it's past 12:30 AM Buenos Aires today
      const payoutTime = new Date(buenosAiresTime)
      payoutTime.setUTCHours(0, 30, 0, 0) // 12:30 AM BA = 00:30 in BA time
      
      if (buenosAiresTime < payoutTime) {
        // It's before payout time, check if we're processing yesterday's rewards
        const yesterday = new Date(buenosAiresTime)
        yesterday.setUTCDate(yesterday.getUTCDate() - 1)
        yesterday.setUTCHours(0, 0, 0, 0)
        
        const year = yesterday.getUTCFullYear()
        const month = String(yesterday.getUTCMonth() + 1).padStart(2, '0')
        const day = String(yesterday.getUTCDate()).padStart(2, '0')
        const yesterdayDate = `${year}-${month}-${day}`
        
        // Check if user has rewards from yesterday
        const { count: yesterdayCount } = await supabaseAdmin
          .from("reward_transactions")
          .select("*", { count: "exact", head: true })
          .eq("user_wallet_address", walletAddress)
          .eq("reward_period_date", yesterdayDate)
          .eq("paid", false)
          .gt("accrued_amount", 0)
        
        if (!yesterdayCount || yesterdayCount === 0) {
          return NextResponse.json(
            { error: "Rewards are not yet available. Payout time is 12:30 AM Buenos Aires." },
            { status: 400 }
          )
        }
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

    // Setup contract interaction
    const rewardContract = process.env.REWARD_CONTRACT_ADDRESS as `0x${string}` | undefined
    const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY as `0x${string}` | undefined
    const deployerKey = process.env.PRIVATE_KEY as `0x${string}` | undefined
    const rpcUrl = process.env.WORLD_CHAIN_RPC_URL || "https://worldchain-mainnet.g.alchemy.com/v2/vJp-om_ZDiQBX0HAzO5F2"

    if (!rewardContract || !signerKey || !deployerKey) {
      return NextResponse.json(
        { error: "Missing required environment variables" },
        { status: 500 }
      )
    }

    // Prepare batch payout data for this user
    const recipients: `0x${string}`[] = []
    const stationIds: `0x${string}`[] = []
    const submissionIds: bigint[] = []
    const amounts: bigint[] = []
    const deadlines: bigint[] = []
    const signatures: `0x${string}`[] = []
    const transactionIds: string[] = []

    // Deadline: 24 hours from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60)

    // Sign and prepare each transaction
    for (const tx of unpaidRewards) {
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

        recipients.push(walletAddress)
        stationIds.push(stationIdBytes32)
        submissionIds.push(submissionId)
        amounts.push(amount)
        deadlines.push(deadline)
        signatures.push(signature)
        transactionIds.push(tx.id.toString())
      } catch (err) {
        console.error(`Error preparing transaction ${tx.id}:`, err)
        continue
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json(
        { error: "Failed to prepare rewards for claiming" },
        { status: 500 }
      )
    }

    // Call batchPayout on the contract
    const account = privateKeyToAccount(deployerKey)
    const client = createWalletClient({
      account,
      chain: {
        id: 480,
        name: "World Chain",
        network: "worldchain",
        nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [rpcUrl] } },
      },
      transport: http(rpcUrl),
    })

    console.log(`Calling batchPayout for ${recipients.length} rewards`)

    const txHash = await client.writeContract({
      address: rewardContract,
      abi: RewardVaultABI,
      functionName: "batchPayout",
      args: [recipients, stationIds, submissionIds, amounts, deadlines, signatures],
    })

    console.log(`Batch payout transaction: ${txHash}`)

    // Update database to mark as paid
    const { error: updateError } = await supabaseAdmin
      .from("reward_transactions")
      .update({
        paid: true,
        paid_at: new Date().toISOString(),
        payout_tx_hash: txHash,
      })
      .in("id", transactionIds)

    if (updateError) {
      console.error("Error updating transactions:", updateError)
      // Don't fail the request - transaction already went through
    }

    const totalAmount = amounts.reduce((sum, amt) => sum + amt, 0n)
    const totalUSDC = Number(totalAmount) / 1_000_000

    return NextResponse.json({
      success: true,
      message: "Rewards claimed successfully",
      txHash,
      totalAmount: totalAmount.toString(),
      totalUSDC,
      rewardCount: recipients.length,
    })
  } catch (error: any) {
    console.error("Claim rewards error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to claim rewards" },
      { status: 500 }
    )
  }
}

