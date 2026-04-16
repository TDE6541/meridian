# Meridian Pipeline Substrate

This directory now ships the Wave 4B Block B Python intake and segmentation floor.

## What Block B ships

- An additive `src/pipeline/` package boundary for later pipeline work.
- Internal HoldPoint-native capture dataclasses for `Segment`, `Directive`, and `Hold`.
- Additive boundary handoff dataclasses for `CaptureArtifact` and `GovernanceHandoffPayload`.
- Deterministic transcript cache helpers: `normalize_transcript()` and `transcript_hash()`.
- Env-driven OpenAI config inspection and resolution surfaces for later extraction blocks.
- An OpenAI-only audio transcription wrapper in `transcription.py` with explicit config failure posture.
- Deterministic civic transcript segmentation in `segmentation.py` for timestamped and low-structure transcript text.
- A structural orchestration skeleton that names the intended phase order and stops before extraction and boundary handoff behavior.

## What Block B does not ship

- No extraction runtime.
- No merge or fallback logic.
- No JS runtime wiring.
- No transport subject invention.
- No end-to-end capture pipeline claim.
- No local Whisper or non-OpenAI transcription path.

## Contract notes

- Internal models remain HoldPoint-native until boundary translation.
- Meridian-specific translation belongs at the boundary layer only.
- The handoff contracts in this directory do not claim arbitrary extracted entities are already governable by the existing JS runtime.
- Segmentation and transcription are internal intake behavior only in this block.
- Extraction, merge, fallback extraction, and runtime handoff behavior belong to later blocks.
