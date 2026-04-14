# Meridian Repo Index

## Purpose

This is the front-door navigation index for Meridian. It points agents and maintainers to canonical sources, current working surfaces, and the fastest truthful path to make changes without widening scope.

## Wave Scope Status

Wave 3 ships a bounded NATS bridge substrate and governance transport stub on top of the Wave 1 foundation and Wave 2 entity ontology extension. The repo now ships a runtime-adjacent bridge surface, not a full runtime.

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
- Bridge specs: `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- Governance substrate: `src/governance/shadows.js`
- Entity scaffold substrate: `src/entities/*.js`
- Entity ontology spec: `docs/specs/ENTITY_ONTOLOGY.md`
- Constellation config substrate: `src/config/constellation.js`
- Proof surfaces: `tests/bridge*.test.js`, `tests/config.test.js`, `tests/deny-patterns.test.js`, `tests/entities.test.js`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js`

## Current Repo State

- Wave 1 foundation, Wave 2 entity ontology extension, and Wave 3 transport-only bridge are landed in-repo.
- No UI ships in this repo today.
- No runnable application ships in this repo today.
- No live broker proof or production runtime compatibility proof ships in this repo today.
- `package.json` declares only `nats` as a runtime dependency.
- `src/config/constellation.js` remains the read-only Meridian publisher/config substrate.
- The governance transport adapter is fail-closed and never returns `ALLOW`.
- Ontology filename seam remains unresolved and out of scope here.

## Where To Change X (Quick Pointers)

- Front-door repo truth: `README.md`, `REPO_INDEX.md`, `docs/INDEX.md`
- Agent start surfaces: `README.md`, `CLAUDE.md`
- Bridge runtime: `src/bridge/*.js`
- Bridge specs: `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- Bridge tests and fixtures: `tests/bridge*.test.js`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js`
- Governance shadows: `src/governance/shadows.js`
- Entity scaffolds: `src/entities/*.js`
- Entity ontology spec: `docs/specs/ENTITY_ONTOLOGY.md`
- Constellation config: `src/config/constellation.js`
- Closeouts: `docs/closeouts/README.md`, `docs/closeouts/WAVE1_CLOSEOUT.md`, `docs/closeouts/WAVE2_CLOSEOUT.md`, `docs/closeouts/WAVE3_CLOSEOUT.md`
- Detailed mapping: `docs/WHERE_TO_CHANGE_X.md`
