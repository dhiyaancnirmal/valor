import crypto from "crypto"

export const WORLD_ID_COOKIE_NAME = "valor_world_id_verified"
const WORLD_ID_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30

type VerifiedCookiePayload = {
  walletAddress: string
  verifiedAt: number
  action: string
}

export type WorldIdConfig = {
  enabled: boolean
  appId: `app_${string}` | null
  action: string
}

function getCookieSigningSecret() {
  return (
    process.env.HMAC_SECRET_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    (process.env.NODE_ENV !== "production" ? "valor-world-id-dev-secret" : null)
  )
}

function signCookieValue(value: string) {
  const secret = getCookieSigningSecret()
  if (!secret) {
    throw new Error("World ID cookie signing secret is not configured")
  }

  return crypto.createHmac("sha256", secret).update(value).digest("hex")
}

export function getWorldIdConfig(): WorldIdConfig {
  const appId = process.env.NEXT_PUBLIC_APP_ID || null

  return {
    enabled: Boolean(appId),
    appId: appId as `app_${string}` | null,
    action: process.env.WORLD_ID_ACTION || "valor-contribution",
  }
}

export function createWorldIdCookieValue(payload: VerifiedCookiePayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const signature = signCookieValue(encoded)
  return `${encoded}.${signature}`
}

export function readWorldIdCookieValue(rawValue: string | undefined | null): VerifiedCookiePayload | null {
  if (!rawValue) return null

  const [encoded, signature] = rawValue.split(".")
  if (!encoded || !signature) return null

  const expectedSignature = signCookieValue(encoded)
  if (signature.length !== expectedSignature.length) return null
  const matches = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  if (!matches) return null

  try {
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as VerifiedCookiePayload
    if (!decoded.walletAddress || !decoded.verifiedAt || !decoded.action) {
      return null
    }

    const expiresAt = decoded.verifiedAt + WORLD_ID_COOKIE_TTL_SECONDS * 1000
    if (Date.now() > expiresAt) {
      return null
    }

    return decoded
  } catch {
    return null
  }
}

export function isWalletVerifiedByCookie(rawValue: string | undefined | null, walletAddress: string | undefined | null) {
  if (!walletAddress) return false
  const parsed = readWorldIdCookieValue(rawValue)
  if (!parsed) return false
  return parsed.walletAddress.toLowerCase() === walletAddress.toLowerCase()
}

export function getWorldIdCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WORLD_ID_COOKIE_TTL_SECONDS,
  }
}

export function getWorldIdRequirementStatus(rawCookieValue: string | undefined | null, walletAddress: string | undefined | null) {
  const config = getWorldIdConfig()
  return {
    enabled: config.enabled,
    verified: config.enabled ? isWalletVerifiedByCookie(rawCookieValue, walletAddress) : true,
    action: config.action,
  }
}
