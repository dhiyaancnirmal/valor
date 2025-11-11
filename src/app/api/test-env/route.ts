import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    has_signer_key: !!process.env.REWARD_SIGNER_PRIVATE_KEY,
    signer_key_length: process.env.REWARD_SIGNER_PRIVATE_KEY?.length || 0,
    has_contract_address: !!process.env.REWARD_CONTRACT_ADDRESS,
    contract_address: process.env.REWARD_CONTRACT_ADDRESS,
    has_app_id: !!process.env.APP_ID,
    has_dev_portal_key: !!process.env.DEV_PORTAL_API_KEY,
    has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    has_supabase_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  })
}
