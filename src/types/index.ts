export interface MapVenue {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  distance?: number
  photo?: string
  placeId?: string
  types?: string[]
  categories: ("gas_station" | "grocery_store")[]
  primaryCategory: "gas_station" | "grocery_store"
  submissionMode: "fuel_submit" | "read_only"
  source?: "provider" | "community"
  sourcePlaceIds?: string[]
}

export type GasStation = MapVenue

export interface StationMapItem {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  distance?: number
  placeId: string
  types: string[]
  categories: ("gas_station" | "grocery_store")[]
  primaryCategory: "gas_station" | "grocery_store"
  submissionMode: "fuel_submit" | "read_only"
  source?: "provider" | "community"
  sourcePlaceIds?: string[]
}

export type PoiProposalStatus = "pending" | "published" | "rejected"

export interface CommunityPoi {
  id: string
  name: string
  address: string | null
  latitude: number
  longitude: number
  categories: ("gas_station" | "grocery_store")[]
  primaryCategory: "gas_station" | "grocery_store"
  createdByWallet: string
  proposalId?: string | null
  createdAt: string
}

export interface PoiProposal {
  id: string
  name: string
  normalizedName: string
  address: string | null
  latitude: number
  longitude: number
  categories: ("gas_station" | "grocery_store")[]
  primaryCategory: "gas_station" | "grocery_store"
  notes?: string | null
  createdByWallet: string
  status: PoiProposalStatus
  resolutionReason?: string | null
  publishedPoiId?: string | null
  createdAt: string
  publishedAt?: string | null
  rejectedAt?: string | null
}

export interface PriceSubmission {
  id: string
  user_wallet_address: string
  gas_station_name: string
  gas_station_id: string
  price: number
  fuel_type: "Regular" | "Premium" | "Diesel"
  user_latitude: number
  user_longitude: number
  gas_station_latitude?: number
  gas_station_longitude?: number
  gas_station_address?: string
  currency?: string
  photo_url?: string
  poi_place_id?: string
  poi_name?: string
  poi_lat?: number
  poi_long?: number
  poi_types?: string[]
  created_at: string
}

export interface UserLocation {
  latitude: number
  longitude: number
}

export type FuelType = "Regular" | "Premium" | "Diesel"

export interface RewardTransaction {
  id: number
  submission_id: number
  user_wallet_address: string
  gas_station_id: string
  accrued_amount: string // BigInt as string
  reward_period_date: string // YYYY-MM-DD format
  paid: boolean
  paid_at?: string | null
  payout_tx_hash?: string | null
  created_at: string
  updated_at: string
}
