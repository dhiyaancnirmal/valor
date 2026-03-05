# Testing Strategy

## 1) Test Philosophy
- Prevent regressions at each milestone with layered tests.
- Prioritize deterministic tests for core trust, normalization, and moderation logic.
- Require mobile-first UX validation before merge for user-facing milestones.

## 2) Test Layers

### A) Unit Tests
Targets:
- unit normalization and conversion logic
- trust score calculations
- consensus aggregation helpers
- signature verification helpers
- country pack validation

Requirements:
- high branch coverage for domain logic (`>= 90%` on trust/consensus modules).
- deterministic fixtures for currency/unit edge cases.

### B) Integration Tests
Targets:
- API routes for POI search/proposal/report/moderation/trust.
- DB writes/reads with realistic fixtures.
- verification and notification service integration boundaries.

Requirements:
- cover happy path + critical failure paths.
- enforce schema constraints and status transitions.

### C) End-to-End Tests (Mobile-first)
Targets:
- login/auth bootstrap
- map load + POI selection
- report flow submit path
- create-POI flow
- moderation action flow
- profile/trust view

Requirements:
- run against mobile viewport presets.
- include safe-area and keyboard interaction checks.
- include flaky-network scenario for critical flows.

### D) Contract and Compatibility Tests
Targets:
- payload schema compatibility for client/server.
- country pack schema compatibility.
- map provider adapter interface invariants.

Requirements:
- fail CI on schema drift.
- keep versioned fixtures for backward compatibility.

### E) Performance and Reliability Tests
Targets:
- API latency under moderate concurrency.
- map screen initial render and interaction responsiveness.
- consensus job runtime and memory stability.

Requirements:
- define SLO budgets for pilot:
  - P95 read API latency <= 400ms
  - P95 write API latency <= 700ms
  - map first-interaction <= 2.5s on test profile device/network

## 3) Security and Abuse Testing
- signature forgery attempts
- replay submission attempts
- duplicate submission abuse
- moderation spam patterns
- malformed payload fuzzing
- permission bypass attempts

Required outcome:
- all critical abuse vectors have explicit blocking assertions and tests.

## 4) Milestone Test Gates

### Gate G0 (M0)
- build + typecheck + lint pass.
- typography/token snapshot checks pass.

### Gate G1 (M1-M2)
- map + POI integration tests pass.
- create/propose/publish POI e2e flow pass.

### Gate G2 (M3-M4)
- reporting + normalization + trust unit/integration tests pass.
- signed payload verification tests pass.

### Gate G3 (M5-M6)
- moderation and verify flows pass.
- notification trigger integration tests pass.

### Gate G4 (M7)
- full e2e regression suite pass.
- performance thresholds pass.
- release checklist complete.

## 5) Test Data and Fixtures
- maintain country-specific fixtures for AR/MX/CO.
- maintain canonical goods fixture set.
- include realistic POI density distributions.
- version fixtures and never mutate historical snapshots in place.

## 6) Local Validation Requirements (Current Phase)
- M0 runs local checks only (no CI/CD requirement yet).
- required local checks before merge:
  - typecheck
  - lint
  - `npm run dev:browser` smoke boot
  - agent-browser flow smoke (login, tab navigation, submit entry flow)
- CI can be introduced in a later milestone once core domains stabilize.

## 7) Manual QA Checklist (Pre-Release)
- world mini-app auth and verify in supported client.
- push notifications opt-in and delivery.
- map usability in dense and sparse POI regions.
- offline/retry behavior for submissions.
- localization correctness for launch countries.
