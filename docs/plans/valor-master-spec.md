# Valor Master Spec

## 1) Vision
Valor is a mobile-first World Mini App for crowdsourced pricing of essential goods in markets where reliable digital pricing data is weak.

Initial target markets:
- Argentina
- Mexico
- Colombia

Core promise:
- Find cheaper nearby essentials from trusted community reports.
- Include mom-and-pop stores that are not fully represented on major maps.
- Build market transparency through repeatable, auditable data collection.

## 2) Product Outcomes
Primary outcomes for v1:
1. Reliable nearby POI discovery for grocery + gas.
2. Fast reporting flow for essential goods pricing.
3. Trust-weighted canonical pricing using consensus and contributor reputation.
4. Community moderation for POI quality and suspicious submissions.
5. Strong mobile UX following World Mini App design/app guidelines.

Out of scope for v1:
- reward payouts/token incentives.
- complex social feed mechanics.
- full global launch operations.

## 3) Users and Jobs
### A) Shoppers
- Discover nearby stores and compare essentials.
- Track prices for recurring household items.

### B) Contributors
- Add/update prices quickly.
- Propose missing stores.
- Participate in moderation and earn trust score.

### C) Moderators / Ops
- Resolve disputes and low-confidence data.
- Tune country packs and quality thresholds.

## 4) Functional Scope
### 4.1 Explore
- Interactive map + list views.
- Search/filter by store category, goods, and distance.
- Ranked results by trust-weighted price freshness.

### 4.2 POIs
- Provider POIs from Apple Maps.
- User-created POIs from dropped pin + metadata.
- Lifecycle: `proposed -> community-reviewed -> published/rejected`.

### 4.3 Goods Catalog
- Country-specific curated essentials basket.
- Canonical goods IDs and normalized units.
- Support both raw observed price and normalized unit price.

### 4.4 Reporting
- Select POI, goods item, quantity/pack context, price, currency, optional photo.
- Wallet-signed submission payload.
- Geofence validation with configurable radius.

### 4.5 Trust and Consensus
- Soft scoring launch model (ranking/weighting only, no hard lockout).
- Trust inputs:
  - consensus agreement,
  - recency reliability,
  - World verification strength,
  - moderation quality,
  - abuse penalties.
- Canonical price per `(poi, goods_item, time_window)` using robust median + trust weights.

### 4.6 World Mini App Integration
- Wallet auth.
- Verify for proof-of-humanity signal.
- Request permissions + push notifications for key events.

## 5) Technical Architecture
### 5.1 Client
- Next.js mini-app shell, mobile-first only.
- shadcn component foundation.
- Typography system: `Manrope` only.
- Light mode only.
- Text rules:
  - titles: `font-weight: 200` (ExtraLight),
  - body/ui: `font-weight: 400` (Regular),
  - no bolding.

### 5.2 Map Stack
- MapKit JS for rendering and interaction.
- Apple Maps Server APIs for search/geocoding.
- Internal POI cache and fallback behavior when provider errors/limits occur.

### 5.3 Backend
- Supabase Postgres + storage.
- API routes for POI search/proposal, price reporting, consensus reads, moderation, trust profile.
- Signature verification service for submissions.

### 5.4 Data Domains
- `pois`
- `poi_proposals`
- `goods_catalog`
- `goods_country_availability`
- `price_observations`
- `consensus_snapshots`
- `trust_profiles`
- `moderation_events`

### 5.5 Security and Integrity
- Signed submissions tied to wallet.
- Rate limits and anti-spam controls per user/device/IP.
- Optional batch anchoring proofs later; not required for initial launch.

## 6) UX and Design Standards
- Strictly mobile optimized layout.
- Safe-area aware controls and bottom actions.
- Minimal hierarchy, no decorative excess.
- Focus on task completion speed.
- Must align with:
  - World Mini App Design Guidelines
  - World Mini App App Guidelines

## 7) Success Metrics
- Coverage:
  - published POIs per city,
  - essential goods coverage per city.
- Quality:
  - consensus confidence,
  - dispute rate,
  - moderation turnaround.
- Utility:
  - repeat weekly active users,
  - tracked-item alert engagement,
  - median time to find cheaper option.

## 8) Delivery Policy
- Build milestone-by-milestone from `docs/plans/milestones.md`.
- No milestone merged without passing test gates in `docs/plans/testing-strategy.md`.
- Keep docs updated as implementation source of truth.
