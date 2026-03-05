import crypto from "crypto"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET() {
  const nonce = crypto.randomUUID().replace(/-/g, "")

  const cookieStore = await cookies()
  cookieStore.set("siwe", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  })

  return NextResponse.json({ nonce })
}
