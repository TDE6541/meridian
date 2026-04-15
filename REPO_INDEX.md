# Meridian Repo Index

## Purpose

This is the front-door navigation index for Meridian. It points agents and maintainers to canonical sources, current working surfaces, and the fastest truthful path to make changes without widening scope.

## Wave Scope Status

Wave 4A Blocks A-C now layer a bounded governance runtime landing zone, static civic policy pack, and runtime subset integration onto the Wave 1 foundation, Wave 2 entity ontology extension, and Wave 3 NATS bridge substrate. The repo now ships a command-request activation path with one local policy source and real `ALLOW` / `SUPERVISE` / `HOLD` / `BLOCK` outcomes, not a full governance runtime.

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

- `src/` (bridge + governance + entity + config substrate)
- `tests/` (structural proof suite and bridge proof suite)
- `docs/` (specs, schemas, notes, indexes, closeouts)
- `scripts/` (synthetic bridge proof harness)

## Current Primary Sources

- Posture and operating rules: `CLAUDE.md`, `TEAM_CHARTER.md`, `AI_EXECUTION_DOCTRINE.md`
- Repo identity and front door: `README.md`
- Bridge runtime substrate: `src/bridge/*.js`
- Governance runtime landing zone, subset, and policy pack: `src/governance/runtime/*.js`
- Bridge specs: `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- Wave 4A runtime activation spec: `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- Governance substrate: `src/governance/shadows.js`
- Entity scaffold substrate: `src/entities/*.js`
- Entity ontology spec: `docs/specs/ENTITY_ONTOLOGY.md`
- Constellation config substrate: `src/config/constellation.js`
- Proof surfaces: `tests/bridge*.test.js`, `tests/governance.runtime.test.js`, `tests/governance.policyPack.test.js`, `tests/governance.runtimeSubset.test.js`, `tests/config.test.js`, `tests/deny-patterns.test.js`, `tests/entities.test.js`, `tests/fixtures/governance/*.json`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js`

## Current Repo State

- Wave 1 foundation, Wave 2 entity ontology extension, Wave 3 transport-only bridge, and the Wave 4A bounded governance runtime plus static civic policy pack and runtime subset are landed in-repo.
- No UI ships in this repo today.
- No runnable application ships in this repo today.
- No live broker proof or production runtime compatibility proof ships in this repo today.
- `package.json` declares only `nats` as a runtime dependency.
- `src/config/constellation.js` remains the read-only Meridian publisher/config substrate.
- The governance transport adapter now delegates `command_request` evaluation into `src/governance/runtime/` and may return `ALLOW`, `SUPERVISE`, `HOLD`, or `BLOCK`.
- `src/governance/runtime/meridian-governance-config.js` is the only runtime config source for Wave 4A governance evaluation.
- `src/governance/runtime/runtimeSubset.js` now applies the approved Block C subset for control-rod posture, constraints, interlocks, hold shaping, omission evaluation, continuity, standing risk, and optional internal open-items projection.
- `event_observation` remains explicitly blocked and deferred in Wave 4A.
- Publisher behavior remains intentionally unchanged for `ALLOW`, `SUPERVISE`, and fail-closed `BLOCK`.
- Ontology filename seam remains unresolved and out of scope here.

## Where To Change X (Quick Pointers)

- Front-door repo truth: `README.md`, `REPO_INDEX.md`, `docs/INDEX.md`
- Agent start surfaces: `README.md`, `CLAUDE.md`
- Bridge runtime: `src/bridge/*.js`
- Governance runtime activation: `src/governance/runtime/*.js`
- Bridge specs: `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- Governance runtime spec and closeouts: `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`, `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`
- Bridge and runtime tests/fixtures: `tests/bridge*.test.js`, `tests/governance.runtime.test.js`, `tests/governance.policyPack.test.js`, `tests/governance.runtimeSubset.test.js`, `tests/fixtures/governance/*.json`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js`
- Governance shadows: `src/governance/shadows.js`
- Entity scaffolds: `src/entities/*.js`
- Entity ontology spec: `docs/specs/ENTITY_ONTOLOGY.md`
- Constellation config: `src/config/constellation.js`
- Closeouts: `docs/closeouts/README.md`, `docs/closeouts/WAVE1_CLOSEOUT.md`, `docs/closeouts/WAVE2_CLOSEOUT.md`, `docs/closeouts/WAVE3_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`
- Detailed mapping: `docs/WHERE_TO_CHANGE_X.md`
