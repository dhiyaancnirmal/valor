import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/**
 * Diagnostic endpoint to check yesterday's unpaid reward transactions
 * Shows total amount that should have been paid out in USD
 */
export async function GET() {
  try {
    // Get yesterday's UTC date
    const nowUTC = new Date()
    const yesterday = new Date(nowUTC)
    yesterday.setUTCDate(yesterday.getUTCDate() - 1)
    yesterday.setUTCHours(0, 0, 0, 0)
    const yesterdayDate = yesterday.toISOString().split('T')[0]

    console.log(`Checking unpaid rewards for date: ${yesterdayDate} (UTC)`)

    // Get all unpaid transactions from yesterday
    const { data: unpaidTransactions, error } = await supabaseAdmin
      .from("reward_transactions")
      .select("*")
      .eq("reward_period_date", yesterdayDate)
      .eq("paid", false)
      .not("accrued_amount", "is", null)
      .gt("accrued_amount", 0)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("Error fetching unpaid transactions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate totals
    let totalAccrued = 0n
    const transactionsByStation: Record<string, { count: number; total: bigint }> = {}
    const transactionsByUser: Record<string, { count: number; total: bigint }> = {}

    unpaidTransactions?.forEach((tx) => {
      const amount = BigInt(tx.accrued_amount || 0)
      totalAccrued += amount

      // Group by station
      if (!transactionsByStation[tx.gas_station_id]) {
        transactionsByStation[tx.gas_station_id] = { count: 0, total: 0n }
      }
      transactionsByStation[tx.gas_station_id].count++
      transactionsByStation[tx.gas_station_id].total += amount

      // Group by user
      if (!transactionsByUser[tx.user_wallet_address]) {
        transactionsByUser[tx.user_wallet_address] = { count: 0, total: 0n }
      }
      transactionsByUser[tx.user_wallet_address].count++
      transactionsByUser[tx.user_wallet_address].total += amount
    })

    // Convert to USDC (6 decimals)
    const totalUSDC = Number(totalAccrued) / 1_000_000

    // Also check paid transactions for comparison
    const { data: paidTransactions, error: paidError } = await supabaseAdmin
      .from("reward_transactions")
      .select("accrued_amount")
      .eq("reward_period_date", yesterdayDate)
      .eq("paid", true)
      .not("accrued_amount", "is", null)
      .gt("accrued_amount", 0)

    let totalPaid = 0n
    if (!paidError && paidTransactions) {
      paidTransactions.forEach((tx) => {
        totalPaid += BigInt(tx.accrued_amount || 0)
      })
    }
    const totalPaidUSDC = Number(totalPaid) / 1_000_000

    return NextResponse.json({
      date: yesterdayDate,
      summary: {
        unpaid: {
          transactionCount: unpaidTransactions?.length || 0,
          totalAccrued: totalAccrued.toString(),
          totalUSDC: totalUSDC.toFixed(6),
        },
        paid: {
          transactionCount: paidTransactions?.length || 0,
          totalPaid: totalPaid.toString(),
          totalUSDC: totalPaidUSDC.toFixed(6),
        },
        uniqueStations: Object.keys(transactionsByStation).length,
        uniqueUsers: Object.keys(transactionsByUser).length,
      },
      breakdown: {
        byStation: Object.entries(transactionsByStation).map(([stationId, data]) => ({
          stationId,
          transactionCount: data.count,
          totalUSDC: (Number(data.total) / 1_000_000).toFixed(6),
        })),
        byUser: Object.entries(transactionsByUser)
          .map(([address, data]) => ({
            address,
            transactionCount: data.count,
            totalUSDC: (Number(data.total) / 1_000_000).toFixed(6),
          }))
          .sort((a, b) => parseFloat(b.totalUSDC) - parseFloat(a.totalUSDC)),
      },
      transactions: unpaidTransactions?.map((tx) => ({
        id: tx.id,
        submissionId: tx.submission_id,
        userAddress: tx.user_wallet_address,
        stationId: tx.gas_station_id,
        accruedAmount: tx.accrued_amount,
        accruedUSDC: (Number(BigInt(tx.accrued_amount || 0)) / 1_000_000).toFixed(6),
        createdAt: tx.created_at,
      })),
    })
  } catch (error) {
    console.error("Diagnostic API error:", error)
    return NextResponse.json(
      { error: "Internal server error", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

