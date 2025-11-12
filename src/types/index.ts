export interface GasStation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  distance?: number
  photo?: string
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
  photo_url?: string
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
