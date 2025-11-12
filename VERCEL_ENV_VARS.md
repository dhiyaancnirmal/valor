# Vercel Environment Variables Setup

## Public Variables (NEXT_PUBLIC_ prefix)
**These are exposed to client-side code - safe to be public**

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBMMId_3TNdLpMJY1X_mCsBC-c_q3tu6JQ
NEXT_PUBLIC_SUPABASE_URL=https://jeledrgsotezchpphgcj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbGVkcmdzb3RlemNocHBoZ2NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4NTYxNzEsImV4cCI6MjA3ODQzMjE3MX0.GepHlpHSPONwydZvnnHZvpyYaRWzcLrY9VesNrdWU4M
```

## Private Variables (Server-side only)
**These are NOT exposed to client-side code - KEEP SECRET**

```
# NextAuth Configuration
NEXTAUTH_SECRET=A2Q3wgYA2um9QQjmDyC8LnQNaHA279SumN4P1HT+VTk=
HMAC_SECRET_KEY=HVPl1JcjG8YBalUZM81hLOqdDz6GS/CmHxEvYo6X7dk=

# Auth URL (update to your Vercel URL)
AUTH_URL=https://your-app.vercel.app

# Supabase Service Role Key (server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplbGVkcmdzb3RlemNocHBoZ2NqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjg1NjE3MSwiZXhwIjoyMDc4NDMyMTcxfQ.DrR6IBaKqCQn7xhjcRlily-hU_-YxxgudIvFcQc_q_8

# Reward Contract Configuration (server-side only)
REWARD_CONTRACT_ADDRESS=0x0C536573b70663e8819f344ae60dfcDeF2c37467
REWARD_SIGNER_PRIVATE_KEY=0xe531d578fb298072dc8731bea5af1d4b57c60c37a555e8071801914943762c8e

# Deployer/Owner Private Key (for batchPayout)
PRIVATE_KEY=0x84bac1679244fbd8398840fc3559dc90ac1784881628557819a8bc3c3444e42e

# Cron Secret for payout API authentication
CRON_SECRET=67debdb951c83fabd5cb38c0d86a93fade00c531eaad6ec7f15396632dba4a2d

# World ID Configuration (server-side only)
APP_ID=app_4d2a86df807eaa9553a851ea9adce618
DEV_PORTAL_API_KEY=api_a2V5XzZjYmQzY2E0ZDYzOGQ5ZDQ2ZDU1ZjE5ODYxZjNlZjBjOnNrXzE2NTAwZmVjMDExMmUzYjI5MWIwMGU5MjE5OGE1M2QwOTc2NDQ5ZmQxODZmMGJlMg

# World Chain RPC URL (optional - has default in code)
# Note: Code uses WORLD_CHAIN_RPC_URL (with underscores), not WORLDCHAIN_RPC
WORLD_CHAIN_RPC_URL=https://worldchain-mainnet.g.alchemy.com/v2/vJp-om_ZDiQBX0HAzO5F2
```

## Variables NOT to include (not used in code)
- `NEXT_PUBLIC_REWARD_CONTRACT_ADDRESS` - Not used anywhere
- `NEXT_PUBLIC_APP_ID` - Not used in client code
- `REWARD_AMOUNT_USDC` - Hardcoded in code (500000)
- `DAILY_REWARD_BUDGET_USD` - Not currently used
- `WORLDCHAIN_RPC` - Use `WORLD_CHAIN_RPC_URL` instead (code expects underscores)

## Notes
- Update `AUTH_URL` to your actual Vercel URL (e.g., `https://valaa.vercel.app`)
- All `NEXT_PUBLIC_*` variables are safe to be public (exposed to client)
- All other variables are server-side only and must be kept secret
- `CRON_SECRET` is used for authenticating the cron job endpoint

