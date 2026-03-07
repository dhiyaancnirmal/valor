import type { StationMapItem } from "@/types"

export type StationCategory = "gas_station" | "grocery_store"

export interface NearbySearchInput {
  latitude: number
  longitude: number
  radiusMeters: number
  category: StationCategory
}

export interface BoundsSearchInput {
  northEast: { lat: number; lng: number }
  southWest: { lat: number; lng: number }
  category: StationCategory
}

export interface MapProvider {
  searchNearby(input: NearbySearchInput): Promise<StationMapItem[]>
  searchBounds(input: BoundsSearchInput): Promise<StationMapItem[]>
}
