# Meridian Session Posture

## Repo Identity

Meridian is a governed city digital twin intelligence repo.

## Agent Start Here / Read First

1. [`README.md`](README.md)
2. [`REPO_INDEX.md`](REPO_INDEX.md)
3. [`docs/INDEX.md`](docs/INDEX.md)
4. [`docs/ENGINE_INDEX.md`](docs/ENGINE_INDEX.md)
5. [`docs/UI_INDEX.md`](docs/UI_INDEX.md)
6. [`docs/WHERE_TO_CHANGE_X.md`](docs/WHERE_TO_CHANGE_X.md)
7. [`docs/closeouts/README.md`](docs/closeouts/README.md)

## Session Posture

- Treat repo truth as the working perimeter.
- Keep all claims bounded to visible files and approved inputs.
- Surface uncertainty as HOLD instead of filling gaps.
- Keep root canon synchronized when substrate truth changes.
- Do not describe runtime surfaces as present unless they exist in this repo.

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
- `.gitignore`
- `src/config/constellation.js`
- `src/entities/action_request.js`
- `src/entities/authority_grant.js`
- `src/entities/corridor_zone.js`
- `src/entities/critical_site.js`
- `src/entities/decision_record.js`
- `src/entities/device.js`
- `src/entities/evidence_artifact.js`
- `src/entities/incident_observation.js`
- `src/entities/inspection.js`
- `src/entities/obligation.js`
- `src/entities/organization.js`
- `src/entities/permit_application.js`
- `src/entities/utility_asset.js`
- `src/governance/shadows.js`
- `tests/.gitkeep`
- `tests/config.test.js`
- `tests/deny-patterns.test.js`
- `tests/entities.test.js`
- `docs/specs/ENTITY_ONTOLOGY.md`
- `docs/specs/.gitkeep`
- `docs/schemas/.gitkeep`
- `docs/learning-notes/.gitkeep`
- `docs/INDEX.md`
- `docs/ENGINE_INDEX.md`
- `docs/UI_INDEX.md`
- `docs/WHERE_TO_CHANGE_X.md`
- `docs/closeouts/README.md`
- `docs/closeouts/WAVE1_CLOSEOUT.md`
- `docs/closeouts/WAVE2_CLOSEOUT.md`
- `scripts/.gitkeep`
- Block C truth: narrow Constellation config and package substrate are present; no `nats` dependency is declared; upstream 5 stream helpers remain excluded.
- Block D truth: structural proof suite exists under `tests/` (`config.test.js`, `deny-patterns.test.js`, `entities.test.js`).

## Required Sync Surfaces

- `README.md`
- `REPO_INDEX.md`
- `CLAUDE.md`
- `docs/INDEX.md`
- `docs/ENGINE_INDEX.md`
- `docs/UI_INDEX.md`
- `docs/WHERE_TO_CHANGE_X.md`
- `docs/closeouts/README.md`
- `docs/closeouts/WAVE1_CLOSEOUT.md`
- `docs/closeouts/WAVE2_CLOSEOUT.md`
- `docs/specs/ENTITY_ONTOLOGY.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `MIGRATIONS.md`
- `.gitignore`

## Closeout Requirements

- State the exact files changed.
- Report acceptance criteria as PASS, FAIL, or HOLD.
- Carry forward unresolved HOLDs without smoothing them over.
- Note any contract impact.
- Note any migration impact.
- Confirm whether signoff is still required.
