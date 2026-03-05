import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Failed to fetch user submissions"

type StationSubmissionRow = {
  gas_station_id: string
  fuel_type: string
}

/**
 * Get user's station submissions for today
 * Returns object mapping stationId to array of submitted fuel_types
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const walletAddress = session.user.walletAddress

    // Get current UTC day
    const currentUTCDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const startOfDay = new Date(currentUTCDate + 'T00:00:00.000Z')
    const endOfDay = new Date(currentUTCDate + 'T23:59:59.999Z')

    // Get all user's submissions for today
    const { data: submissions, error } = await supabaseAdmin
      .from("price_submissions")
      .select("gas_station_id, fuel_type")
      .eq("user_wallet_address", walletAddress)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())

    if (error) {
      console.error("Error fetching user submissions:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group by station ID
    const stationSubmissions: Record<string, string[]> = {}
    
    const submissionRows = (submissions ?? []) as StationSubmissionRow[]

    for (const submission of submissionRows) {
        const stationId = submission.gas_station_id
        const fuelType = submission.fuel_type
        
        if (!stationSubmissions[stationId]) {
          stationSubmissions[stationId] = []
        }
        
        if (!stationSubmissions[stationId].includes(fuelType)) {
          stationSubmissions[stationId].push(fuelType)
        }
    }

    return NextResponse.json({
      success: true,
      stationSubmissions,
    })
  } catch (error: unknown) {
    console.error("User station submissions error:", error)
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
