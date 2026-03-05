# Milestones and Execution Plan

## Milestone 0: Repo and Design Baseline Cleanup
Goal: prepare a stable, polished baseline for iterative delivery.

Deliverables:
- Final docs structure (`docs/guides`, `docs/reference`, `docs/plans`).
- Remove reward-first language across repo copy/docs/comments where safe.
- Introduce global design tokens for light-mode-only, Manrope-only typography.
- Enforce typography rules in shared components.
- Immediate UX polish for login/home/map/wallet/settings flows.

Commit slices:
1. `docs(m0): reorganize docs and planning vault`
2. `refactor(m0): baseline structure cleanup (non-breaking)`
3. `refactor(m0): centralize typography and light-mode tokens`
4. `refactor(m0): remove reward-centric language + polish core screens`

Acceptance:
- App builds and runs.
- No dark mode UI paths remain in active product flow.
- All headings/body text follow 200/400 weight rules.
- Local validation gates pass (typecheck/lint/dev:browser/agent-browser smoke).

---

## Milestone 1: Apple Maps Integration (Provider Swap)
Goal: replace Google Maps and place search with Apple stack.

Deliverables:
- `MapProvider` abstraction with Apple implementation.
- New map token API endpoint.
- Interactive map rendering + marker plotting + bounds events.
- Search nearby grocery/gas POIs via Apple APIs.

Commit slices:
1. `feat(m1): add map provider abstraction and Apple client`
2. `feat(m1): mapkit token endpoint and secure token flow`
3. `refactor(m1): replace Google map/list wiring in Explore`

Acceptance:
- No Google Maps script/API usage in runtime.
- Explore map loads and plots provider POIs.
- Nearby POI query latency within acceptable mobile range.

---

## Milestone 2: POI Domain and User-Created POIs
Goal: support missing stores through community-created POIs.

Deliverables:
- POI schema and proposal schema.
- Create-POI flow from dropped pin.
- Proposal queue and status transitions.
- Published POIs visible in search and map.

Commit slices:
1. `feat(m2): add poi and proposal data models`
2. `feat(m2): create poi proposal API + validation`
3. `feat(m2): UI flow for pin-drop and submit proposal`
4. `feat(m2): proposal status management`

Acceptance:
- User can propose a new store from map.
- Proposed POIs do not pollute canonical results until published.
- Published POIs are discoverable and reportable.

---

## Milestone 3: Goods Catalog and Price Reporting
Goal: ship robust goods and price reporting pipeline.

Deliverables:
- Country packs for AR/MX/CO essentials.
- Goods selector and reporting flow for grocery + gas.
- Unit normalization pipeline (`raw_price` + `unit_price`).
- Evidence attachment support and metadata storage.

Commit slices:
1. `feat(m3): goods catalog models and country packs`
2. `feat(m3): report flow UI for item, unit, price, currency`
3. `feat(m3): backend normalization and persistence`

Acceptance:
- Reports can be submitted for curated goods in all 3 countries.
- Unit normalization is deterministic and test-covered.
- Canonical item IDs are stable across locales.

---

## Milestone 4: Signed Submissions + Trust Engine
Goal: establish contribution integrity and ranking quality.

Deliverables:
- Signed payload submission and verification service.
- Trust profile model and score updates.
- Consensus snapshot computation job/service.
- Trust-weighted ranking in Explore results.

Commit slices:
1. `feat(m4): wallet signature schema and verify service`
2. `feat(m4): trust profile domain + update logic`
3. `feat(m4): consensus aggregation service`
4. `feat(m4): trust-weighted price ranking in UI`

Acceptance:
- Invalid signatures rejected.
- Consensus snapshots generated for active POI/item windows.
- Explore ranking reflects trust + freshness.

---

## Milestone 5: Community Moderation System
Goal: operationalize quality control without centralized bottleneck.

Deliverables:
- Moderation queue for POIs and suspicious submissions.
- Voting/review APIs and moderation UI.
- Reviewer quality scoring and penalties for abuse.

Commit slices:
1. `feat(m5): moderation event model and queue APIs`
2. `feat(m5): contribute tab moderation workflow`
3. `feat(m5): moderation feedback into trust profiles`

Acceptance:
- Contributors can review flagged items.
- Moderation outcomes update publish state and trust.
- Queue processing remains stable under concurrent usage.

---

## Milestone 6: World Verify + Notifications
Goal: leverage unique World capabilities for quality and retention.

Deliverables:
- Verify command flow and backend verification persistence.
- Trust multiplier from verification level.
- Notifications permission flow.
- Server notifications for tracked price events and report outcomes.

Commit slices:
1. `feat(m6): world verify integration end-to-end`
2. `feat(m6): notification permission and subscriptions`
3. `feat(m6): send notification backend triggers`

Acceptance:
- Verified users receive trust multiplier.
- Notification opt-in and delivery works in supported environments.
- Failure fallback does not block primary app flows.

---

## Milestone 7: UX Polish and Launch Hardening
Goal: produce launch-ready quality for pilot markets.

Deliverables:
- Final pass on mobile performance and safe-area behavior.
- Error state coverage and recovery UX.
- Analytics and operational dashboards.
- Final demo scripts and screenshot capture assets.

Commit slices:
1. `refactor(m7): performance and rendering optimization`
2. `feat(m7): robust empty/error/offline states`
3. `docs(m7): launch playbook and pilot ops checklist`

Acceptance:
- Release test gates pass.
- Mobile UX acceptance criteria met.
- Pilot operations docs complete.

---

## Milestone 8: Phase-2 Premium Icon Library
Goal: replace temporary category icons with branded high-polish goods set.

Deliverables:
- Custom SVG icon system and icon registry.
- Mapping from goods IDs to icon components.
- Visual QA across locales and densities.

Commit slices:
1. `feat(m8): icon registry and component loader`
2. `feat(m8): premium icon asset pack integration`
3. `test(m8): visual regression and snapshot coverage`

Acceptance:
- All launch basket items have polished mapped icons.
- No fallback icons on core user journeys.
- Visual consistency pass complete.
