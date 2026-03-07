import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getMapProvider } from "@/services/maps/provider"
import { getClientIp, isNumber, toRoundedCoord } from "@/services/maps/http"
import { getCachedValue, incrementMapMetric, isRateLimited, setCachedValue } from "@/services/maps/runtime-cache"
import { type BoundsSearchInput, type StationCategory } from "@/services/maps/types"
import { mergeStationItems } from "@/services/maps/venue-merge"
import { searchPublishedPoisInBounds } from "@/services/pois/service"
import type { StationMapItem } from "@/types"

const SEARCH_RATE_LIMIT_WINDOW_MS = 60_000
const SEARCH_RATE_LIMIT_REQUESTS = 60
const CACHE_TTL_MS = 30_000

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    incrementMapMetric("bounds.requests")
    const session = await auth()
    if (!session?.user?.walletAddress) {
      incrementMapMetric("bounds.unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const ip = getClientIp(request)
    if (isRateLimited(`maps-bounds:${ip}`, SEARCH_RATE_LIMIT_REQUESTS, SEARCH_RATE_LIMIT_WINDOW_MS)) {
      incrementMapMetric("bounds.rate_limited")
      return NextResponse.json({ error: "Rate limited" }, { status: 429 })
    }

    const body = (await request.json()) as Partial<BoundsSearchInput>

    const legacyCategory = body.category
    const requestedCategories = Array.isArray((body as { categories?: unknown }).categories)
      ? ((body as { categories?: unknown }).categories as unknown[])
      : []
    const categories = normalizeCategories(legacyCategory, requestedCategories)

    const isValid =
      isNumber(body.northEast?.lat) &&
      isNumber(body.northEast?.lng) &&
      isNumber(body.southWest?.lat) &&
      isNumber(body.southWest?.lng) &&
      categories.length > 0

    if (!isValid) {
      incrementMapMetric("bounds.invalid_payload")
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }

    const basePayload: Omit<BoundsSearchInput, "category"> = {
      northEast: {
        lat: body.northEast!.lat,
        lng: body.northEast!.lng,
      },
      southWest: {
        lat: body.southWest!.lat,
        lng: body.southWest!.lng,
      },
    }

    const cacheKey = [
      "bounds",
      toRoundedCoord(basePayload.northEast.lat),
      toRoundedCoord(basePayload.northEast.lng),
      toRoundedCoord(basePayload.southWest.lat),
      toRoundedCoord(basePayload.southWest.lng),
      categories.join(","),
    ].join(":")

    const cached = getCachedValue<StationMapItem[]>(cacheKey)
    if (cached) {
      incrementMapMetric("bounds.cache_hit")
      return NextResponse.json({ stations: cached })
    }
    incrementMapMetric("bounds.cache_miss")

    const provider = getMapProvider()
    incrementMapMetric("bounds.category_searches", categories.length)
    const providerResults = await Promise.allSettled(
      categories.map((category) => provider.searchBounds({ ...basePayload, category }))
    )
    const stationGroups = providerResults
      .filter((result): result is PromiseFulfilledResult<StationMapItem[]> => result.status === "fulfilled")
      .map((result) => result.value)

    const communityResults = await searchPublishedPoisInBounds({
      northEast: basePayload.northEast,
      southWest: basePayload.southWest,
      categories,
    })
    if (communityResults.length > 0) {
      stationGroups.push(communityResults)
    }

    if (stationGroups.length === 0) {
      incrementMapMetric("bounds.category_all_failed")
      const firstError = providerResults.find((result): result is PromiseRejectedResult => result.status === "rejected")
      throw firstError?.reason ?? new Error("No category searches succeeded")
    }
    incrementMapMetric(
      "bounds.category_partial_failures",
      providerResults.length - providerResults.filter((result) => result.status === "fulfilled").length
    )

    const stations = mergeStationItems(stationGroups.flat())
    incrementMapMetric("bounds.responses")
    setCachedValue(cacheKey, stations, CACHE_TTL_MS)

    return NextResponse.json({ stations })
  } catch (error) {
    incrementMapMetric("bounds.errors")
    console.error("/api/maps/search-bounds error", error)
    return NextResponse.json({ error: "Failed to search stations in bounds" }, { status: 500 })
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
