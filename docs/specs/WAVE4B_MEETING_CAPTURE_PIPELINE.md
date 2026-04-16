# Wave 4B Meeting Capture Pipeline

## Purpose

Wave 4B ships a bounded civic meeting-capture lane that can normalize/segment transcripts, extract directives and holds, merge confidence signals, and translate results into a local/frozen governance handoff seam without widening JS runtime behavior.

## Shipped Block Truth (A-E)

### Block A - Pipeline substrate

- Added `src/pipeline/` package boundary and exports in `src/pipeline/__init__.py`.
- Added internal HoldPoint-native capture contracts in `src/pipeline/models.py`:
  - `Segment`
  - `Directive`
  - `Hold`
- Added additive boundary contracts:
  - `CaptureArtifact`
  - `GovernanceHandoffPayload`
- Added deterministic transcript hashing helpers in `src/pipeline/transcript_cache.py`.
- Added env-driven OpenAI config posture/resolution and JSON chat request wrapper in `src/pipeline/llm_client.py`.
- Added orchestration scaffold in `src/pipeline/pipeline.py`.

### Block B - Intake and segmentation

- Added OpenAI-only transcription surface in `src/pipeline/transcription.py` with `MERIDIAN_TRANSCRIPTION_MODEL` posture.
- Added civic transcript segmentation in `src/pipeline/segmentation.py`:
  - timestamp-aware segmentation
  - plain-text segmentation
  - cue marker detection for agenda/procedural/motion/comment/report patterns

### Block C - Extraction, merge, fallback

- Added extraction prompt and ensemble execution in `src/pipeline/extraction.py`.
- Locked ensemble run pattern to:
  - `heavy-decision`
  - `heavy-risk`
  - `heavy-decision`
- Added merge logic in `src/pipeline/merge.py` with:
  - directive agreement threshold
  - HOLD > GUESS compatible hold preservation
  - confidence backbone (`model_confidence`, `agreement_ratio`, `final_confidence`)
- Added narrow post-failure fallback cue scan in `src/pipeline/fallback.py`.

### Block D - Translation seam

- Added capture translation surface in `src/pipeline/translation.py` that emits:
  - durable capture artifact document
  - reduced local/frozen governance handoff payload
- Added orchestration surfaces in `src/pipeline/pipeline.py`:
  - `capture_text()`
  - `translate_capture()`
  - `capture_to_handoff()`
  - `run()`
- Pipeline output stops at local/frozen seam; no transport publication claim is made.

### Block E - Frozen proof and receipt

- Added frozen proof manifest and run-level capture receipt builders in `src/pipeline/receipt.py`.
- Added frozen Fort Worth fixture/provenance pair under `tests/pipeline/fixtures/fort_worth_proof/`.
- Added end-to-end frozen proof test in `tests/pipeline/test_end_to_end_proof.py`.
- Added handoff-to-Wave4A proof compatibility in `tests/governance.pipelineHandoffProof.test.js`.

## Contract and migration posture

- Internal capture contracts remain pipeline-local until translation boundary.
- Wave 4B does not widen `src/bridge/**` or `src/governance/**` runtime contract shapes.
- Wave 4B does not widen Wave 2 typed `signal_tree` contracts.
- `MIGRATIONS.md` remains unchanged in this finish lane because no new shared-contract widening was introduced here.

## Proof posture

- Python unit coverage exists across `tests/pipeline/` for cache, llm client, transcription, segmentation, extraction, merge, fallback, translation, receipt, and end-to-end proof.
- JS compatibility proof exists in `tests/governance.pipelineHandoffProof.test.js`.
- Wave 4B proof path remains bounded and local/frozen; it rides the existing Wave 4A governed non-event sweep lane.

## Fort Worth artifact posture

- Primary frozen source: `fort_worth_official_agenda_*` fixture/provenance pair.
- Supplemental context only: `fort_worth_motion_video_*` fixture/provenance pair.
- The proof manifest marks official agenda pair as `primary_verbatim_source: true` and motion-video pair as non-primary.

## Explicit non-shipped surfaces

- No general event routing.
- No general publisher widening.
- No authority-topology semantics.
- No civic-chain / ForensicChain runtime writes.
- No UI/dashboard skins.
- No multi-provider LLM abstraction.
- No non-OpenAI transcription path.
