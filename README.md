# Valor

World Mini App for crowdsourced gas prices with rewards.

## What this repo contains
- Next.js 16 mini app with World MiniKit wallet auth.
- Gas station discovery + price submission flow.
- Reward accrual and claim APIs.
- RewardVault Solidity contract + Foundry scripts/tests.
- Public showcase route: `/[locale]/showcase`.

## Project status
This repository was cleaned and hardened from a hackathon prototype. The focus is now:
- secure wallet authentication,
- stable reward operations,
- cleaner architecture and docs,
- better public-facing presentation.

## Quick start
1. Install dependencies:
```bash
npm install
```
2. Create `.env.local` from `.env.example` and fill required values.
3. Apply DB schema in Supabase using:
- `db/migrations/001_rewards.sql`
4. Run dev server:
```bash
npm run dev
```
5. For World App testing, use an HTTPS tunnel and set `AUTH_URL` to the tunnel URL.

## Useful scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `npm run test:contracts`

## Docs
- Setup: `docs/setup.md`
- Deployment: `docs/deploy.md`
- Architecture: `docs/architecture.md`

## World references
- Wallet auth: https://docs.world.org/mini-apps/commands/wallet-auth
- Send transaction: https://docs.world.org/mini-apps/commands/send-transaction
- Mini app quickstart: https://docs.world.org/mini-apps/quick-start/installing
