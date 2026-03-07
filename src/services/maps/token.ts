import crypto from "node:crypto"

type CachedToken = {
  token: string
  expiresAtMs: number
}

const TOKEN_TTL_SECONDS = 10 * 60
const REFRESH_BUFFER_SECONDS = 90

let cachedToken: CachedToken | null = null
let cachedAccessToken: CachedToken | null = null

export function getAppleMapsConfig() {
  return {
    teamId: process.env.APPLE_MAPS_TEAM_ID,
    keyId: process.env.APPLE_MAPS_KEY_ID,
    mapsId: process.env.APPLE_MAPS_MAPS_ID,
    privateKey: normalizePrivateKey(process.env.APPLE_MAPS_PRIVATE_KEY),
  }
}

export function hasAppleMapsConfig() {
  const config = getAppleMapsConfig()
  return Boolean(config.teamId && config.keyId && config.mapsId && config.privateKey)
}

export function createOrGetAppleMapsToken() {
  const nowMs = Date.now()
  if (cachedToken && cachedToken.expiresAtMs - nowMs > REFRESH_BUFFER_SECONDS * 1000) {
    return {
      token: cachedToken.token,
      expiresAt: new Date(cachedToken.expiresAtMs).toISOString(),
    }
  }

  const { teamId, keyId, mapsId, privateKey } = getAppleMapsConfig()
  if (!teamId || !keyId || !mapsId || !privateKey) {
    throw new Error("Missing Apple Maps configuration")
  }

  const nowSeconds = Math.floor(nowMs / 1000)
  const exp = nowSeconds + TOKEN_TTL_SECONDS

  const header = {
    alg: "ES256",
    kid: keyId,
    typ: "JWT",
  }

  const payload = {
    iss: teamId,
    iat: nowSeconds,
    exp,
    sub: mapsId,
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const signer = crypto.createSign("sha256")
  signer.update(signingInput)
  signer.end()

  const signature = signer.sign(privateKey)
  const encodedSignature = signature.toString("base64url")
  const token = `${signingInput}.${encodedSignature}`

  cachedToken = {
    token,
    expiresAtMs: exp * 1000,
  }

  return {
    token,
    expiresAt: new Date(exp * 1000).toISOString(),
  }
}

export async function createOrGetAppleMapsAccessToken() {
  const nowMs = Date.now()
  if (cachedAccessToken && cachedAccessToken.expiresAtMs - nowMs > REFRESH_BUFFER_SECONDS * 1000) {
    return cachedAccessToken.token
  }

  const { token: authToken } = createOrGetAppleMapsToken()

  const response = await fetch("https://maps-api.apple.com/v1/token", {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Failed to generate Apple Maps access token (${response.status}): ${errorBody}`)
  }

  const payload = (await response.json()) as {
    accessToken?: string
    expiresInSeconds?: number
  }

  if (!payload.accessToken || typeof payload.expiresInSeconds !== "number") {
    throw new Error("Invalid Apple Maps token response")
  }

  const expiresAtMs = nowMs + payload.expiresInSeconds * 1000
  cachedAccessToken = {
    token: payload.accessToken,
    expiresAtMs,
  }

  return payload.accessToken
}

function normalizePrivateKey(value?: string) {
  if (!value) return undefined
  return value.replace(/\\n/g, "\n").trim()
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url")
}
