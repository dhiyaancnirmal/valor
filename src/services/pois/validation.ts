import type { PoiCategory, PoiProposalCreateInput } from "@/services/pois/types"

export function normalizePoiName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function parseProposalPayload(payload: Record<string, unknown>) {
  const name = typeof payload.name === "string" ? payload.name.trim() : ""
  const address = typeof payload.address === "string" ? payload.address.trim() : ""
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : ""

  const latitude = Number(payload.latitude)
  const longitude = Number(payload.longitude)

  const incomingCategories = Array.isArray(payload.categories) ? payload.categories : []
  const categories = Array.from(
    new Set(
      incomingCategories.filter(
        (value): value is PoiCategory => value === "gas_station" || value === "grocery_store"
      )
    )
  )

  const primaryCategory = payload.primaryCategory === "gas_station" || payload.primaryCategory === "grocery_store"
    ? payload.primaryCategory
    : categories[0]

  if (name.length < 2 || name.length > 120) {
    return { ok: false as const, error: "Invalid name" }
  }

  if (address.length < 3) {
    return { ok: false as const, error: "Invalid address" }
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false as const, error: "Invalid coordinates" }
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { ok: false as const, error: "Coordinates out of range" }
  }

  if (categories.length === 0) {
    return { ok: false as const, error: "Missing categories" }
  }

  if (!primaryCategory || !categories.includes(primaryCategory)) {
    return { ok: false as const, error: "Invalid primaryCategory" }
  }

  const data = {
    name,
    address,
    latitude,
    longitude,
    categories,
    primaryCategory,
    notes: notes.length > 0 ? notes : undefined,
  }

  return { ok: true as const, data }
}

export function toProposalInsertData(input: PoiProposalCreateInput) {
  return {
    name: input.name,
    normalized_name: normalizePoiName(input.name),
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    categories: input.categories,
    primary_category: input.primaryCategory,
    notes: input.notes ?? null,
    created_by_wallet: input.createdByWallet,
    status: "pending",
  }
}

export function toPoiInsertData(input: PoiProposalCreateInput & { proposalId: string }) {
  return {
    name: input.name,
    normalized_name: normalizePoiName(input.name),
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    categories: input.categories,
    primary_category: input.primaryCategory,
    status: "published",
    source: "community",
    created_by_wallet: input.createdByWallet,
    proposal_id: input.proposalId,
  }
}
