# Deployment

## Vercel
1. Import repository in Vercel.
2. Set all required environment variables.
3. Deploy.

## Scheduled payout endpoint
- Endpoint: `POST /api/payout-rewards`
- Requires secret token via either:
  - `Authorization: Bearer <CRON_SECRET>`
  - `x-vercel-cron: <CRON_SECRET>`
- Do not expose this endpoint without a configured secret.

## Post-deploy checks
- `GET /` renders and login works.
- `GET /en/showcase` (or `/es-AR/showcase`) renders.
- Wallet auth succeeds in World App.
- Reward claim flow works (`prepare-claim` + `confirm-claim`).
