[Wave 4.5] Closeout

## Purpose

This is the wave-level closeout for Wave 4.5 calibration. It records shipped A/B/C/D wave truth, acceptance status, and finish-lane synchronization outcomes.

## Wave-level changes by block

### Block A

- Froze Wave 4.5 calibration corpus and annotation posture under `tests/pipeline/fixtures/calibration_corpus/`.
- Established locked corpus composition used by baseline and final reports (3 dev meetings + 1 holdout, 39 gold items).

### Block B

- Shipped baseline calibration harness/report surfaces in `tests/pipeline/calibration/`.
- Produced baseline trio:
  - `tests/pipeline/calibration/baselines/recorded_primary_runs.json`
  - `tests/pipeline/calibration/baselines/recorded_fallback_runs.json`
  - `tests/pipeline/calibration/baselines/baseline_report.json`
- Block B trio remains historical baseline truth and pre-Block-C comparison source.

### Block C

- Applied bounded tuning in extraction/merge/fallback only.
- Improved primary-lane all-meetings scores from baseline to final:
  - exact match score: `0.0256` -> `0.1795`
  - relaxed match score: `0.1026` -> `0.6667`
  - micro F1: `0.1176` -> `0.5591`
  - macro F1: `0.1107` -> `0.4351`
  - unsafe certainty rate: `0.5172` -> `0.0`
  - unsupported quote rate: `0.1379` -> `0.0185`

### Block D

- Locked final replay artifact family:
  - `tests/pipeline/calibration/final/recorded_primary_runs.json`
  - `tests/pipeline/calibration/final/recorded_fallback_runs.json`
  - `tests/pipeline/calibration/final/final_report.json`
- Locked final replay regression proof at `tests/pipeline/test_calibration_final.py`.
- Final report version is `wave4.5-blockd-final-v1` with model pin `gpt-5.4`.

## Acceptance criteria (PASS / FAIL / HOLD per item)

- PASS: Wave 4.5 spec exists at `docs/specs/WAVE4_5_CALIBRATION.md`.
- PASS: Wave 4.5 wave-level closeout exists at `docs/closeouts/WAVE4_5_CLOSEOUT.md`.
- PASS: current-truth front doors were synchronized to include Wave 4.5 truth surfaces.
- PASS: historical closeouts remained historical and untouched.
- PASS: Block B artifacts are documented as historical baseline truth and pre-Block-C comparison source.
- PASS: current calibrated truth references point to the final artifact family under `tests/pipeline/calibration/final/`.
- PASS: no `src/**` or `tests/**` files were modified in this finish lane.
- PASS: `MIGRATIONS.md` remained untouched.
- HOLD: Architect signoff is still required for final wave closure confirmation.

## Contract / migration status

- No contract widening shipped in this finish lane.
- No entity, bridge, governance runtime, or pipeline code contract changes shipped.
- `MIGRATIONS.md` is unchanged because this lane is docs/index/closeout synchronization only.

## Test posture

- No code or tests changed in this finish lane.
- Python/JS suites were not re-run because only documentation/index surfaces changed.
- Evidence source for calibration truth is the committed final report and recorded replay artifacts.

## Remaining HOLDs

- Architect signoff pending for final Wave 4.5 closure acknowledgment.

## Front-door sync status

- PASS: `README.md`, `CLAUDE.md`, `REPO_INDEX.md`, `TEAM_CHARTER.md`, `AI_EXECUTION_DOCTRINE.md`, and `CONTRIBUTING.md` now include Wave 4.5 truth references where needed.
- PASS: `docs/INDEX.md`, `docs/ENGINE_INDEX.md`, and `docs/WHERE_TO_CHANGE_X.md` now route to Wave 4.5 spec/closeout and calibration truth surfaces.
- PASS: `docs/closeouts/README.md` lists Wave 4.5 closeout.

## Lane routing confirmation

- Lane: Wave 4.5 Block D 5.3 finish lane.
- Role: truth-surface closeout and front-door sync only.
- Out-of-scope surfaces remained untouched (all `src/**`, all `tests/**`, historical closeouts, and `MIGRATIONS.md`).

## Exact files touched in this finish lane

- `docs/specs/WAVE4_5_CALIBRATION.md`
- `docs/closeouts/WAVE4_5_CLOSEOUT.md`
- `README.md`
- `CLAUDE.md`
- `REPO_INDEX.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `docs/INDEX.md`
- `docs/ENGINE_INDEX.md`
- `docs/WHERE_TO_CHANGE_X.md`
- `docs/closeouts/README.md`

## Signoff posture

- Wave 4.5 finish-lane documentation sync: complete.
- Wave 4.5 closure signoff: pending Architect approval.
