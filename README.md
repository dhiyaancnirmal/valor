# Valor

World Mini App for crowdsourced essential-goods pricing intelligence.

## What this repo contains
- Next.js 16 mini app with World MiniKit wallet auth.
- Grocery + gas discovery + price submission flow.
- Trust and consensus rebuild planning for data quality.
- Legacy payout contract module + Foundry scripts/tests.
- Public showcase route: `/[locale]/showcase`.

## Project status
This repository was cleaned and hardened from a hackathon prototype. The focus is now:
- secure wallet authentication,
- robust crowdsourced data quality,
- cleaner architecture and docs,
- better public-facing presentation.

## Product screenshots
- Capture guide: `docs/guides/screenshot-runbook.md`
- Screenshot directory: `public/showcase/`

Expected files:
- `01-login-en.png`
- `02-home-en.png`
- `03-submit-review-en.png`
- `04-wallet-en.png`
- `05-showcase-en.png`
- `06-home-es-ar.png`

Once added, they are rendered in:
- `/en/showcase`
- `/es-AR/showcase`

## Quick start
1. Install dependencies:
```bash
npm install
```
2. Create `.env.local` from `.env.example` and fill required values.
3. Apply DB schema in Supabase using:
- `db/migrations/001_rewards.sql` (legacy table name retained)
4. Run dev server:
```bash
npm run dev
```
5. For World App testing, use an HTTPS tunnel and set `AUTH_URL` to the tunnel URL.

## Browser testing workaround (outside World App)
- Set `NEXT_PUBLIC_WORLD_DEV_BYPASS=true` in `.env.local`.
- Keep `ENABLE_DEV_AUTH=true` + `NEXT_PUBLIC_ENABLE_DEV_AUTH=true` for dev login.
- Run flows with the `agent-browser` CLI against `http://localhost:3000`.
- Shortcut: `npm run dev:browser`

## Useful scripts
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `npm run test:contracts`

## Docs
- Setup: `docs/guides/setup.md`
- Agent-browser testing: `docs/guides/agent-browser-testing.md`
- Deployment: `docs/guides/deploy.md`
- Architecture: `docs/reference/architecture.md`
- Planning Vault: `docs/plans/README.md`
- Master Spec: `docs/plans/valor-master-spec.md`
- Milestones: `docs/plans/milestones.md`
- Testing Strategy: `docs/plans/testing-strategy.md`

## World references
- Wallet auth: https://docs.world.org/mini-apps/commands/wallet-auth
- Send transaction: https://docs.world.org/mini-apps/commands/send-transaction
- Mini app quickstart: https://docs.world.org/mini-apps/quick-start/installing
