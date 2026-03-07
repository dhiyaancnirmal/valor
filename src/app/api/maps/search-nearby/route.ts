import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getMapProvider } from "@/services/maps/provider"
import { getClientIp, isNumber, toRoundedCoord } from "@/services/maps/http"
import { getCachedValue, incrementMapMetric, isRateLimited, setCachedValue } from "@/services/maps/runtime-cache"
import { type NearbySearchInput, type StationCategory } from "@/services/maps/types"
import { mergeStationItems } from "@/services/maps/venue-merge"
import { searchPublishedPoisNearby } from "@/services/pois/service"
import type { StationMapItem } from "@/types"

const SEARCH_RATE_LIMIT_WINDOW_MS = 60_000
const SEARCH_RATE_LIMIT_REQUESTS = 60
const CACHE_TTL_MS = 60_000

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    incrementMapMetric("nearby.requests")
    const session = await auth()
    if (!session?.user?.walletAddress) {
      incrementMapMetric("nearby.unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ip = getClientIp(request)
    if (isRateLimited(`maps-nearby:${ip}`, SEARCH_RATE_LIMIT_REQUESTS, SEARCH_RATE_LIMIT_WINDOW_MS)) {
      incrementMapMetric("nearby.rate_limited")
      return NextResponse.json({ error: "Rate limited" }, { status: 429 })
    }

    const body = (await request.json()) as Partial<NearbySearchInput>

    const legacyCategory = body.category
    const requestedCategories = Array.isArray((body as { categories?: unknown }).categories)
      ? ((body as { categories?: unknown }).categories as unknown[])
      : []
    const categories = normalizeCategories(legacyCategory, requestedCategories)

    if (!isNumber(body.latitude) || !isNumber(body.longitude) || !isNumber(body.radiusMeters) || categories.length === 0) {
      incrementMapMetric("nearby.invalid_payload")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const basePayload: Omit<NearbySearchInput, "category"> = {
      latitude: body.latitude,
      longitude: body.longitude,
      radiusMeters: body.radiusMeters,
    }

    const cacheKey = [
      "nearby",
      toRoundedCoord(basePayload.latitude),
      toRoundedCoord(basePayload.longitude),
      Math.round(basePayload.radiusMeters),
      categories.join(","),
    ].join(":")

    const cached = getCachedValue<StationMapItem[]>(cacheKey)
    if (cached) {
      incrementMapMetric("nearby.cache_hit")
      return NextResponse.json({ stations: cached })
    }
    incrementMapMetric("nearby.cache_miss")

    const provider = getMapProvider()
    incrementMapMetric("nearby.category_searches", categories.length)
    const providerResults = await Promise.allSettled(
      categories.map((category) => provider.searchNearby({ ...basePayload, category }))
    )
    const stationGroups = providerResults
      .filter((result): result is PromiseFulfilledResult<StationMapItem[]> => result.status === "fulfilled")
      .map((result) => result.value)

    const communityResults = await searchPublishedPoisNearby({
      latitude: basePayload.latitude,
      longitude: basePayload.longitude,
      radiusMeters: basePayload.radiusMeters,
      categories,
    })

    if (communityResults.length > 0) {
      stationGroups.push(communityResults)
    }

    if (stationGroups.length === 0) {
      incrementMapMetric("nearby.category_all_failed")
      const firstError = providerResults.find((result): result is PromiseRejectedResult => result.status === "rejected")
      throw firstError?.reason ?? new Error("No category searches succeeded")
    }
    incrementMapMetric(
      "nearby.category_partial_failures",
      providerResults.length - providerResults.filter((result) => result.status === "fulfilled").length
    )

    const stations = mergeStationItems(stationGroups.flat())
    incrementMapMetric("nearby.responses")
    setCachedValue(cacheKey, stations, CACHE_TTL_MS)

    return NextResponse.json({ stations })
  } catch (error) {
    incrementMapMetric("nearby.errors")
    console.error("/api/maps/search-nearby error", error)
    return NextResponse.json({ error: "Failed to search nearby stations" }, { status: 500 })
  }
}

function normalizeCategories(
  legacyCategory: unknown,
  incomingCategories: unknown[]
): StationCategory[] {
  const categories = new Set<StationCategory>()

  if (legacyCategory === "gas_station" || legacyCategory === "grocery_store") {
    categories.add(legacyCategory)
  }

  for (const value of incomingCategories) {
    if (value === "gas_station" || value === "grocery_store") {
      categories.add(value)
    }
  }

  return Array.from(categories)
}
