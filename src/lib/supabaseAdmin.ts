import { createClient } from "@supabase/supabase-js"

type SupabaseValue = string | number | boolean | null | string[] | Record<string, unknown>

type PriceSubmissionRow = {
  id: string
  user_wallet_address: string
  gas_station_name: string
  gas_station_id: string
  gas_station_address: string | null
  price: number | string
  fuel_type: string
  currency: string
  user_latitude: number
  user_longitude: number
  station_latitude: number
  station_longitude: number
  distance_meters: number | null
  price_source: string | null
  receipt_image_url: string | null
  photo_url: string | null
  created_at: string
  updated_at: string
  poi_types: string | null
  [key: string]: SupabaseValue
}

type RewardTransactionRow = {
  id: string
  submission_id: string
  user_wallet_address: string
  gas_station_id: string
  accrued_amount: string | number
  reward_period_date: string
  paid: boolean
  paid_at: string | null
  payout_tx_hash: string | null
  created_at: string
  updated_at: string
  [key: string]: SupabaseValue
}

type PoiRow = {
  id: string
  name: string
  normalized_name: string
  address: string | null
  latitude: number | string
  longitude: number | string
  categories: string[] | null
  primary_category: string
  status: string
  source: string
  created_by_wallet: string
  proposal_id: string | null
  created_at: string
  updated_at: string
  [key: string]: SupabaseValue
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
  updated_at: string
  [key: string]: SupabaseValue
}

type TableSchema<RowType extends Record<string, SupabaseValue>> = {
  Row: RowType
  Insert: Partial<RowType>
  Update: Partial<RowType>
  Relationships: []
}

type SupabaseDatabase = {
  public: {
    Tables: {
      price_submissions: TableSchema<PriceSubmissionRow>
      reward_transactions: TableSchema<RewardTransactionRow>
      pois: TableSchema<PoiRow>
      poi_proposals: TableSchema<PoiProposalRow>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type LooseSupabaseClient = ReturnType<typeof createClient<SupabaseDatabase>>
let cachedClient: LooseSupabaseClient | null = null

export function getSupabaseAdmin() {
  if (cachedClient) return cachedClient

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase service role configuration")
  }

  cachedClient = createClient<SupabaseDatabase>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  })

  return cachedClient
}

// Compatibility export: evaluates lazily at first property access.
export const supabaseAdmin = new Proxy({} as LooseSupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdmin() as object, prop, receiver)
  },
})
