# Meridian Repo Index

## Purpose

This is the front-door navigation index for Meridian. It points agents and maintainers to canonical sources, current working surfaces, and the fastest truthful path to make changes without widening scope.

## Wave Scope Status

Wave 1 is foundation only. The repo ships substrate, not a runnable application.

## Canonical Root Files

- `README.md`
- `CLAUDE.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `MIGRATIONS.md`
- `package.json`
- `.gitignore`

## Canonical Directories

- `src/` (governance + entity + config substrate)
- `tests/` (structural proof suite)
- `docs/` (specs, schemas, notes, indexes, closeouts)
- `scripts/` (placeholder lane)

## Current Primary Sources

- Posture and operating rules: `CLAUDE.md`, `TEAM_CHARTER.md`, `AI_EXECUTION_DOCTRINE.md`
- Repo identity and front door: `README.md`
- Governance substrate: `src/governance/shadows.js`
- Entity scaffold substrate: `src/entities/*.js` (12 files)
- Constellation config substrate: `src/config/constellation.js`
- Structural proof tests: `tests/entities.test.js`, `tests/deny-patterns.test.js`, `tests/config.test.js`

## Current Repo State

- Wave 1 foundation is landed on `main`.
- No UI ships in this repo today.
- No runnable application ships in this repo today.
- No deployment/runtime messaging integration ships in this repo today.
- `package.json` has no `nats` dependency.
- Upstream 5 Constellation stream helpers remain excluded.
- Ontology filename seam remains unresolved (out of scope here).

## Where To Change X (Quick Pointers)

- Front-door repo truth: `README.md`, `REPO_INDEX.md`, `docs/INDEX.md`
- Agent start surfaces: `README.md`, `CLAUDE.md`
- Governance shadows: `src/governance/shadows.js`
- Entity scaffolds: `src/entities/*.js`
- Constellation config: `src/config/constellation.js`
- Structural proof tests: `tests/entities.test.js`, `tests/deny-patterns.test.js`, `tests/config.test.js`
- Closeouts: `docs/closeouts/README.md`, `docs/closeouts/WAVE1_CLOSEOUT.md`
- Detailed mapping: `docs/WHERE_TO_CHANGE_X.md`
