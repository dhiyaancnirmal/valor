# Architecture

## App surface
- Locale routes: `src/app/[locale]/*`
- API routes: `src/app/api/*`
- Main UI: `src/components/NewUI/*`

## Core flows

### 1) Authentication
- Client requests nonce from `/api/nonce`.
- Client runs `walletAuth` through MiniKit.
- Credentials provider verifies SIWE payload + nonce.
- Session stores wallet/profile fields.

### 2) Price submission
- User selects station and fuel type.
- Frontend posts multipart form to `/api/submit-price`.
- Backend enforces:
  - authenticated wallet,
  - proximity check,
  - duplicate submission guard.
- Submission persisted to `price_submissions`.

### 3) Legacy Settlement Module
- Legacy accrual data is stored in `reward_transactions` (table name retained).
- Wallet tab fetches accrued settlement balance from `/api/wallet/rewards`.
- Settlement preparation via `/api/prepare-claim` (contract call payloads).
- Post-transaction confirmation via `/api/confirm-claim` marks rows paid.
- Optional admin batch settlement via `/api/payout-rewards`.

## Contracts
- `contracts/RewardVault.sol` (legacy payout contract)
- Scripts in `script/`
- Tests in `contracts/test/`
- Generated artifacts are intentionally excluded from git.
