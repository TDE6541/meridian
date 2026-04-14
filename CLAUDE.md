# Meridian Session Posture

## Repo Identity

Meridian is a governed city digital twin intelligence repo with a transport-only Wave 3 bridge substrate.

## Agent Start Here / Read First

1. [`README.md`](README.md)
2. [`REPO_INDEX.md`](REPO_INDEX.md)
3. [`docs/INDEX.md`](docs/INDEX.md)
4. [`docs/ENGINE_INDEX.md`](docs/ENGINE_INDEX.md)
5. [`docs/WHERE_TO_CHANGE_X.md`](docs/WHERE_TO_CHANGE_X.md)
6. [`docs/closeouts/README.md`](docs/closeouts/README.md)
7. [`docs/specs/WAVE3_NATS_BRIDGE.md`](docs/specs/WAVE3_NATS_BRIDGE.md)

## Session Posture

- Treat repo truth as the working perimeter.
- Keep all claims bounded to visible files and approved inputs.
- Surface uncertainty as HOLD instead of filling gaps.
- Keep root canon synchronized when substrate truth changes.
- Treat `src/config/constellation.js` as read-only publisher truth for Wave 3 bridge work.
- Do not describe Wave 3 as live broker proof, actor authorization topology, or mutation runtime.

## Non-Negotiables

- HOLD > GUESS
- Evidence-first
- No silent mangling
- Contract discipline
- Minimal diffs

## Block 0 Deny Matrix

```text
Edit(/**/*authentication*.*)
Edit(/**/*oauth*.*)
Edit(/**/*security*.*)
Edit(/**/*credential*.*)
Edit(/**/*token*.*)
Edit(/**/*secret*.*)
Edit(/**/config.*)
Edit(/**/config-*.*)
Edit(/**/config_*.*)
Edit(/**/*-config.*)
Edit(/**/*_config.*)
Edit(/**/*.config.*)
```

## Repo Truth

- `LICENSE`
- `README.md`
- `REPO_INDEX.md`
- `CLAUDE.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `MIGRATIONS.md`
- `package.json`
- `package-lock.json`
- `.gitignore`
- `src/config/constellation.js`
- `src/bridge/*.js`
- `src/entities/*.js`
- `src/governance/shadows.js`
- `tests/config.test.js`
- `tests/deny-patterns.test.js`
- `tests/entities.test.js`
- `tests/bridge*.test.js`
- `tests/fixtures/nats/*.json`
- `docs/specs/ENTITY_ONTOLOGY.md`
- `docs/specs/WAVE3_NATS_BRIDGE.md`
- `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- `docs/INDEX.md`
- `docs/ENGINE_INDEX.md`
- `docs/UI_INDEX.md`
- `docs/WHERE_TO_CHANGE_X.md`
- `docs/closeouts/README.md`
- `docs/closeouts/WAVE1_CLOSEOUT.md`
- `docs/closeouts/WAVE2_CLOSEOUT.md`
- `docs/closeouts/WAVE3_CLOSEOUT.md`
- `scripts/synthetic-constellation.js`
- Block C truth: `package.json` declares only `nats` as a runtime dependency; `src/config/constellation.js` remains the narrow publisher/config substrate; transport-only bridge surfaces live in `src/bridge/`; no live broker proof claim ships.
- Block D truth: proof surfaces now include bridge tests, fixture-backed synthetic transport proof, the existing structural suite, and the unchanged blocked entity/config runtime lanes.

## Required Sync Surfaces

- `README.md`
- `REPO_INDEX.md`
- `CLAUDE.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `MIGRATIONS.md`
- `docs/INDEX.md`
- `docs/ENGINE_INDEX.md`
- `docs/WHERE_TO_CHANGE_X.md`
- `docs/specs/WAVE3_NATS_BRIDGE.md`
- `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- `docs/closeouts/README.md`
- `docs/closeouts/WAVE3_CLOSEOUT.md`

## Closeout Requirements

- State the exact files changed.
- Report acceptance criteria as PASS, FAIL, or HOLD.
- Carry forward unresolved HOLDs without smoothing them over.
- Note any contract impact.
- Note any migration impact.
- Confirm blocked surfaces stayed untouched.
- Confirm the reference files remain unstaged.
- Note whether signoff is still required.
