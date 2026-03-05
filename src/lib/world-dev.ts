const isNonProduction = process.env.NODE_ENV !== "production"

const serverDevAuthFlag = process.env.ENABLE_DEV_AUTH === "true"
const clientDevAuthFlag = process.env.NEXT_PUBLIC_ENABLE_DEV_AUTH === "true"

export const isWorldDevBypassEnabled =
  isNonProduction && process.env.NEXT_PUBLIC_WORLD_DEV_BYPASS === "true"

export const isDevAuthEnabled =
  isNonProduction &&
  (serverDevAuthFlag || clientDevAuthFlag || isWorldDevBypassEnabled)

export function looksLikeWorldAppUserAgent(userAgent: string): boolean {
  return /WorldApp|WorldAppMiniKit|WorldCoin/i.test(userAgent)
}
