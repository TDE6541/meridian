# Meridian Pipeline Substrate

This directory now ships the Wave 4B Block C Python civic capture floor.

## What Block C ships

- The additive `src/pipeline/` package boundary introduced in earlier blocks.
- Internal HoldPoint-native capture dataclasses for `Segment`, `Directive`, and `Hold`.
- Additive boundary handoff dataclasses for `CaptureArtifact` and `GovernanceHandoffPayload`.
- Deterministic transcript cache helpers: `normalize_transcript()` and `transcript_hash()`.
- Env-driven OpenAI config inspection and resolution surfaces for civic extraction.
- An OpenAI-only audio transcription wrapper in `transcription.py`.
- Deterministic civic transcript segmentation in `segmentation.py`.
- Civic extraction in `extraction.py` using a locked three-run ensemble with two role archetypes: `heavy-decision`, `heavy-risk`, `heavy-decision`.
- Ensemble merge in `merge.py` that preserves directive agreement filtering, HOLD > GUESS asymmetry for holds, and the internal confidence triplet (`model_confidence`, `agreement_ratio`, `final_confidence`).
- A narrow fallback cue scan in `fallback.py` that activates only after extraction failure and scans only for bounded civic procedural cues.
- A `MeridianPipeline.capture_text()` surface that stops before any translation or runtime handoff claim.

## What Block C does not ship

- No translation seam wiring.
- No JS runtime wiring.
- No transport subject invention.
- No suggestions stage.
- No end-to-end capture-to-governance execution claim.
- No local Whisper or non-OpenAI transcription path.
- No multi-provider LLM abstraction.

## Contract notes

- Internal models remain HoldPoint-native until boundary translation.
- Directive and Hold still do not claim one-to-one Meridian entity mapping.
- The handoff contracts in this directory do not claim extracted artifacts are already governable by the existing JS runtime.
- Fallback is a resilience layer only and not a second extraction engine.
- Translation and runtime handoff behavior remain deferred to later blocks.
