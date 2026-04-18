# Wave 4.5 Calibration

## Purpose

Wave 4.5 locks the calibration truth for the bounded Wave 4B meeting-capture lane using a frozen corpus, replayable recorded runs, and a final model-pinned report. This wave is calibration/measurement only and does not reopen structure.

## Block Truth (A-D)

### Block A - Frozen corpus truth

- Calibration corpus is frozen under `tests/pipeline/fixtures/calibration_corpus/`.
- Corpus metadata in `tests/pipeline/calibration/final/final_report.json`:
  - `corpus_version`: `v2_post_cr_ruling_a`
  - `meeting_count`: `4`
  - `gold_item_count`: `39`
  - `directive_gold_count`: `27`
  - `hold_gold_count`: `12`
  - `negative_control_count`: `15`
  - dev meetings: `fw_council_2025-09-30`, `cpc_2026-01-08`, `cdc_2025-08-22`
  - holdout meeting: `tif3_2025-10-16`

### Block B - Baseline harness truth (historical only)

- Block B shipped baseline runner/report surfaces:
  - `tests/pipeline/calibration/runner.py`
  - `tests/pipeline/calibration/report.py`
- Historical baseline trio:
  - `tests/pipeline/calibration/baselines/recorded_primary_runs.json`
  - `tests/pipeline/calibration/baselines/recorded_fallback_runs.json`
  - `tests/pipeline/calibration/baselines/baseline_report.json`
- The baseline trio is **historical baseline truth** and **pre-Block-C comparison source**. It is not current calibrated truth.

### Block C - Tuning truth and measured improvement summary

- Block C tuning remained confined to extraction/merge/fallback behavior in the Wave 4B pipeline lane.
- Primary-lane aggregate (all meetings) improved from baseline to final:
  - exact match score: `0.0256` -> `0.1795` (`+0.1539`)
  - relaxed match score: `0.1026` -> `0.6667` (`+0.5641`)
  - micro F1: `0.1176` -> `0.5591` (`+0.4415`)
  - macro F1: `0.1107` -> `0.4351` (`+0.3244`)
  - unsafe certainty rate: `0.5172` -> `0.0`
  - unsupported quote rate: `0.1379` -> `0.0185`
- Per-class view (primary lane, all meetings):
  - directive F1: `0.0714` -> `0.7164`
  - hold F1: `0.1500` -> `0.1538`
  - hold false positives: `25` -> `12`

### Block D - Final artifact family and permanent replay regression

- Current calibrated truth is locked to the final artifact family:
  - `tests/pipeline/calibration/final/recorded_primary_runs.json`
  - `tests/pipeline/calibration/final/recorded_fallback_runs.json`
  - `tests/pipeline/calibration/final/final_report.json`
- Permanent final replay regression is anchored by:
  - `tests/pipeline/test_calibration_final.py`
- Final report version: `wave4.5-blockd-final-v1`.

## Scoring Model

### Exact vs relaxed

- Exact scoring requires strict directive/hold match fidelity.
- Relaxed scoring allows bounded semantic alignment where exact wording diverges.

### Per-class views

- Metrics are reported for:
  - `directive`
  - `hold`
- Each class includes precision, recall, F1, and TP/FP/FN counts.

### Confidence buckets

- Confidence buckets are tracked in the report:
  - `0.00-0.49`
  - `0.50-0.69`
  - `0.70-0.84`
  - `0.85-1.00`
- Final primary-lane all-meetings distribution:
  - `0.00-0.49`: count `1`
  - `0.50-0.69`: count `3`
  - `0.70-0.84`: count `48`
  - `0.85-1.00`: count `2`

### Failure categories

- Reported categories include:
  - `false negative`
  - `false positive`
  - `wrong class`
  - `wrong subtype`
  - `unsupported quote / grounding failure`
  - `unsafe certainty`
  - `fallback miss`
  - `fallback false positive`
  - `duplicated/paraphrased decision merge failure`
  - `segment-boundary miss`
- Final primary-lane all-meetings notable counts:
  - false negative: `13`
  - false positive: `28`
  - wrong class: `2`
  - wrong subtype: `22`
  - unsupported quote / grounding failure: `1`
  - unsafe certainty: `0`

### Fallback isolation lane

- Forced fallback lane is isolated under `forced_fallback_lane` in both baseline/final reports.
- Final forced fallback all-meetings:
  - fallback activations: `4`
  - runtime items: `0`
  - fallback false positives: `0`
  - fallback misses: `39`
  - exact/relaxed scores: `0.0` / `0.0`

### Holdout isolation

- Holdout meeting is isolated as `tif3_2025-10-16`.
- Final primary-lane holdout scores:
  - exact match score: `0.125`
  - relaxed match score: `0.5`
  - micro F1: `0.5`
  - macro F1: `0.3636`

## Model Pin Truth

- Baseline and final calibrated replay artifacts are pinned to `gpt-5.4`.
- Final calibrated replay lock for current truth is `gpt-5.4` as recorded in `tests/pipeline/calibration/final/final_report.json`.

## Explicit Non-Shipped Surfaces

- No Wave 3 or Wave 4A structural reopening.
- No extraction behavior retune in this finish lane.
- No event routing or publisher widening.
- No authority-topology semantics.
- No civic-chain / ForensicChain runtime writes.
- No JS runtime contract widening.
- No historical closeout rewrites.

## Contract and Migration Posture

- Wave 4.5 calibration truth lock does not widen shared contracts.
- `MIGRATIONS.md` remains unchanged in this finish lane.
- Historical closeouts remain historical; Wave 4.5 closes as a wave-level truth lock.
