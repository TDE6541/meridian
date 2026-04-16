# Meridian Pipeline Substrate

This directory now ships the Wave 4B Block A-E bounded Python civic capture lane.

## What Wave 4B ships

- Block A substrate:
  - additive `src/pipeline/` package boundary
  - internal HoldPoint-native dataclasses for `Segment`, `Directive`, and `Hold`
  - additive boundary dataclasses for `CaptureArtifact` and `GovernanceHandoffPayload`
  - deterministic transcript helpers: `normalize_transcript()` and `transcript_hash()`
  - env-driven OpenAI config inspection/resolution in `llm_client.py`
- Block B intake:
  - OpenAI-only audio transcription wrapper in `transcription.py`
  - deterministic civic transcript segmentation in `segmentation.py` (timestamp-aware and plain-text modes)
- Block C capture:
  - civic extraction in `extraction.py` using locked three-run ensemble pattern: `heavy-decision`, `heavy-risk`, `heavy-decision`
  - ensemble merge in `merge.py` with directive agreement filtering and confidence backbone (`model_confidence`, `agreement_ratio`, `final_confidence`)
  - narrow fallback cue scan in `fallback.py` that activates only after extraction failure
- Block D seam:
  - explicit translation logic in `translation.py` that emits:
    - a durable capture artifact document with meeting metadata, lineage, extracted items, confidence backbone, and boundary flags
    - a reduced bounded governance handoff payload kept local/frozen
  - `MeridianPipeline.capture_to_handoff()` / `MeridianPipeline.run()` stop at the local/frozen handoff seam
- Block E proof and receipt:
  - frozen proof manifest helper in `receipt.py`
  - run-level capture receipt helper in `receipt.py`
  - Fort Worth frozen proof fixtures and proof-support path under `tests/pipeline/fixtures/fort_worth_proof/`
  - end-to-end proof coverage in `tests/pipeline/test_end_to_end_proof.py`

## Fort Worth artifact posture

- Official agenda pair is the primary verbatim source.
- Motion-video pair is supplemental context only.
- Frozen proof path preserves that priority in manifest/provenance assertions.

## What Wave 4B does not ship

- No JS runtime source widening under `src/bridge/**` or `src/governance/**`.
- No transport subject invention or general publisher widening.
- No general event routing.
- No authority-topology semantics.
- No civic-chain or ForensicChain runtime writes.
- No local Whisper or non-OpenAI transcription path.
- No multi-provider LLM abstraction.
- No claim of end-to-end production capture-to-publication runtime completion.

## Contract notes

- Internal capture models remain HoldPoint-native until boundary translation.
- `Directive` and `Hold` do not claim one-to-one Meridian entity mapping.
- Capture artifact and handoff payload remain explicitly separate.
- Bounded governance handoff does not claim extracted artifacts are generally governable yet.
- Subject binding, authority/evidence context finalization, and runtime decision state remain deferred to the existing JS/runtime lane.
- Fallback is resilience only, not a second extraction engine.
