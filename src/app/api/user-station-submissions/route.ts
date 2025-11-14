import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/**
 * Get user's station submissions for today
 * Returns object mapping stationId to array of submitted fuel_types
 */
export async function GET(request: NextRequest) {
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
    
    if (submissions) {
      for (const submission of submissions) {
        const stationId = submission.gas_station_id
        const fuelType = submission.fuel_type
        
        if (!stationSubmissions[stationId]) {
          stationSubmissions[stationId] = []
        }
        
        if (!stationSubmissions[stationId].includes(fuelType)) {
          stationSubmissions[stationId].push(fuelType)
        }
      }
    }

    return NextResponse.json({
      success: true,
      stationSubmissions,
    })
  } catch (error: any) {
    console.error("User station submissions error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to fetch user submissions" },
      { status: 500 }
    )
  }
}

