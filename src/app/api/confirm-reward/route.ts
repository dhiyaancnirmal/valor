import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

type Body = {
  submissionId: number
  transactionId: string
}

export async function POST(request: NextRequest) {
  try {
    const { submissionId, transactionId } = (await request.json()) as Body
    if (!submissionId || !transactionId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 })
    }

    let mined = false

    const appId = process.env.APP_ID
    const devKey = process.env.DEV_PORTAL_API_KEY
    if (appId && devKey) {
      try {
        const res = await fetch(
          `https://developer.worldcoin.org/api/v2/minikit/transaction/${transactionId}?app_id=${appId}`,
          {
            method: "GET",
            headers: { Authorization: `Bearer ${devKey}` },
            cache: "no-store",
          }
        )
        if (res.ok) {
          const tx = await res.json()
          // optimistic success if not failed; optionally require status === 'mined'
          if (tx?.status && tx.status !== "failed") {
            mined = true
          }
        }
      } catch (e) {
        console.error("Developer portal verify error:", e)
      }
    }

    if (mined) {
      await supabase
        .from("price_submissions")
        .update({
          reward_claimed: true,
          reward_claimed_at: new Date().toISOString(),
          reward_tx_hash: transactionId,
        })
        .eq("id", submissionId)
    }

    return NextResponse.json({ success: mined })
  } catch (error) {
    console.error("confirm-reward error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}



