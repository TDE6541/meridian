# Meridian Pipeline Substrate

This directory now ships the Wave 4B Block D Python civic capture seam.

## What Block D ships

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
- Explicit translation logic in `translation.py` that emits:
  - a durable capture artifact preserving meeting metadata, segment lineage, extracted items, confidence backbone, quotes, and boundary flags
  - a reduced bounded governance handoff payload that stays local/frozen and does not invent subjects or entity certainty
- `MeridianPipeline.capture_to_handoff()` and `MeridianPipeline.run()` surfaces that stop at the local/frozen handoff seam.

## What Block D does not ship

- No JS runtime source widening.
- No transport subject invention.
- No suggestions stage.
- No end-to-end capture-to-governance publication claim.
- No local Whisper or non-OpenAI transcription path.
- No multi-provider LLM abstraction.

## Contract notes

- Internal models remain HoldPoint-native until boundary translation.
- Directive and Hold still do not claim one-to-one Meridian entity mapping.
- The capture artifact and handoff payload remain visibly separate.
- The bounded governance handoff does not claim extracted artifacts are already generally governable.
- Subject binding, authority context, evidence context, and runtime decision state remain deferred to the existing JS/runtime lane.
- Fallback is a resilience layer only and not a second extraction engine.
- Transport publication and broader runtime wiring remain deferred to later blocks.
