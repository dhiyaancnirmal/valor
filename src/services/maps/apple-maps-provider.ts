import type { StationMapItem } from "@/types"
import { calculateDistance } from "@/lib/utils"
import { createOrGetAppleMapsAccessToken } from "@/services/maps/token"
import type { BoundsSearchInput, MapProvider, NearbySearchInput } from "@/services/maps/types"
import { mergeStationItems } from "@/services/maps/venue-merge"

const APPLE_MAPS_SEARCH_URL = "https://maps-api.apple.com/v1/search"
const POI_CATEGORY_FOR_STATIONS = "GasStation"
const SEARCH_LIMIT = "25"
const TILE_SEARCH_LIMIT = "20"
const BOUNDS_DENSITY_TRIGGER = 20
const MAX_VIEWPORT_RESULTS = 120
const MAX_EXPANSION_SPAN = 1.2

type AppleSearchCoordinate = {
  latitude?: number
  longitude?: number
}

type AppleSearchResult = {
  name?: string
  placeId?: string
  coordinate?: AppleSearchCoordinate
  formattedAddressLines?: string[]
  structuredAddress?: {
    fullThoroughfare?: string
    locality?: string
    administrativeArea?: string
  }
  poiCategory?: unknown
}

type AppleSearchResponse = {
  results?: AppleSearchResult[]
}

type SearchBoundsWindow = {
  northEast: BoundsSearchInput["northEast"]
  southWest: BoundsSearchInput["southWest"]
}

export class AppleMapsProvider implements MapProvider {
  async searchNearby(input: NearbySearchInput): Promise<StationMapItem[]> {
    const categoryQuery = mapCategoryToSearchQuery(input.category)
    const params = new URLSearchParams({
      q: categoryQuery.query,
      resultTypeFilter: "Poi",
      searchLocation: `${input.latitude},${input.longitude}`,
      userLocation: `${input.latitude},${input.longitude}`,
      searchRegionPriority: "required",
      limit: SEARCH_LIMIT,
      lang: "en-US",
    })
    if (categoryQuery.includePoiCategories) {
      params.set("includePoiCategories", categoryQuery.includePoiCategories)
    }

    const response = await runAppleSearchWithFallback(params)

    return response
      .map((result) => toStationMapItem(result, input.latitude, input.longitude, input.category))
      .filter((station): station is StationMapItem => station !== null)
      .filter((station) => {
        if (typeof station.distance !== "number") return true
        return station.distance <= input.radiusMeters
      })
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
  }

  async searchBounds(input: BoundsSearchInput): Promise<StationMapItem[]> {
    const normalized = normalizeBounds(input)
    const centerLat = (normalized.northEast.lat + normalized.southWest.lat) / 2
    const centerLng = (normalized.northEast.lng + normalized.southWest.lng) / 2
    const latSpan = Math.abs(normalized.northEast.lat - normalized.southWest.lat)
    const lngSpan = Math.abs(normalized.northEast.lng - normalized.southWest.lng)
    const maxSpan = Math.max(latSpan, lngSpan)
    const categoryQuery = mapCategoryToSearchQuery(input.category)

    const primaryResponse = await searchBoundsRegionWithCenterFallback({
      bounds: normalized,
      centerLat,
      centerLng,
      categoryQuery,
      limit: SEARCH_LIMIT,
    })

    let stations = primaryResponse
      .map((result) => toStationMapItem(result, centerLat, centerLng, input.category))
      .filter((station): station is StationMapItem => station !== null)

    const shouldExpand =
      primaryResponse.length >= BOUNDS_DENSITY_TRIGGER &&
      maxSpan <= MAX_EXPANSION_SPAN

    if (shouldExpand) {
      const tiles = splitBoundsIntoTiles(normalized)
      const tileResults = await Promise.allSettled(
        tiles.map((tile) =>
          searchBoundsRegionWithCenterFallback({
            bounds: tile,
            centerLat,
            centerLng,
            categoryQuery,
            limit: TILE_SEARCH_LIMIT,
          })
        )
      )

      for (const result of tileResults) {
        if (result.status !== "fulfilled") continue
        const tileStations = result.value
          .map((item) => toStationMapItem(item, centerLat, centerLng, input.category))
          .filter((item): item is StationMapItem => item !== null)
        if (tileStations.length > 0) {
          stations = stations.concat(tileStations)
        }
      }
    }

    return mergeStationItems(stations)
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, MAX_VIEWPORT_RESULTS)
  }
}

async function runAppleSearch(params: URLSearchParams) {
  const token = await createOrGetAppleMapsAccessToken()
  const response = await fetch(`${APPLE_MAPS_SEARCH_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Apple Maps search failed (${response.status}): ${errorBody}`)
  }

  const payload = (await response.json()) as AppleSearchResponse
  return payload.results ?? []
}

async function runAppleSearchWithFallback(params: URLSearchParams) {
  try {
    return await runAppleSearch(params)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    const hasCategoryFilter = params.has("includePoiCategories")
    const maybeBadCategoryFilter = message.includes("(400)") || message.includes("(422)")

    if (!hasCategoryFilter || !maybeBadCategoryFilter) {
      throw error
    }

    const retryParams = new URLSearchParams(params)
    retryParams.delete("includePoiCategories")
    return runAppleSearch(retryParams)
  }
}

function toStationMapItem(
  result: AppleSearchResult,
  originLat: number,
  originLng: number,
  fallbackCategory: NearbySearchInput["category"]
): StationMapItem | null {
  const latitude = result.coordinate?.latitude
  const longitude = result.coordinate?.longitude

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null
  }

  const address = resolveAddress(result)
  const placeId = result.placeId ?? `${result.name ?? "station"}:${latitude}:${longitude}`

  const categories = inferCategories(result.poiCategory, fallbackCategory)
  const normalizedPoiTypes = normalizePoiTypes(result.poiCategory)
  return {
    id: placeId,
    name: result.name ?? "Unknown station",
    address,
    latitude,
    longitude,
    distance: calculateDistance(originLat, originLng, latitude, longitude),
    placeId,
    types: normalizedPoiTypes.length > 0 ? normalizedPoiTypes : [POI_CATEGORY_FOR_STATIONS],
    categories,
    primaryCategory: categories.includes("grocery_store") ? "grocery_store" : "gas_station",
    submissionMode: categories.includes("gas_station") ? "fuel_submit" : "read_only",
    source: "provider",
    sourcePlaceIds: [placeId],
  }
}

function resolveAddress(result: AppleSearchResult) {
  if (Array.isArray(result.formattedAddressLines) && result.formattedAddressLines.length > 0) {
    return result.formattedAddressLines.join(", ")
  }

  const structured = result.structuredAddress
  const parts = [structured?.fullThoroughfare, structured?.locality, structured?.administrativeArea].filter(Boolean)

  return parts.length > 0 ? parts.join(", ") : ""
}

function mapCategoryToSearchQuery(category: NearbySearchInput["category"]) {
  switch (category) {
    case "gas_station":
      return {
        query: "gas station",
        includePoiCategories: POI_CATEGORY_FOR_STATIONS,
      }
    case "grocery_store":
      return {
        query: "grocery store supermarket market convenience store",
        includePoiCategories: undefined,
      }
    default:
      return {
        query: "gas station",
        includePoiCategories: POI_CATEGORY_FOR_STATIONS,
      }
  }
}

async function searchBoundsRegionWithCenterFallback(input: {
  bounds: SearchBoundsWindow
  centerLat: number
  centerLng: number
  categoryQuery: ReturnType<typeof mapCategoryToSearchQuery>
  limit: string
}) {
  const regionParams = new URLSearchParams({
    q: input.categoryQuery.query,
    resultTypeFilter: "Poi",
    searchRegion: `${input.bounds.northEast.lat},${input.bounds.northEast.lng},${input.bounds.southWest.lat},${input.bounds.southWest.lng}`,
    userLocation: `${input.centerLat},${input.centerLng}`,
    searchRegionPriority: "required",
    limit: input.limit,
    lang: "en-US",
  })
  if (input.categoryQuery.includePoiCategories) {
    regionParams.set("includePoiCategories", input.categoryQuery.includePoiCategories)
  }

  try {
    return await runAppleSearchWithFallback(regionParams)
  } catch (error) {
    // Fallback for occasional invalid region payloads from runtime bounds.
    console.warn("Apple bounds search failed, retrying with center fallback", error)
    const fallbackParams = new URLSearchParams({
      q: input.categoryQuery.query,
      resultTypeFilter: "Poi",
      searchLocation: `${input.centerLat},${input.centerLng}`,
      userLocation: `${input.centerLat},${input.centerLng}`,
      limit: input.limit,
      lang: "en-US",
    })
    if (input.categoryQuery.includePoiCategories) {
      fallbackParams.set("includePoiCategories", input.categoryQuery.includePoiCategories)
    }
    return runAppleSearchWithFallback(fallbackParams)
  }
}

function splitBoundsIntoTiles(bounds: SearchBoundsWindow) {
  const midLat = (bounds.northEast.lat + bounds.southWest.lat) / 2
  const midLng = (bounds.northEast.lng + bounds.southWest.lng) / 2

  return [
    {
      northEast: { lat: bounds.northEast.lat, lng: bounds.northEast.lng },
      southWest: { lat: midLat, lng: midLng },
    },
    {
      northEast: { lat: bounds.northEast.lat, lng: midLng },
      southWest: { lat: midLat, lng: bounds.southWest.lng },
    },
    {
      northEast: { lat: midLat, lng: bounds.northEast.lng },
      southWest: { lat: bounds.southWest.lat, lng: midLng },
    },
    {
      northEast: { lat: midLat, lng: midLng },
      southWest: { lat: bounds.southWest.lat, lng: bounds.southWest.lng },
    },
  ]
}

function inferCategories(poiCategory: unknown, fallbackCategory: NearbySearchInput["category"]) {
  const value = normalizePoiTypes(poiCategory).join(",").toLowerCase()
  const categories: Array<"gas_station" | "grocery_store"> = []

  if (value.includes("gas")) categories.push("gas_station")
  if (value.includes("store") || value.includes("market") || value.includes("supermarket") || value.includes("grocery")) {
    categories.push("grocery_store")
  }

  if (categories.length === 0) categories.push(fallbackCategory)
  return Array.from(new Set(categories))
}

function normalizePoiTypes(poiCategory: unknown) {
  if (!poiCategory) return []

  if (Array.isArray(poiCategory)) {
    return poiCategory
      .map((entry) => {
        if (typeof entry === "string") return entry
        if (entry && typeof entry === "object") {
          if (typeof (entry as { name?: unknown }).name === "string") {
            return (entry as { name: string }).name
          }
          return JSON.stringify(entry)
        }
        return String(entry)
      })
      .filter((value) => value.length > 0)
  }

  if (typeof poiCategory === "string") {
    return [poiCategory]
  }

  if (poiCategory && typeof poiCategory === "object") {
    const maybeName = (poiCategory as { name?: unknown }).name
    if (typeof maybeName === "string") return [maybeName]
    return [JSON.stringify(poiCategory)]
  }

  return [String(poiCategory)]
}

function normalizeBounds(input: BoundsSearchInput) {
  const neLat = clamp(input.northEast.lat, -85, 85)
  const swLat = clamp(input.southWest.lat, -85, 85)
  const neLng = clamp(input.northEast.lng, -180, 180)
  const swLng = clamp(input.southWest.lng, -180, 180)

  const north = Math.max(neLat, swLat)
  const south = Math.min(neLat, swLat)

  // Apple searchRegion doesn't handle anti-meridian split well in this usage.
  // Keep east >= west to avoid 400 responses and use center fallback when needed.
  const east = Math.max(neLng, swLng)
  const west = Math.min(neLng, swLng)

  const safeNorth = north === south ? clamp(north + 0.0001, -85, 85) : north
  const safeSouth = north === south ? clamp(south - 0.0001, -85, 85) : south
  const safeEast = east === west ? clamp(east + 0.0001, -180, 180) : east
  const safeWest = east === west ? clamp(west - 0.0001, -180, 180) : west

  return {
    northEast: { lat: safeNorth, lng: safeEast },
    southWest: { lat: safeSouth, lng: safeWest },
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}
