import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { createWalletClient, http } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { stationIdToBytes32, signClaimMessage } from "@/lib/rewards"
import { RewardVaultABI } from "@/lib/abi/RewardVault"

/**
 * Batch payout API endpoint
 * Should be called by a cron job at 12:00 AM UTC daily
 * Processes all unpaid rewards from the previous UTC day
 */
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or admin auth
    const authHeader = request.headers.get("authorization")
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get yesterday's UTC date
    const yesterday = new Date()
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    yesterday.setUTCHours(0, 0, 0, 0)
    const yesterdayDate = yesterday.toISOString().split('T')[0]

    console.log(`Processing payouts for date: ${yesterdayDate}`)

    // Get all unpaid transactions from yesterday
    const { data: unpaidTransactions, error } = await supabaseAdmin
      .from("reward_transactions")
      .select("*")
      .eq("reward_period_date", yesterdayDate)
      .eq("paid", false)
      .not("accrued_amount", "is", null)
      .gt("accrued_amount", 0)

    if (error) {
      console.error("Error fetching unpaid transactions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!unpaidTransactions || unpaidTransactions.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unpaid transactions found",
        payoutDate: yesterdayDate,
        totalUsers: 0,
        totalSubmissions: 0,
        results: [],
      })
    }

    console.log(`Found ${unpaidTransactions.length} unpaid transactions`)

    // Setup contract interaction
    const rewardContract = process.env.REWARD_CONTRACT_ADDRESS as `0x${string}` | undefined
    const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY as `0x${string}` | undefined
    const deployerKey = process.env.PRIVATE_KEY as `0x${string}` | undefined
    const rpcUrl = process.env.WORLD_CHAIN_RPC_URL || "https://worldchain-mainnet.g.alchemy.com/v2/vJp-om_ZDiQBX0HAzO5F2"

    if (!rewardContract || !signerKey || !deployerKey) {
      return NextResponse.json(
        { error: "Missing required environment variables: REWARD_CONTRACT_ADDRESS, REWARD_SIGNER_PRIVATE_KEY, or PRIVATE_KEY" },
        { status: 500 }
      )
    }

    // Prepare batch payout data
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
    for (const tx of unpaidTransactions) {
      try {
        // Get submission ID from the transaction (it's stored in submission_id)
        const submissionId = BigInt(tx.submission_id)
        const stationIdBytes32 = stationIdToBytes32(tx.gas_station_id)
        const amount = BigInt(tx.accrued_amount || 0)

        // Sign the claim message
        const signature = await signClaimMessage(
          {
            contract: rewardContract,
            recipient: tx.user_wallet_address as `0x${string}`,
            stationIdBytes32,
            submissionId,
            rewardAmount: amount,
            deadline,
          },
          signerKey
        )

        recipients.push(tx.user_wallet_address as `0x${string}`)
        stationIds.push(stationIdBytes32)
        submissionIds.push(submissionId)
        amounts.push(amount)
        deadlines.push(deadline)
        signatures.push(signature)
        transactionIds.push(tx.id.toString())
      } catch (error) {
        console.error(`Error preparing transaction ${tx.id}:`, error)
      }
    }

    if (recipients.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No valid transactions to process",
        payoutDate: yesterdayDate,
        totalUsers: 0,
        totalSubmissions: 0,
        results: [],
      })
    }

    console.log(`Prepared ${recipients.length} transactions for batch payout`)

    // Execute batch payout
    let txHash: string | null = null
    try {
      const account = privateKeyToAccount(deployerKey)
      const client = createWalletClient({
        account,
        chain: {
          id: 480, // World Chain
          name: "World Chain",
          network: "worldchain",
          nativeCurrency: { name: "WRLD", symbol: "WRLD", decimals: 18 },
          rpcUrls: {
            default: { http: [rpcUrl] },
          },
        },
        transport: http(rpcUrl),
      })

      txHash = await client.writeContract({
        address: rewardContract,
        abi: RewardVaultABI,
        functionName: "batchPayout",
        args: [recipients, stationIds, submissionIds, amounts, deadlines, signatures],
      })

      console.log(`Batch payout successful! Transaction hash: ${txHash}`)

      // Update all transactions as paid
      await supabaseAdmin
        .from("reward_transactions")
        .update({
          paid: true,
          paid_at: new Date().toISOString(),
          payout_tx_hash: txHash,
          updated_at: new Date().toISOString(),
        })
        .in("id", transactionIds)

      return NextResponse.json({
        success: true,
        payoutDate: yesterdayDate,
        totalUsers: new Set(recipients).size,
        totalSubmissions: recipients.length,
        txHash,
        results: [{
          status: "paid",
          transactionCount: recipients.length,
          txHash,
        }],
      })
    } catch (error) {
      console.error("Batch payout failed:", error)
      return NextResponse.json(
        {
          error: "Batch payout failed",
          message: error instanceof Error ? error.message : "Unknown error",
          preparedTransactions: recipients.length,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Payout API error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

