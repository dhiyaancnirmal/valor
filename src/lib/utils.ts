import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Calculate the great-circle distance between two points on Earth using
 * the Haversine formula. Returns distance in meters by default.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180
  const R = 6371e3 // Earth's radius in meters
  const φ1 = toRadians(lat1)
  const φ2 = toRadians(lat2)
  const Δφ = toRadians(lat2 - lat1)
  const Δλ = toRadians(lon2 - lon1)

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Format a distance (in meters) into a human-friendly string.
 * - < 1000 m: "XYZ m"
 * - >= 1000 m: "X.Y km"
 */
export function formatDistance(meters: number, t?: (key: string) => string): string {
  if (!Number.isFinite(meters) || meters < 0) return "—"
  if (meters < 1000) {
    const unit = t ? t('common:units.meter') : 'm'
    return `${Math.round(meters)} ${unit}`
  }
  const km = meters / 1000
  const unit = t ? t('common:units.kilometer') : 'km'
  return `${km.toFixed(km < 10 ? 1 : 0)} ${unit}`
}
