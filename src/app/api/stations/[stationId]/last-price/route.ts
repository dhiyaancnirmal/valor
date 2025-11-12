import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

/**
 * Get the last known price for a gas station
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stationId: string }> }
) {
  try {
    const { stationId } = await params

    if (!stationId) {
      return NextResponse.json({ error: "Station ID required" }, { status: 400 })
    }

    // Get the most recent price submission for this station
    const { data, error } = await supabaseAdmin
      .from("price_submissions")
      .select("price, fuel_type, created_at, user_wallet_address")
      .eq("gas_station_id", stationId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()

    if (error) {
      // If no results found, that's okay - return null
      if (error.code === 'PGRST116') {
        return NextResponse.json({ price: null })
      }
      console.error("Error fetching last price:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ price: null })
    }

    return NextResponse.json({
      price: parseFloat(data.price),
      fuelType: data.fuel_type,
      createdAt: data.created_at,
      submittedBy: data.user_wallet_address,
    })
  } catch (error: any) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

