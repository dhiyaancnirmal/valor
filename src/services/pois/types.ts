import type { PoiProposal, StationMapItem } from "@/types"

export type PoiCategory = "gas_station" | "grocery_store"

export type PoiProposalCreateInput = {
  name: string
  address: string
  latitude: number
  longitude: number
  categories: PoiCategory[]
  primaryCategory: PoiCategory
  notes?: string
  createdByWallet: string
}

export type ProposalCreateResult = {
  proposal: PoiProposal
  status: "published" | "duplicate_resolved"
  poi?: StationMapItem
}
