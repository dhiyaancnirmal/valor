import { NextRequest, NextResponse } from "next/server"
import { createSignature } from "@/auth/wallet/verify"

export async function POST(request: NextRequest) {
  try {
    const enabled =
      process.env.NODE_ENV !== "production" &&
      process.env.ENABLE_DEV_AUTH === "true"

    if (!enabled) {
      return NextResponse.json(
        { error: "Dev mode auth is disabled" },
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
    return NextResponse.json(
      { error: "Failed to create signature" },
      { status: 500 }
    )
  }
}
