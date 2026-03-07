import type { NextRequest } from "next/server"

export function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")
  if (!forwarded) return "unknown"
  return forwarded.split(",")[0]?.trim() || "unknown"
}

export function toRoundedCoord(value: number) {
  return value.toFixed(4)
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}
