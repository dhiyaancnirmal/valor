# Planning Vault

This folder is the source of truth for rebuilding Valor into a production-grade crowdsourced essential-goods intelligence app.

## Documents
- `valor-master-spec.md`: end-to-end product + technical specification.
- `milestones.md`: implementation milestones with acceptance gates and commit slicing.
- `testing-strategy.md`: test architecture, release gates, and quality standards.
- `file-structure-target.md`: current -> target repo structure and cleanup plan.

## Working Rules
1. Execute milestones in order unless a dependency is explicitly marked optional.
2. Each milestone should land as a series of small commits (single responsibility per commit).
3. A milestone is complete only when its acceptance criteria and test gates pass.
4. Any architecture change outside this spec requires an ADR update in this folder.

## Commit Conventions
- Branches: `codex/<milestone>-<topic>`
- Commit message format:
  - `feat(mX): ...`
  - `refactor(mX): ...`
  - `test(mX): ...`
  - `docs(mX): ...`

## Delivery Rhythm
- End each milestone with:
  - updated docs in this folder,
  - green test gates for that milestone,
  - deployable preview build.
