# Meridian Pipeline Substrate

This directory ships the Wave 4B Block A Python landing zone only.

## What Block A ships

- An additive `src/pipeline/` package boundary for later pipeline work.
- Internal HoldPoint-native capture dataclasses for `Segment`, `Directive`, and `Hold`.
- Additive boundary handoff dataclasses for `CaptureArtifact` and `GovernanceHandoffPayload`.
- Deterministic transcript cache helpers: `normalize_transcript()` and `transcript_hash()`.
- Env-driven OpenAI config inspection and resolution surfaces for later extraction blocks.
- A structural orchestration skeleton that names the intended phase order and stops before later-wave behavior.

## What Block A does not ship

- No segmentation runtime.
- No transcription runtime.
- No extraction runtime.
- No merge or fallback logic.
- No JS runtime wiring.
- No transport subject invention.
- No end-to-end capture pipeline claim.

## Contract notes

- Internal models remain HoldPoint-native until boundary translation.
- Meridian-specific translation belongs at the boundary layer only.
- The handoff contracts in this directory do not claim arbitrary extracted entities are already governable by the existing JS runtime.
- Segmentation, transcription, extraction, merge, and fallback behavior belong to later blocks.
