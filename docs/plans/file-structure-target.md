# Target File Structure

## Current Direction
The repo has a solid base but still carries legacy reward-era organization and mixed concerns.

## Target Structure

```text
src/
  app/
    [locale]/
    api/
  features/
    explore/
    report/
    contribute/
    profile/
  domain/
    poi/
    goods/
    pricing/
    trust/
    moderation/
  services/
    maps/
    world/
    notifications/
    consensus/
  components/
    ui/
  lib/
  types/

docs/
  guides/
  reference/
  plans/
```

## Cleanup Plan
1. Keep `app` and API routing under `src/app`.
2. Move feature-specific UI logic into `src/features/*`.
3. Move business logic into `src/domain/*` and `src/services/*`.
4. Keep `src/components/ui` as design-system layer only.
5. Keep shared utilities in `src/lib` and strongly typed contracts in `src/types`.
6. Treat `docs/plans` as source of truth for build sequencing.

## Migration Rule
- No big-bang refactor.
- Move files incrementally during each milestone.
- Each move commit must include path updates + passing tests.
