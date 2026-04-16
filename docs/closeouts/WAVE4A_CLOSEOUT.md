# [Wave 4A] Closeout

## Purpose

This document is the wave-level closeout for Wave 4A. It records the final shipped Wave 4A runtime truth, explicit non-shipped surfaces, verification status, and ship-lane routing.

## What Wave 4A shipped

- Real adapter activation for synthetic `command_request` evaluation via `src/bridge/governanceTransportAdapter.js` delegating into `src/governance/runtime/`.
- One static civic policy-pack config artifact at `src/governance/runtime/meridian-governance-config.js` as the only runtime config source.
- Bounded runtime subset integration at `src/governance/runtime/runtimeSubset.js` with real `ALLOW` / `SUPERVISE` / `HOLD` / `BLOCK` outcomes.
- Bounded civic interpretation output:
  - `runtimeSubset.civic.promise_status`
  - `runtimeSubset.civic.confidence.tier` with `WATCH` / `GAP` / `HOLD` / `KILL`
  - short runtime rationale strings
- One read-only, on-demand governance sweep facade at `src/governance/runtime/runGovernanceSweep.js`.
- One frozen governed non-event demo proof path that reuses `tests/fixtures/governance/refusal.commandRequest.json`.

## What Wave 4A did not ship

- No publisher widening for `ALLOW`, `SUPERVISE`, or fail-closed `BLOCK`.
- No event-side governance routing.
- No authority-topology semantics.
- No civic chain writes or civic ForensicChain runtime persistence.
- No explanation-product refusal UX.
- No periodic worker, scheduler, timer, or daemon sweep execution.
- No OpenFGA/Auth0 integration.
- No skins or dashboard/UI runtime surfaces.

## Wave-level acceptance criteria status

- PASS: adapter returns real non-stub decisions over synthetic requests.
- PASS: static civic config artifact exists and is the only runtime config source.
- PASS: at least 5 civic domains are declared with explicit rod positions.
- PASS: at least 3 civic omission packs ship with required ids.
- PASS: approved runtime subset is integrated.
- PASS: promise-status output exists as bounded transient approved form.
- PASS: civic confidence tiers are emitted as a separate output axis.
- PASS: one read-only on-demand governance sweep path exists.
- PASS: one frozen governed non-event scenario passes end to end.
- PASS: new Wave 4A behavior has direct test coverage.
- PASS: full suite moved from Wave 3 baseline (116) to current Wave 4A suite (150).
- PASS: no Wave 5 / 6 / 7 / 9 scope landed.

## Contract / migration status

- `GovernanceEvaluationRequest`, `GovernancePublication`, `BridgeEnvelope`, and typed `signal_tree` remain unchanged in shape.
- Wave 4A behavior changed by additive runtime activation and bounded runtime output only.
- `MIGRATIONS.md` truth is append-only and matches landed behavioral rows for:
  - Wave 4A Block A adapter activation
  - Wave 4A Block C runtime subset + `SUPERVISE`
  - Wave 4A Block D promise-status/confidence output
- No additional migration row was required for Block E read-only sweep.

## Test delta from Wave 3 baseline

- Wave 3 baseline: 116
- Current suite after Wave 4A: 150
- Wave 4A delta: +34

## Remaining deferred surfaces

- Publisher widening remains deferred.
- Event-side routing remains deferred.
- Authority-topology semantics remain deferred.
- Civic chain writes / civic ForensicChain runtime remain deferred.
- Explanation-product refusal UX remains deferred.
- Periodic worker/scheduler/daemon sweep remains deferred.
- OpenFGA/Auth0 integration remains deferred.
- Skins/dashboard/UI expansion remains deferred.

## Front-door sync status

- Root and index surfaces were audited and synchronized where stale:
  - `README.md`
  - `CLAUDE.md`
  - `REPO_INDEX.md`
  - `TEAM_CHARTER.md`
  - `AI_EXECUTION_DOCTRINE.md`
  - `docs/ENGINE_INDEX.md`
  - `docs/WHERE_TO_CHANGE_X.md`
  - `docs/closeouts/README.md`
  - `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- Historical closeouts remain historically truthful and were not rewritten for retroactive narrative changes.

## Lane routing / git authorship confirmation

- Lane: Wave 4A finish / ship lane on `main`.
- Git authorship posture: only Codex performs git writes in this lane.
- Ship posture: one coherent wave-level commit.

## Signoff status

- Wave-level verification and documentation sync are complete for the approved Wave 4A fence.
- Full-suite and diff-check verification are required in the same finish lane before ship.
- Final commit/push signoff remains tied to successful verification and clean stage set.
