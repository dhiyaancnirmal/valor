# Setup

## Prerequisites
- Node.js 20+
- npm
- Supabase project
- Google Maps API key (Places enabled)
- World mini app App ID + portal key

## Environment variables
Set these in `.env.local`:

- `NEXTAUTH_SECRET`
- `AUTH_URL` (must be HTTPS in World App)
- `HMAC_SECRET_KEY`
- `NEXT_PUBLIC_APP_ID`
- `APP_ID`
- `DEV_PORTAL_API_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `REWARD_CONTRACT_ADDRESS`
- `REWARD_SIGNER_PRIVATE_KEY`
- `PRIVATE_KEY` (only needed for admin payout scripts/endpoint)
- `WORLD_CHAIN_RPC_URL`
- `CRON_SECRET`

Optional development-only auth:
- `ENABLE_DEV_AUTH=true`
- `NEXT_PUBLIC_ENABLE_DEV_AUTH=true`

## Database
Apply:
- `db/migrations/001_rewards.sql`

## Local run
```bash
npm install
npm run dev
```

## World App auth flow
- Backend issues nonce at `/api/nonce` and stores it in secure cookie.
- Client calls `MiniKit.commandsAsync.walletAuth(...)` using that nonce.
- Backend verifies SIWE payload before creating NextAuth session.
