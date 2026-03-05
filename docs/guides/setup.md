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
- `NEXT_PUBLIC_WORLD_DEV_BYPASS=true`

Dev browser testing outside World App:
- `NEXT_PUBLIC_WORLD_DEV_BYPASS=true` bypasses MiniKit-only app gating for local browser runs.
- Keep this off in production.

## Database
Apply:
- `db/migrations/001_rewards.sql`

## Local run
```bash
npm install
npm run dev
```

Browser testing shortcut:
```bash
npm run dev:browser
```

## Local testing with agent-browser (outside World App)
1. Set `NEXT_PUBLIC_WORLD_DEV_BYPASS=true` in `.env.local`.
2. Start dev server on `http://localhost:3000` (or use `npm run dev:browser`).
3. Use `agent-browser` to open the app and run flows.
4. Login via the dev login button when MiniKit is unavailable.

## World App auth flow
- Backend issues nonce at `/api/nonce` and stores it in secure cookie.
- Client calls `MiniKit.commandsAsync.walletAuth(...)` using that nonce.
- Backend verifies SIWE payload before creating NextAuth session.
