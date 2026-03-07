import { supabaseAdmin } from "@/lib/supabaseAdmin"
import { calculateDistance } from "@/lib/utils"
import { toPoiProposal, toStationMapItemFromPoi } from "@/services/pois/mapper"
import { normalizePoiName, toPoiInsertData, toProposalInsertData } from "@/services/pois/validation"
import type { PoiProposal, StationMapItem } from "@/types"
import type { PoiCategory, PoiProposalCreateInput, ProposalCreateResult } from "@/services/pois/types"

const DEDUPE_RADIUS_METERS = 250

type PoiRow = {
  id: string
  name: string
  normalized_name: string
  address: string | null
  latitude: number | string
  longitude: number | string
  categories: string[] | null
  primary_category: string
  created_by_wallet: string
  proposal_id: string | null
  created_at: string
}

type PoiProposalRow = {
  id: string
  name: string
  normalized_name: string
  address: string | null
  latitude: number | string
  longitude: number | string
  categories: string[] | null
  primary_category: string
  notes: string | null
  created_by_wallet: string
  status: string
  resolution_reason: string | null
  published_poi_id: string | null
  created_at: string
  published_at: string | null
  rejected_at: string | null
}

export async function createPoiProposal(input: PoiProposalCreateInput): Promise<ProposalCreateResult> {
  const normalizedName = normalizePoiName(input.name)
  const duplicatePoi = await findDuplicatePoi(input, normalizedName)

  if (duplicatePoi) {
    const { data: proposalData, error: proposalError } = await supabaseAdmin
      .from("poi_proposals")
      .insert({
        ...toProposalInsertData(input),
        status: "published",
        resolution_reason: "duplicate_resolved",
        published_poi_id: duplicatePoi.id,
        published_at: new Date().toISOString(),
      })
      .select("*")
      .single()

    if (proposalError || !proposalData) {
      throw new Error(proposalError?.message ?? "Failed to create proposal")
    }

    return {
      proposal: toPoiProposal(proposalData as PoiProposalRow),
      status: "duplicate_resolved",
      poi: toStationMapItemFromPoi(duplicatePoi),
    }
  }

  const { data: proposalData, error: proposalError } = await supabaseAdmin
    .from("poi_proposals")
    .insert(toProposalInsertData(input))
    .select("*")
    .single()

  if (proposalError || !proposalData) {
    throw new Error(proposalError?.message ?? "Failed to create proposal")
  }

  const proposal = proposalData as PoiProposalRow

  const { data: poiData, error: poiError } = await supabaseAdmin
    .from("pois")
    .insert(toPoiInsertData({ ...input, proposalId: proposal.id }))
    .select("*")
    .single()

  if (poiError || !poiData) {
    throw new Error(poiError?.message ?? "Failed to publish POI")
  }

  const now = new Date().toISOString()
  const { data: updatedProposal, error: updateError } = await supabaseAdmin
    .from("poi_proposals")
    .update({
      status: "published",
      published_poi_id: (poiData as PoiRow).id,
      published_at: now,
    })
    .eq("id", proposal.id)
    .select("*")
    .single()

  if (updateError || !updatedProposal) {
    throw new Error(updateError?.message ?? "Failed to update proposal status")
  }

  return {
    proposal: toPoiProposal(updatedProposal as PoiProposalRow),
    status: "published",
    poi: toStationMapItemFromPoi(poiData as PoiRow),
  }
}

export async function getMyPoiProposals(walletAddress: string): Promise<PoiProposal[]> {
  let data: PoiProposalRow[] | null = null
  let error: { message: string } | null = null
  try {
    const response = await supabaseAdmin
      .from("poi_proposals")
      .select("*")
      .eq("created_by_wallet", walletAddress)
      .order("created_at", { ascending: false })
      .limit(100)
    data = response.data as PoiProposalRow[] | null
    error = response.error as { message: string } | null
  } catch (caughtError) {
    if (isMissingSupabaseConfig(caughtError)) return []
    throw caughtError
  }

  if (error) {
    if (isMissingTableError(error.message)) return []
    throw new Error(error.message)
  }

  const rows = (data ?? []) as PoiProposalRow[]
  return rows.map(toPoiProposal)
}

export async function searchPublishedPoisNearby(input: {
  latitude: number
  longitude: number
  radiusMeters: number
  categories: PoiCategory[]
}): Promise<StationMapItem[]> {
  const { latitude, longitude, radiusMeters, categories } = input
  const { minLat, maxLat, minLng, maxLng } = getBoundingBox(latitude, longitude, radiusMeters)

  let data: PoiRow[] | null = null
  let error: { message: string } | null = null
  try {
    const response = await supabaseAdmin
      .from("pois")
      .select("*")
      .eq("status", "published")
      .overlaps("categories", categories)
      .gte("latitude", minLat)
      .lte("latitude", maxLat)
      .gte("longitude", minLng)
      .lte("longitude", maxLng)
      .limit(120)
    data = response.data as PoiRow[] | null
    error = response.error as { message: string } | null
  } catch (caughtError) {
    if (isMissingSupabaseConfig(caughtError)) return []
    throw caughtError
  }

  if (error) {
    if (isMissingTableError(error.message)) return []
    throw new Error(error.message)
  }

  return ((data ?? []) as PoiRow[])
    .map((row) => {
      const item = toStationMapItemFromPoi(row)
      item.distance = calculateDistance(latitude, longitude, item.latitude, item.longitude)
      return item
    })
    .filter((item) => (item.distance ?? radiusMeters + 1) <= radiusMeters)
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
}

export async function searchPublishedPoisInBounds(input: {
  northEast: { lat: number; lng: number }
  southWest: { lat: number; lng: number }
  categories: PoiCategory[]
}): Promise<StationMapItem[]> {
  const north = Math.max(input.northEast.lat, input.southWest.lat)
  const south = Math.min(input.northEast.lat, input.southWest.lat)
  const east = Math.max(input.northEast.lng, input.southWest.lng)
  const west = Math.min(input.northEast.lng, input.southWest.lng)

  const centerLat = (north + south) / 2
  const centerLng = (east + west) / 2

  let data: PoiRow[] | null = null
  let error: { message: string } | null = null
  try {
    const response = await supabaseAdmin
      .from("pois")
      .select("*")
      .eq("status", "published")
      .overlaps("categories", input.categories)
      .gte("latitude", south)
      .lte("latitude", north)
      .gte("longitude", west)
      .lte("longitude", east)
      .limit(200)
    data = response.data as PoiRow[] | null
    error = response.error as { message: string } | null
  } catch (caughtError) {
    if (isMissingSupabaseConfig(caughtError)) return []
    throw caughtError
  }

  if (error) {
    if (isMissingTableError(error.message)) return []
    throw new Error(error.message)
  }

  return ((data ?? []) as PoiRow[])
    .map((row) => {
      const item = toStationMapItemFromPoi(row)
      item.distance = calculateDistance(centerLat, centerLng, item.latitude, item.longitude)
      return item
    })
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
}

async function findDuplicatePoi(input: PoiProposalCreateInput, normalizedName: string): Promise<PoiRow | null> {
  const { minLat, maxLat, minLng, maxLng } = getBoundingBox(input.latitude, input.longitude, DEDUPE_RADIUS_METERS)

  let data: PoiRow[] | null = null
  let error: { message: string } | null = null
  try {
    const response = await supabaseAdmin
      .from("pois")
      .select("*")
      .eq("status", "published")
      .gte("latitude", minLat)
      .lte("latitude", maxLat)
      .gte("longitude", minLng)
      .lte("longitude", maxLng)
      .limit(80)
    data = response.data as PoiRow[] | null
    error = response.error as { message: string } | null
  } catch (caughtError) {
    if (isMissingSupabaseConfig(caughtError)) return null
    throw caughtError
  }

  if (error) {
    if (isMissingTableError(error.message)) return null
    throw new Error(error.message)
  }

  const rows = (data ?? []) as PoiRow[]
  const duplicates = rows.filter((row) => {
    if (normalizePoiName(row.name) !== normalizedName) return false
    const rowCategories = new Set((row.categories ?? []).filter((v): v is PoiCategory => v === "gas_station" || v === "grocery_store"))
    const sharesCategory = input.categories.some((category) => rowCategories.has(category))
    if (!sharesCategory) return false

    const distance = calculateDistance(
      input.latitude,
      input.longitude,
      toNumber(row.latitude),
      toNumber(row.longitude)
    )
    return distance <= DEDUPE_RADIUS_METERS
  })

  return duplicates[0] ?? null
}

function getBoundingBox(latitude: number, longitude: number, radiusMeters: number) {
  const latDelta = radiusMeters / 111_320
  const cosLat = Math.cos((latitude * Math.PI) / 180)
  const lngDelta = radiusMeters / Math.max(111_320 * Math.abs(cosLat), 1e-6)

  return {
    minLat: latitude - latDelta,
    maxLat: latitude + latDelta,
    minLng: longitude - lngDelta,
    maxLng: longitude + lngDelta,
  }
}

function toNumber(value: number | string) {
  if (typeof value === "number") return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function isMissingTableError(message: string) {
  const text = message.toLowerCase()
  return text.includes("does not exist") || text.includes("schema cache") || text.includes("relation")
}

function isMissingSupabaseConfig(error: unknown) {
  if (!(error instanceof Error)) return false
  return error.message.includes("Missing Supabase service role configuration")
}
