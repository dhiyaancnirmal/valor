import crypto from "crypto"
import { signRequest } from "@worldcoin/idkit/signing"

export const WORLD_ID_COOKIE_NAME = "valor_world_id_verified"
const WORLD_ID_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 30
const WORLD_ID_RP_CONTEXT_TTL_SECONDS = 60 * 5

type VerifiedCookiePayload = {
  walletAddress: string
  verifiedAt: number
  action: string
}

export type WorldIdConfig = {
  enabled: boolean
  appId: `app_${string}` | null
  rpId: string | null
  action: string
  environment: "production" | "staging"
  signingKey: string | null
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
  const appId =
    process.env.NEXT_PUBLIC_WORLD_ID_APP_ID ||
    process.env.WORLD_ID_APP_ID ||
    process.env.NEXT_PUBLIC_APP_ID ||
    process.env.APP_ID ||
    null

  const rpId = process.env.WORLD_ID_RP_ID || null
  const signingKey =
    process.env.WORLD_ID_RP_PRIVATE_KEY ||
    process.env.WORLD_ID_SIGNING_KEY ||
    null

  return {
    enabled: Boolean(appId && rpId && signingKey),
    appId: appId as `app_${string}` | null,
    rpId,
    action: process.env.WORLD_ID_ACTION || "valor-contribution",
    environment: process.env.WORLD_ID_ENVIRONMENT === "staging" ? "staging" : "production",
    signingKey,
  }
}

export function createRpContext(actionOverride?: string) {
  const config = getWorldIdConfig()
  if (!config.enabled || !config.rpId || !config.signingKey || !config.appId) {
    throw new Error("World ID 4.0 is not configured")
  }

  const action = actionOverride || config.action
  const signature = signRequest(action, config.signingKey, WORLD_ID_RP_CONTEXT_TTL_SECONDS)

  return {
    appId: config.appId,
    action,
    environment: config.environment,
    allowLegacyProofs: false,
    rpContext: {
      rp_id: config.rpId,
      nonce: signature.nonce,
      created_at: signature.createdAt,
      expires_at: signature.expiresAt,
      signature: signature.sig,
    },
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
