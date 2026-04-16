# Meridian Repo Index

## Purpose

This is the front-door navigation index for Meridian. It points agents and maintainers to canonical sources, current working surfaces, and the fastest truthful path to make changes without widening scope.

## Wave Scope Status

Wave 4B Blocks A-E now layer a bounded meeting-capture pipeline lane under `src/pipeline/` onto the previously shipped Wave 1 foundation, Wave 2 ontology extension, Wave 3 transport bridge substrate, and Wave 4A bounded governance runtime lane. The repo now ships a local/frozen capture-to-handoff seam plus frozen Fort Worth proof artifacts/receipt utilities, not generalized runtime/event routing expansion.

## Canonical Root Files

- `README.md`
- `CLAUDE.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `MIGRATIONS.md`
- `package.json`
- `package-lock.json`
- `.gitignore`

## Canonical Directories

- `src/` (bridge + governance + pipeline + entity + config substrate)
- `tests/` (structural proof suite + bridge/runtime proof suite + pipeline proof suite)
- `docs/` (specs, schemas, notes, indexes, closeouts)
- `scripts/` (synthetic bridge proof harness)

## Current Primary Sources

- Posture and operating rules: `CLAUDE.md`, `TEAM_CHARTER.md`, `AI_EXECUTION_DOCTRINE.md`
- Repo identity and front door: `README.md`
- Bridge runtime substrate: `src/bridge/*.js`
- Governance runtime landing zone, sweep facade, subset, and policy pack: `src/governance/runtime/*.js`
- Wave 4B capture substrate: `src/pipeline/*.py`
- Bridge specs: `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- Wave 4A runtime activation spec: `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- Wave 4B meeting-capture spec: `docs/specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md`
- Governance substrate: `src/governance/shadows.js`
- Entity scaffold substrate: `src/entities/*.js`
- Entity ontology spec: `docs/specs/ENTITY_ONTOLOGY.md`
- Constellation config substrate: `src/config/constellation.js`
- Proof surfaces: `tests/bridge*.test.js`, `tests/governance.runtime.test.js`, `tests/governance.policyPack.test.js`, `tests/governance.runtimeSubset.test.js`, `tests/governance.promiseConfidence.test.js`, `tests/governance.sweep.test.js`, `tests/governance.demoProof.test.js`, `tests/governance.pipelineHandoffProof.test.js`, `tests/pipeline/*.py`, `tests/pipeline/fixtures/*`, `tests/config.test.js`, `tests/deny-patterns.test.js`, `tests/entities.test.js`, `tests/fixtures/governance/*.json`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js`

## Current Repo State

- Wave 1 foundation, Wave 2 ontology extension, Wave 3 transport-only bridge, Wave 4A bounded governance runtime lane, and Wave 4B bounded meeting-capture lane are landed in-repo.
- No UI ships in this repo today.
- No runnable application ships in this repo today.
- No live broker proof or production runtime compatibility proof ships in this repo today.
- `package.json` declares only `nats` as a runtime dependency.
- `src/config/constellation.js` remains the read-only Meridian publisher/config substrate.
- The governance transport adapter now delegates `command_request` evaluation into `src/governance/runtime/` and may return `ALLOW`, `SUPERVISE`, `HOLD`, or `BLOCK`.
- `src/governance/runtime/meridian-governance-config.js` is the only runtime config source for Wave 4A governance evaluation.
- `src/governance/runtime/runtimeSubset.js` now applies the approved runtime subset for control-rod posture, constraints, interlocks, hold shaping, omission evaluation, continuity, standing risk, and Block D civic interpretation output.
- `src/governance/runtime/runGovernanceSweep.js` now provides a read-only, on-demand sweep facade over explicit synthetic governance inputs only.
- `runtimeSubset.civic.promise_status` mirrors the shipped typed `civic.promise_status` field family as a bounded transient projection without entity mutation.
- `runtimeSubset.civic.confidence.tier` now emits `WATCH`, `GAP`, `HOLD`, or `KILL` as a separate axis from top-level runtime decision state.
- `tests/governance.sweep.test.js` and `tests/governance.demoProof.test.js` freeze the refusal fixture as the governed non-event proof path and keep supporting controls bounded.
- `src/pipeline/` now ships:
  - internal HoldPoint-native `Segment` / `Directive` / `Hold` capture contracts
  - OpenAI env/config and OpenAI-only transcription surfaces
  - deterministic segmentation + extraction ensemble + merge confidence backbone
  - narrow fallback cue scan for extraction failure
  - translation seam that emits a durable capture artifact and reduced local/frozen governance handoff payload
  - frozen proof manifest and run-level capture receipt builders
- `tests/pipeline/test_end_to_end_proof.py` freezes Fort Worth proof posture: official agenda pair is primary verbatim source; motion-video pair is supplemental context only.
- `tests/governance.pipelineHandoffProof.test.js` proves the Wave 4B handoff can ride the existing Wave 4A governed non-event sweep lane without runtime widening.
- `event_observation` remains explicitly blocked and deferred in Wave 4A.
- No periodic worker, scheduler, timer, or daemon ships for governance sweep invocation.
- Publisher behavior remains intentionally unchanged for `ALLOW`, `SUPERVISE`, and fail-closed `BLOCK`.
- No general event routing or general publisher widening ships in Wave 4B.
- No authority-topology semantics, civic-chain writes, or ForensicChain runtime writes ship in Wave 4B.
- Ontology filename seam remains unresolved and out of scope here.

## Where To Change X (Quick Pointers)

- Front-door repo truth: `README.md`, `REPO_INDEX.md`, `docs/INDEX.md`
- Agent start surfaces: `README.md`, `CLAUDE.md`
- Bridge runtime: `src/bridge/*.js`
- Governance runtime activation: `src/governance/runtime/*.js`
- Meeting-capture pipeline lane: `src/pipeline/*.py`, `src/pipeline/README.md`
- Bridge specs: `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- Governance/runtime specs and closeouts: `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`, `docs/specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md`, `docs/closeouts/WAVE4A_CLOSEOUT.md`, `docs/closeouts/WAVE4B_CLOSEOUT.md`
- Bridge/runtime/pipeline tests and fixtures: `tests/bridge*.test.js`, `tests/governance.runtime.test.js`, `tests/governance.policyPack.test.js`, `tests/governance.runtimeSubset.test.js`, `tests/governance.promiseConfidence.test.js`, `tests/governance.sweep.test.js`, `tests/governance.demoProof.test.js`, `tests/governance.pipelineHandoffProof.test.js`, `tests/pipeline/*.py`, `tests/pipeline/fixtures/*`, `tests/fixtures/governance/*.json`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js`
- Governance shadows: `src/governance/shadows.js`
- Entity scaffolds: `src/entities/*.js`
- Entity ontology spec: `docs/specs/ENTITY_ONTOLOGY.md`
- Constellation config: `src/config/constellation.js`
- Closeouts: `docs/closeouts/README.md`, `docs/closeouts/WAVE1_CLOSEOUT.md`, `docs/closeouts/WAVE2_CLOSEOUT.md`, `docs/closeouts/WAVE3_CLOSEOUT.md`, `docs/closeouts/WAVE4A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_D_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_E_CLOSEOUT.md`, `docs/closeouts/WAVE4B_CLOSEOUT.md`
- Detailed mapping: `docs/WHERE_TO_CHANGE_X.md`
