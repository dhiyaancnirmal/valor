#!/usr/bin/env tsx
/**
 * Quick script to check yesterday's unpaid reward transactions
 * Run with: npx tsx scripts/check-yesterday-rewards.ts
 * 
 * Make sure your .env.local file has:
 * - NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase configuration")
  console.error("Required: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL")
  console.error("Required: SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

async function main() {
  // Get yesterday's UTC date
  const nowUTC = new Date()
  const yesterday = new Date(nowUTC)
  yesterday.setUTCDate(yesterday.getUTCDate() - 1)
  yesterday.setUTCHours(0, 0, 0, 0)
  const yesterdayDate = yesterday.toISOString().split('T')[0]

  console.log(`\n📊 Checking unpaid rewards for: ${yesterdayDate} (UTC)\n`)

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
    console.error("❌ Error fetching unpaid transactions:", error)
    process.exit(1)
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

  console.log("=".repeat(60))
  console.log("💰 REWARD SUMMARY")
  console.log("=".repeat(60))
  console.log(`Date: ${yesterdayDate} (UTC)`)
  console.log(`\n📈 UNPAID (should have been paid out):`)
  console.log(`   Transactions: ${unpaidTransactions?.length || 0}`)
  console.log(`   Total Amount: ${totalAccrued.toString()} (smallest units)`)
  console.log(`   Total USD: $${totalUSDC.toFixed(6)}`)
  console.log(`   Unique Stations: ${Object.keys(transactionsByStation).length}`)
  console.log(`   Unique Users: ${Object.keys(transactionsByUser).length}`)
  
  console.log(`\n✅ PAID (already processed):`)
  console.log(`   Transactions: ${paidTransactions?.length || 0}`)
  console.log(`   Total Amount: ${totalPaid.toString()} (smallest units)`)
  console.log(`   Total USD: $${totalPaidUSDC.toFixed(6)}`)

  if (unpaidTransactions && unpaidTransactions.length > 0) {
    console.log(`\n📋 BREAKDOWN BY STATION:`)
    Object.entries(transactionsByStation)
      .sort((a, b) => Number(b[1].total) - Number(a[1].total))
      .forEach(([stationId, data]) => {
        const usdc = (Number(data.total) / 1_000_000).toFixed(6)
        console.log(`   Station ${stationId}: ${data.count} transactions = $${usdc}`)
      })

    console.log(`\n👥 TOP USERS (by amount):`)
    Object.entries(transactionsByUser)
      .map(([address, data]) => ({
        address,
        count: data.count,
        total: Number(data.total) / 1_000_000,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.address.slice(0, 10)}... (${user.count} tx) = $${user.total.toFixed(6)}`)
      })
  }

  console.log("\n" + "=".repeat(60))
  console.log(`\n💡 According to the database, you should have paid out:`)
  console.log(`   $${totalUSDC.toFixed(6)} USD yesterday\n`)
  console.log("=".repeat(60) + "\n")
}

main().catch(console.error)

