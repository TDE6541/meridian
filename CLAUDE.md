# Meridian Session Posture

## Repo Identity

Meridian is a governed city digital twin intelligence repo with a transport-only Wave 3 bridge substrate, a bounded Wave 4A governance runtime lane, and a bounded Wave 4B meeting-capture pipeline lane with a local/frozen governance handoff seam and Fort Worth frozen proof path.

## Agent Start Here / Read First

1. [`README.md`](README.md)
2. [`REPO_INDEX.md`](REPO_INDEX.md)
3. [`docs/INDEX.md`](docs/INDEX.md)
4. [`docs/ENGINE_INDEX.md`](docs/ENGINE_INDEX.md)
5. [`docs/WHERE_TO_CHANGE_X.md`](docs/WHERE_TO_CHANGE_X.md)
6. [`docs/closeouts/README.md`](docs/closeouts/README.md)
7. [`docs/specs/WAVE3_NATS_BRIDGE.md`](docs/specs/WAVE3_NATS_BRIDGE.md)
8. [`docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`](docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md)
9. [`docs/specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md`](docs/specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md)

## Session Posture

- Treat repo truth as the working perimeter.
- Keep all claims bounded to visible files and approved inputs.
- Surface uncertainty as HOLD instead of filling gaps.
- Keep root canon synchronized when substrate truth changes.
- Treat `src/config/constellation.js` as read-only publisher truth for Wave 3 bridge work.
- Do not describe Wave 3 as live broker proof, actor authorization topology, or mutation runtime.
- Do not describe Wave 4A Blocks A-E as event-side routing, periodic worker logic, publisher widening, or a full governance runtime.
- Do not describe Wave 4B as generalized event routing, generalized publisher widening, authority-topology semantics, or civic-chain runtime writes.

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
- `src/governance/runtime/*.js`
- `src/pipeline/*.py`
- `tests/config.test.js`
- `tests/deny-patterns.test.js`
- `tests/entities.test.js`
- `tests/bridge*.test.js`
- `tests/governance.runtime.test.js`
- `tests/governance.runtimeSubset.test.js`
- `tests/governance.promiseConfidence.test.js`
- `tests/governance.sweep.test.js`
- `tests/governance.demoProof.test.js`
- `tests/governance.pipelineHandoffProof.test.js`
- `tests/pipeline/*.py`
- `tests/pipeline/fixtures/*.txt`
- `tests/pipeline/fixtures/*.json`
- `tests/pipeline/fixtures/fort_worth_proof/*`
- `tests/fixtures/governance/*.json`
- `tests/fixtures/nats/*.json`
- `docs/specs/ENTITY_ONTOLOGY.md`
- `docs/specs/WAVE3_NATS_BRIDGE.md`
- `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- `docs/specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md`
- `docs/INDEX.md`
- `docs/ENGINE_INDEX.md`
- `docs/UI_INDEX.md`
- `docs/WHERE_TO_CHANGE_X.md`
- `docs/closeouts/README.md`
- `docs/closeouts/WAVE1_CLOSEOUT.md`
- `docs/closeouts/WAVE2_CLOSEOUT.md`
- `docs/closeouts/WAVE3_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_D_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_E_CLOSEOUT.md`
- `docs/closeouts/WAVE4B_CLOSEOUT.md`
- `scripts/synthetic-constellation.js`
- Block C truth: `package.json` declares only `nats` as a runtime dependency; `src/config/constellation.js` remains the narrow publisher/config substrate; transport-only bridge surfaces live in `src/bridge/`; no live broker proof claim ships.
- Block D truth: runtime results now carry bounded `runtimeSubset.civic.promise_status`, civic confidence tiers, and short decision rationale strings; `tests/governance.promiseConfidence.test.js` provides direct proof; no entity, publisher, or event-side widening shipped.
- Block E truth: `src/governance/runtime/runGovernanceSweep.js` adds a read-only, on-demand sweep facade for explicit synthetic input only; `tests/governance.sweep.test.js` and `tests/governance.demoProof.test.js` freeze the refusal fixture as the governed non-event proof; no periodic worker, civic chain writes, publisher widening, event-side routing, authority-topology semantics, or explanation-product UX shipped.
- Wave 4B truth: `src/pipeline/` ships bounded capture stages (normalize/hash, OpenAI transcription, segmentation, extraction, merge, fallback, translation seam, receipt helpers); `tests/pipeline/test_end_to_end_proof.py` and `tests/governance.pipelineHandoffProof.test.js` prove the frozen local handoff path; no event routing, generalized publisher widening, authority-topology semantics, or civic-chain writes shipped in this lane.

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
- `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- `docs/specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md`
- `docs/closeouts/README.md`
- `docs/closeouts/WAVE3_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_D_CLOSEOUT.md`
- `docs/closeouts/WAVE4A_BLOCK_E_CLOSEOUT.md`
- `docs/closeouts/WAVE4B_CLOSEOUT.md`

## Closeout Requirements

- State the exact files changed.
- Report acceptance criteria as PASS, FAIL, or HOLD.
- Carry forward unresolved HOLDs without smoothing them over.
- Note any contract impact.
- Note any migration impact.
- Confirm blocked surfaces stayed untouched.
- Confirm the reference files remain unstaged.
- Note whether signoff is still required.
