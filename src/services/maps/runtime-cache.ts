type CacheEntry<T> = {
  value: T
  expiresAtMs: number
}

type RateBucket = {
  count: number
  resetAtMs: number
}

type MapMetricsSnapshot = {
  startedAt: string
  counters: Record<string, number>
}

const responseCache = new Map<string, CacheEntry<unknown>>()
const rateBuckets = new Map<string, RateBucket>()
const mapMetrics = new Map<string, number>()
const metricsStartedAtMs = Date.now()
const MAX_RESPONSE_CACHE_ENTRIES = 800
const MAX_RATE_BUCKET_ENTRIES = 1000

export function getCachedValue<T>(key: string): T | null {
  pruneExpired()
  const entry = responseCache.get(key)
  if (!entry) return null

  if (entry.expiresAtMs <= Date.now()) {
    responseCache.delete(key)
    return null
  }

  return entry.value as T
}

export function setCachedValue<T>(key: string, value: T, ttlMs: number) {
  pruneExpired()
  if (responseCache.size >= MAX_RESPONSE_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value as string | undefined
    if (oldestKey) responseCache.delete(oldestKey)
  }
  responseCache.set(key, {
    value,
    expiresAtMs: Date.now() + ttlMs,
  })
}

export function isRateLimited(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now()
  pruneRateBuckets(now)
  const bucket = rateBuckets.get(key)

  if (!bucket || bucket.resetAtMs <= now) {
    rateBuckets.set(key, {
      count: 1,
      resetAtMs: now + windowMs,
    })
    return false
  }

  if (bucket.count >= maxRequests) {
    return true
  }

  bucket.count += 1
  rateBuckets.set(key, bucket)
  return false
}

export function incrementMapMetric(key: string, amount = 1) {
  const current = mapMetrics.get(key) ?? 0
  mapMetrics.set(key, current + amount)
}

export function getMapMetricsSnapshot(): MapMetricsSnapshot {
  const counters: Record<string, number> = {}
  for (const [key, value] of mapMetrics) {
    counters[key] = value
  }

  return {
    startedAt: new Date(metricsStartedAtMs).toISOString(),
    counters,
  }
}

export function resetMapMetrics() {
  mapMetrics.clear()
}

function pruneExpired() {
  const now = Date.now()
  for (const [key, entry] of responseCache) {
    if (entry.expiresAtMs <= now) {
      responseCache.delete(key)
    }
  }
}

function pruneRateBuckets(now: number) {
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAtMs <= now) {
      rateBuckets.delete(key)
    }
  }
  while (rateBuckets.size > MAX_RATE_BUCKET_ENTRIES) {
    const oldestKey = rateBuckets.keys().next().value as string | undefined
    if (!oldestKey) break
    rateBuckets.delete(oldestKey)
  }
}
