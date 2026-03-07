import { calculateDistance } from "@/lib/utils"
import type { StationCategory } from "@/services/maps/types"
import type { StationMapItem } from "@/types"

const MERGE_RADIUS_METERS = 20
const STOPWORDS = new Set([
  "the",
  "and",
  "market",
  "store",
  "station",
  "gas",
  "fuel",
  "mart",
  "shop",
  "llc",
  "inc",
  "co",
  "company",
])

type Mergeable = StationMapItem & {
  normalizedAddress?: string
  brandTokens?: string[]
}

export function mergeStationItems(items: StationMapItem[]): StationMapItem[] {
  const merged: Mergeable[] = []

  for (const item of items) {
    const normalizedItem = enrich(item)
    const existingIndex = merged.findIndex((candidate) => shouldMerge(candidate, normalizedItem))
    if (existingIndex === -1) {
      merged.push(normalizedItem)
      continue
    }

    merged[existingIndex] = mergePair(merged[existingIndex], normalizedItem)
  }

  return merged.map(stripEnrichment)
}

function shouldMerge(a: Mergeable, b: Mergeable) {
  if (a.placeId && b.placeId && a.placeId === b.placeId) {
    return true
  }

  const distance = calculateDistance(a.latitude, a.longitude, b.latitude, b.longitude)
  if (distance > MERGE_RADIUS_METERS) {
    return false
  }

  const addressMatch = Boolean(a.normalizedAddress) && a.normalizedAddress === b.normalizedAddress
  const brandOverlap = tokenOverlap(a.brandTokens ?? [], b.brandTokens ?? []) > 0

  return addressMatch || brandOverlap
}

function mergePair(a: Mergeable, b: Mergeable): Mergeable {
  const categories = uniqueCategories([...(a.categories ?? []), ...(b.categories ?? [])])
  const sourcePlaceIds = uniqueStrings([...(a.sourcePlaceIds ?? []), ...(b.sourcePlaceIds ?? []), a.placeId, b.placeId])
  const primaryCategory: StationCategory = categories.includes("grocery_store") ? "grocery_store" : "gas_station"
  const submissionMode = categories.includes("gas_station") ? "fuel_submit" : "read_only"

  const winner = chooseDisplayWinner(a, b)
  const distance = [a.distance, b.distance].filter((value): value is number => typeof value === "number")

  return enrich({
    ...winner,
    id: winner.id || a.id || b.id,
    placeId: winner.placeId || a.placeId || b.placeId,
    categories,
    primaryCategory,
    submissionMode,
    sourcePlaceIds,
    types: uniqueStrings([...(a.types ?? []), ...(b.types ?? [])]),
    distance: distance.length > 0 ? Math.min(...distance) : undefined,
  })
}

function chooseDisplayWinner(a: StationMapItem, b: StationMapItem) {
  const aScore = scoreDisplay(a)
  const bScore = scoreDisplay(b)
  return aScore >= bScore ? a : b
}

function scoreDisplay(item: StationMapItem) {
  const nameScore = item.name?.length ?? 0
  const addressScore = item.address?.length ?? 0
  const categoryScore = item.categories?.includes("grocery_store") ? 4 : 0
  return nameScore + addressScore + categoryScore
}

function enrich(item: StationMapItem): Mergeable {
  return {
    ...item,
    normalizedAddress: normalizeAddress(item.address),
    brandTokens: extractBrandTokens(item.name),
  }
}

function stripEnrichment(item: Mergeable): StationMapItem {
  const rest = { ...item }
  delete rest.normalizedAddress
  delete rest.brandTokens
  return rest
}

function normalizeAddress(value?: string) {
  if (!value) return ""
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function extractBrandTokens(value?: string) {
  if (!value) return []
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOPWORDS.has(token))
}

function tokenOverlap(a: string[], b: string[]) {
  if (a.length === 0 || b.length === 0) return 0
  const setA = new Set(a)
  let overlap = 0
  for (const token of b) {
    if (setA.has(token)) overlap += 1
  }
  return overlap
}

function uniqueStrings(values: Array<string | undefined>) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const value of values) {
    if (!value || seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}

function uniqueCategories(values: StationCategory[]) {
  const out: StationCategory[] = []
  const seen = new Set<StationCategory>()
  for (const value of values) {
    if (seen.has(value)) continue
    seen.add(value)
    out.push(value)
  }
  return out
}
