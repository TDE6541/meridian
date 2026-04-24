# Contributing

## Read First

- `README.md`
- `CLAUDE.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `MIGRATIONS.md`

## Working Rules

- Work from repo truth and approved inputs.
- Treat Meridian V1 as complete through Wave 9.
- Treat Wave 9 as the final V1 wave; there is no Wave 10 in V1.
- Treat future expansion as Meridian V2 only under a new approved envelope.
- Keep diffs minimal and within approved scope.
- Surface uncertainty as HOLD.
- Do not add adjacent changes without a new scoped session.
- Verify the result before closeout.

## Contract Discipline

- Treat root canon as load-bearing.
- Update every affected canon surface when substrate truth changes.
- Do not introduce silent drift between repo state and repo documents.
- Treat Wave 3 bridge-local contracts as transport contracts, not persistent entity widening.
- Treat Wave 4B capture artifacts and handoff payloads as bounded local seam outputs, not generalized runtime/publication completion.
- Treat Wave 5 authority outputs as bounded runtime-only projections (`runtimeSubset.civic.authority_resolution` and `runtimeSubset.civic.revocation`), not top-level request/publication/entity widening.
- Treat Wave 6 forensic outputs as bounded local forensic-chain and additive publication-receipt seams, not live broker proof, legal immutability, top-level request/publication widening, or DB-backed persistence.
- Treat Wave 7 civic skins as rendering-only `src/skins/**` surfaces, not dashboard/UI runtime or legal/public-portal behavior.
- Treat Wave 8 corridor scenario outputs as integration-local `src/integration/**` and runner-local proof surfaces, not live broker/auth/audio/legal behavior.
- Treat Wave 9 dashboard work as local-only `dashboard/**` snapshot consumption over committed payloads, not hosted deployment, auth, live broker, live network dependency, new governance computation, or legal/TPIA/TRAIGA compliance behavior.
- Treat V1 closure docs as truth-surface routing only; they do not change shared contracts and do not require a migration row.

## Canon Vs Reference Boundaries

- Canon lives in the root documents that define Meridian repo posture and current substrate truth.
- References may guide wording or direction, but they do not override visible repo truth.
- Upstream material that is not available in this repo may be named, but not summarized as fact.

## HOLD Behavior

- Use HOLD when required truth is missing, conflicting, or blocked.
- Include the evidence that caused the HOLD.
- Do not replace missing facts with confident prose.

## Commit Hygiene

- Keep each change set narrow and legible.
- Avoid mixed-purpose edits.
- Do not commit until the approved session says commit is in scope.
- When touching the Wave 3 bridge, sync the bridge specs, tests, migration log, and closeout in the same session.
- When touching the Wave 4B capture lane, sync the Wave 4B spec/closeout and current-truth front doors in the same session.
- When touching the Wave 4.5 calibration lane, sync `docs/specs/WAVE4_5_CALIBRATION.md`, `docs/closeouts/WAVE4_5_CLOSEOUT.md`, and current-truth front doors in the same session.
- When touching the Wave 5 authority-topology lane, sync `docs/specs/WAVE5_AUTHORITY_TOPOLOGY.md`, `docs/closeouts/WAVE5_CLOSEOUT.md`, `MIGRATIONS.md`, and current-truth front doors in the same session.
- When touching the Wave 6 forensic-chain lane, sync `docs/specs/WAVE6_FORENSICCHAIN_CIVIC.md`, `docs/closeouts/WAVE6_CLOSEOUT.md`, `MIGRATIONS.md`, and current-truth front doors in the same session.
- When touching the Wave 7 civic skins lane, sync `docs/specs/WAVE7_CIVIC_SKINS.md`, `docs/closeouts/WAVE7_CLOSEOUT.md`, `MIGRATIONS.md`, and current-truth front doors in the same session.
- When touching the Wave 9 dashboard lane, sync `docs/specs/WAVE9_DASHBOARD.md`, `docs/closeouts/WAVE9_CLOSEOUT.md`, `dashboard/README.md`, and current-truth front doors in the same session; update `MIGRATIONS.md` only if a real shared contract changes.
- When touching V1 final truth, sync `docs/specs/MERIDIAN_V1_FINAL_TRUTH.md`, `docs/closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md`, and current-truth front doors without editing runtime, test, package, scenario, or historical Wave 1-9 closeout surfaces.
