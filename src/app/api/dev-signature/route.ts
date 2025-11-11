import { NextRequest, NextResponse } from "next/server"
import { createSignature } from "@/auth/wallet/verify"

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Dev mode not available in production" },
        { status: 403 }
      )
    }

    const { message } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      )
    }

    const signature = createSignature(message)

    return NextResponse.json({ signature })
  } catch (error) {
    console.error("Dev signature error:", error)
    return NextResponse.json(
      { error: "Failed to create signature" },
      { status: 500 }
    )
  }
}
