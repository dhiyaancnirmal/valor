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

    // Reward eligibility: one reward per gas station per 24h (DB-enforced)
    let rewardEligible = false
    let rewardSignature: string | null = null
    let rewardDeadline: number | null = null
    let stationIdBytes32: string | null = null
    let rewardContractUsed: `0x${string}` | null = null

    try {
      // Check if this station has a claimed reward in the last 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentClaims, error: claimErr } = await supabase
        .from("price_submissions")
        .select("id")
        .eq("gas_station_id", gasStationId)
        .eq("reward_claimed", true)
        .gt("created_at", twentyFourHoursAgo)
        .limit(1)

      if (claimErr) {
        console.error("Eligibility check error:", claimErr)
      }

      if (!recentClaims || recentClaims.length === 0) {
        // Eligible: generate signature for on-chain claim
        const rewardContract = (process.env.REWARD_CONTRACT_ADDRESS || "0xa0B5489eE689441841A2e94Bd7E55793b609E576") as `0x${string}`
        const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY as `0x${string}`

        if (signerKey) {
          // Generate signature for reward claim
          const { generateRewardSignature } = await import("@/lib/rewards")
          const signatureData = await generateRewardSignature(
            walletAddress,
            gasStationId,
            submission.id,
            rewardContract,
            signerKey
          )

          rewardEligible = true
          rewardSignature = signatureData.signature
          rewardDeadline = signatureData.deadline
          stationIdBytes32 = signatureData.stationIdBytes32
          rewardContractUsed = rewardContract
        }
      }
    } catch (rewardErr) {
      console.error("Reward generation error:", rewardErr)
      // Continue without rewards if signature generation fails
    }

    return NextResponse.json({
      success: true,
      submission,
      rewardEligible,
      rewardSignature,
      rewardDeadline,
      stationIdBytes32,
      rewardContract: rewardContractUsed,
    })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
