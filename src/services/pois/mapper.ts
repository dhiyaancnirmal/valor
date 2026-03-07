import type { PoiProposal, StationMapItem } from "@/types"
import type { PoiCategory } from "@/services/pois/types"

type PoiRowLike = {
  id: string
  name: string
  address: string | null
  latitude: number | string
  longitude: number | string
  categories: string[] | null
  primary_category: string
  created_by_wallet: string
  proposal_id?: string | null
  created_at: string
}

type PoiProposalRowLike = {
  id: string
  name: string
  normalized_name: string
  address: string | null
  latitude: number | string
  longitude: number | string
  categories: string[] | null
  primary_category: string
  notes?: string | null
  created_by_wallet: string
  status: string
  resolution_reason?: string | null
  published_poi_id?: string | null
  created_at: string
  published_at?: string | null
  rejected_at?: string | null
}

export function toStationMapItemFromPoi(row: PoiRowLike): StationMapItem {
  const categories = sanitizeCategories(row.categories)
  const primaryCategory = categories.includes("grocery_store") ? "grocery_store" : "gas_station"

  return {
    id: row.id,
    name: row.name,
    address: row.address ?? "",
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    placeId: `community:${row.id}`,
    types: ["community_poi"],
    categories,
    primaryCategory,
    submissionMode: categories.includes("gas_station") ? "fuel_submit" : "read_only",
    source: "community",
    sourcePlaceIds: [`community:${row.id}`],
  }
}

export function toPoiProposal(row: PoiProposalRowLike): PoiProposal {
  return {
    id: row.id,
    name: row.name,
    normalizedName: row.normalized_name,
    address: row.address,
    latitude: toNumber(row.latitude),
    longitude: toNumber(row.longitude),
    categories: sanitizeCategories(row.categories),
    primaryCategory: row.primary_category === "grocery_store" ? "grocery_store" : "gas_station",
    notes: row.notes ?? null,
    createdByWallet: row.created_by_wallet,
    status: sanitizeStatus(row.status),
    resolutionReason: row.resolution_reason ?? null,
    publishedPoiId: row.published_poi_id ?? null,
    createdAt: row.created_at,
    publishedAt: row.published_at ?? null,
    rejectedAt: row.rejected_at ?? null,
  }
}

function sanitizeStatus(value: string): PoiProposal["status"] {
  if (value === "published" || value === "rejected" || value === "pending") {
    return value
  }
  return "pending"
}

function sanitizeCategories(categories: string[] | null | undefined): PoiCategory[] {
  if (!Array.isArray(categories)) return ["grocery_store"]

  const out = new Set<PoiCategory>()
  for (const category of categories) {
    if (category === "gas_station" || category === "grocery_store") {
      out.add(category)
    }
  }

  if (out.size === 0) {
    out.add("grocery_store")
  }

  return Array.from(out)
}

function toNumber(value: number | string) {
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}
