import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    if (!session?.user?.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const walletAddress = formData.get("user_wallet_address") as string
    const gasStationName = formData.get("gas_station_name") as string
    const gasStationId = formData.get("gas_station_id") as string
    const price = parseFloat(formData.get("price") as string)
    const fuelType = formData.get("fuel_type") as string
    const userLatitude = parseFloat(formData.get("user_latitude") as string)
    const userLongitude = parseFloat(formData.get("user_longitude") as string)
    const gasStationLatitude = parseFloat(
      formData.get("gas_station_latitude") as string
    )
    const gasStationLongitude = parseFloat(
      formData.get("gas_station_longitude") as string
    )
    const photo = formData.get("photo") as File | null

    // Validate required fields
    if (
      !walletAddress ||
      !gasStationName ||
      !gasStationId ||
      !price ||
      !fuelType ||
      !userLatitude ||
      !userLongitude
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify wallet address matches session
    if (walletAddress !== session.user.walletAddress) {
      return NextResponse.json(
        { error: "Wallet address mismatch" },
        { status: 403 }
      )
    }

    // Create database record (without photo URL initially)
    const { data: submission, error: dbError } = await supabase
      .from("price_submissions")
      .insert({
        user_wallet_address: walletAddress,
        gas_station_name: gasStationName,
        gas_station_id: gasStationId,
        price,
        fuel_type: fuelType,
        user_latitude: userLatitude,
        user_longitude: userLongitude,
        gas_station_latitude: gasStationLatitude,
        gas_station_longitude: gasStationLongitude,
      })
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      return NextResponse.json(
        { error: "Failed to save submission" },
        { status: 500 }
      )
    }

    // Upload photo asynchronously (non-blocking)
    if (photo && submission) {
      const fileName = `${submission.id}-${Date.now()}.${photo.name.split(".").pop()}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("price-photos")
        .upload(filePath, photo)

      if (!uploadError) {
        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("price-photos").getPublicUrl(filePath)

        // Update submission with photo URL
        await supabase
          .from("price_submissions")
          .update({ photo_url: publicUrl })
          .eq("id", submission.id)
      } else {
        console.error("Photo upload error:", uploadError)
      }
    }

    return NextResponse.json({
      success: true,
      submission,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
