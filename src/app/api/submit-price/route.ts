import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { stationIdToBytes32, signClaimMessage } from "@/lib/rewards"

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
        { error: "Failed to save submission", details: dbError.message },
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

    // Reward eligibility: one reward per gas station per 24h (DB-enforced)
    let rewardEligible = false
    let rewardSignature: string | null = null
    let rewardDeadline: number | null = null
    let stationIdBytes32: string | null = null
    let rewardContractUsed: `0x${string}` | null = null

    try {
      // Check if this station has a claimed reward in the last 24h
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: recentClaims, error: claimErr } = await supabaseAdmin
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
        const rewardContract = "0xa0B5489eE689441841A2e94Bd7E55793b609E576" as `0x${string}` // Hardcoded to ensure correct address
        const signerKey = process.env.REWARD_SIGNER_PRIVATE_KEY as `0x${string}`

        // Validate signer key and contract address early to provide a clear error
        const isHex = (s: string, length?: number) =>
          /^0x[0-9a-fA-F]+$/.test(s) && (length ? s.length === length : true)
        const isAddress = (s: string) => /^0x[0-9a-fA-F]{40}$/.test(s)

        if (!signerKey || !isHex(signerKey, 66)) {
          console.error("Invalid REWARD_SIGNER_PRIVATE_KEY: must be 0x-prefixed 32-byte hex")
          return NextResponse.json(
            { error: "Server misconfigured: invalid REWARD_SIGNER_PRIVATE_KEY (expected 0x + 64 hex chars)" },
            { status: 500 }
          )
        }
        if (!isAddress(rewardContract)) {
          console.error("Invalid reward contract address:", rewardContract)
          return NextResponse.json(
            { error: "Server misconfigured: invalid reward contract address" },
            { status: 500 }
          )
        }
        const rewardAmount =
          (process.env.REWARD_AMOUNT_USDC && BigInt(process.env.REWARD_AMOUNT_USDC)) || BigInt(500000) // default 0.5 USDC with 6 decimals

        if (rewardContract && signerKey) {
          const stationBytes32 = stationIdToBytes32(gasStationId)
          rewardDeadline = Math.floor(Date.now() / 1000) + 15 * 60 // 15 minutes
          const signature = await signClaimMessage(
            {
              contract: rewardContract,
              recipient: walletAddress as `0x${string}`,
              stationIdBytes32: stationBytes32,
              submissionId: BigInt(submission.id),
              rewardAmount,
              deadline: BigInt(rewardDeadline),
            },
            signerKey
          )

          // Attempt to persist eligibility and signature for auditability (no-op if columns not present)
          await supabaseAdmin
            .from("price_submissions")
            .update({
              reward_eligible: true,
              reward_signature: signature,
            })
            .eq("id", submission.id)

          rewardEligible = true
          rewardSignature = signature
          stationIdBytes32 = stationBytes32
          rewardContractUsed = rewardContract
        } else {
          console.warn("Reward signing not configured: missing REWARD_CONTRACT_ADDRESS or REWARD_SIGNER_PRIVATE_KEY")
        }
      }
    } catch (e) {
      console.error("Reward eligibility/signing error:", e)
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
