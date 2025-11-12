import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth()
    console.log("Submit-price session:", { hasSession: !!session, walletAddress: session?.user?.walletAddress })

    if (!session?.user?.walletAddress) {
      console.log("Unauthorized: no wallet address in session")
      return NextResponse.json({ error: "priceSubmission:errors.missingRequiredFields", message: "Unauthorized" }, { status: 401 })
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

    console.log("Parsed form data:", {
      walletAddress,
      gasStationName,
      gasStationId,
      price,
      fuelType,
      userLatitude,
      userLongitude,
      gasStationLatitude,
      gasStationLongitude,
      hasPhoto: !!photo
    })

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
        { error: "priceSubmission:errors.missingRequiredFields", message: "Missing required fields" },
        { status: 400 }
      )
    }

    // Verify wallet address matches session
    if (walletAddress !== session.user.walletAddress) {
      return NextResponse.json(
        { error: "priceSubmission:errors.walletAddressMismatch", message: "Wallet address mismatch" },
        { status: 403 }
      )
    }

    // Create database record (without photo URL initially)
    const { data: submission, error: dbError } = await supabaseAdmin
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
      console.error("Full error details:", JSON.stringify(dbError, null, 2))
      return NextResponse.json(
        { error: "priceSubmission:errors.internalServerError", message: "Failed to save submission", details: dbError.message },
        { status: 500 }
      )
    }

    // Upload photo asynchronously (non-blocking)
    if (photo && submission) {
      const fileName = `${submission.id}-${Date.now()}.${photo.name.split(".").pop()}`
      const filePath = `${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from("price-photos")
        .upload(filePath, photo)

      if (!uploadError) {
        // Get public URL
        const {
          data: { publicUrl },
        } = supabaseAdmin.storage.from("price-photos").getPublicUrl(filePath)

        // Update submission with photo URL
        await supabaseAdmin
          .from("price_submissions")
          .update({ photo_url: publicUrl })
          .eq("id", submission.id)
      } else {
        console.error("Photo upload error:", uploadError)
      }
    }

    // Calculate accrued reward for this submission
    let accruedRewardAmount: string | null = null
    let rewardPeriodDate: string | null = null
    let submissionCount: number = 0

    try {
      const rewardPoolAmount = 500000n // 0.5 USDC in smallest units (6 decimals)
      const currentUTCDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD

      // Count submissions for this station in current UTC day
      const startOfDay = new Date(currentUTCDate + 'T00:00:00.000Z')
      const endOfDay = new Date(currentUTCDate + 'T23:59:59.999Z')

      const { count, error: countError } = await supabaseAdmin
        .from("price_submissions")
        .select("*", { count: "exact", head: true })
        .eq("gas_station_id", gasStationId)
        .gte("created_at", startOfDay.toISOString())
        .lte("created_at", endOfDay.toISOString())

      if (countError) {
        console.error("Error counting submissions:", countError)
      }

      submissionCount = count || 0
      const accruedAmount = submissionCount > 0 
        ? rewardPoolAmount / BigInt(submissionCount)
        : rewardPoolAmount

      // Create reward transaction
      const { error: rewardError } = await supabaseAdmin
        .from("reward_transactions")
        .insert({
          submission_id: submission.id,
          user_wallet_address: walletAddress,
          gas_station_id: gasStationId,
          accrued_amount: accruedAmount.toString(),
          reward_period_date: currentUTCDate,
        })

      if (rewardError) {
        console.error("Error creating reward transaction:", rewardError)
      } else {
        accruedRewardAmount = accruedAmount.toString()
        rewardPeriodDate = currentUTCDate
      }
    } catch (e) {
      console.error("Reward accrual error:", e)
    }

    return NextResponse.json({
      success: true,
      submission,
      accruedRewardAmount,
      rewardPeriodDate,
      submissionCount,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "priceSubmission:errors.internalServerError", message: "Internal server error" },
      { status: 500 }
    )
  }
}
