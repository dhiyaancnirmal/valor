import crypto from "crypto"
import { verifySiweMessage, type MiniAppWalletAuthSuccessPayload } from "@worldcoin/minikit-js"

export async function verifySignature(
  message: string,
  signature: string,
  walletAddress: string,
  nonce: string,
  statement?: string,
  requestId?: string,
  version?: string | number
): Promise<boolean> {
  try {
    if (!message || !signature || !walletAddress || !nonce) return false

    // Explicit development-only fallback.
    // This is intentionally opt-in and disabled in production.
    const allowDevAuth =
      process.env.NODE_ENV !== "production" &&
      process.env.ENABLE_DEV_AUTH === "true"

    if (allowDevAuth) {
      const expected = createSignature(message)
      if (signature === expected) {
        return true
      }
    }

    const payload: MiniAppWalletAuthSuccessPayload = {
      status: "success",
      message,
      signature,
      address: walletAddress,
      version: typeof version === "string" ? Number(version) || 1 : version || 1,
    }

    const { isValid, siweMessageData } = await verifySiweMessage(
      payload,
      nonce,
      statement,
      requestId
    )

    if (!isValid) return false

    // Additional explicit address check for defense in depth.
    if (siweMessageData.address) {
      return siweMessageData.address.toLowerCase() === walletAddress.toLowerCase()
    }

    return true
  } catch (error) {
    return false
  }
}

export function generateSignatureMessage(walletAddress: string): string {
  const timestamp = Date.now()
  return `Sign in to Valor\nWallet: ${walletAddress}\nTimestamp: ${timestamp}`
}

export function createSignature(message: string): string {
  const hmacSecret = process.env.HMAC_SECRET_KEY || process.env.NEXT_PUBLIC_HMAC_SECRET_KEY
  if (!hmacSecret) {
    throw new Error("HMAC_SECRET_KEY not found")
  }

  const hmac = crypto.createHmac("sha256", hmacSecret)
  hmac.update(message)
  return hmac.digest("hex")
}
