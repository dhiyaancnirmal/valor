# Vercel Environment Variables Setup

## Public Variables (NEXT_PUBLIC_ prefix)
**These are exposed to client-side code - safe to be public**

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS=0xYourRewardContractAddress
```

## Private Variables (Server-side only)
**These are NOT exposed to client-side code - KEEP SECRET**

```
# NextAuth Configuration
NEXTAUTH_SECRET=your-nextauth-secret-here
HMAC_SECRET_KEY=your-hmac-secret-key-here

# Auth URL (update to your Vercel URL)
AUTH_URL=https://your-app.vercel.app

# Supabase Service Role Key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key-here

# Reward Contract Configuration (server-side only)
REWARD_CONTRACT_ADDRESS=0xYourRewardContractAddress
REWARD_SIGNER_PRIVATE_KEY=0xYourRewardSignerPrivateKey

# Deployer/Owner Private Key (for batchPayout)
PRIVATE_KEY=0xYourDeployerPrivateKey

# Cron Secret for payout API authentication
CRON_SECRET=your-cron-secret-here

# World ID Configuration (server-side only)
APP_ID=your-world-app-id
DEV_PORTAL_API_KEY=your-dev-portal-api-key

# World Chain RPC URL (optional - has default in code)
# Note: Code uses WORLD_CHAIN_RPC_URL (with underscores), not WORLDCHAIN_RPC
WORLD_CHAIN_RPC_URL=https://worldchain-mainnet.g.alchemy.com/v2/your-api-key
```
<｜tool▁call▁begin｜>
run_terminal_cmd

## Variables NOT to include (not used in code)
- `NEXT_PUBLIC_APP_ID` - Not used in client code
- `REWARD_AMOUNT_USDC` - Hardcoded in code (500000)
- `DAILY_REWARD_BUDGET_USD` - Not currently used
- `WORLDCHAIN_RPC` - Use `WORLD_CHAIN_RPC_URL` instead (code expects underscores)

## Notes
- Update `AUTH_URL` to your actual Vercel URL (e.g., `https://valaa.vercel.app`)
- All `NEXT_PUBLIC_*` variables are safe to be public (exposed to client)
- All other variables are server-side only and must be kept secret
- `CRON_SECRET` is used for authenticating the cron job endpoint

