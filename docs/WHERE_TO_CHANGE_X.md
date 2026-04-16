# Where To Change X

| Change Target | Primary Path(s) | Notes |
|---|---|---|
| Front-door repo truth | `README.md`, `REPO_INDEX.md`, `docs/INDEX.md` | Keep top-level discoverability truthful and synchronized. |
| Agent start surfaces | `README.md`, `CLAUDE.md` | Start links and execution posture live here. |
| Bridge runtime | `src/bridge/*.js` | Transport-only Wave 3 bridge surfaces; adapter activation may delegate into `src/governance/runtime/`, but no entity or KV mutation belongs here. |
| Governance runtime activation | `src/governance/runtime/*.js` | Wave 4A bounded `command_request` evaluator plus the static civic policy pack, runtime subset, Block D civic interpretation output, and Block E on-demand sweep facade; no event-side routing, publisher widening, scheduler logic, or top-level shape widening belongs here. |
| Transcript hashing and normalization | `src/pipeline/transcript_cache.py` | `normalize_transcript()` and `transcript_hash()` are the Wave 4B deterministic cache seam. |
| Transcription posture | `src/pipeline/transcription.py`, `src/pipeline/llm_client.py` | OpenAI-only transcription/env contract lives here (`OPENAI_API_KEY`, `MERIDIAN_TRANSCRIPTION_MODEL`, `MERIDIAN_PIPELINE_MODEL`). |
| Segmentation heuristics | `src/pipeline/segmentation.py` | Timestamp-aware and plain-text civic segmentation rules and cue markers live here. |
| Extraction prompts and role archetypes | `src/pipeline/extraction.py` | System prompt, user prompt template, and ensemble run pattern (`heavy-decision`, `heavy-risk`, `heavy-decision`) are defined here. |
| Merge and confidence backbone behavior | `src/pipeline/merge.py`, `src/pipeline/models.py` | Agreement thresholds, similarity logic, and confidence triplet fields are controlled here. |
| Fallback cue behavior | `src/pipeline/fallback.py` | Narrow post-failure procedural cue scan and fallback confidence defaults live here. |
| Translation and handoff seam | `src/pipeline/translation.py`, `src/pipeline/pipeline.py` | Capture artifact document and reduced local/frozen governance handoff payload seam live here. |
| Receipt generation | `src/pipeline/receipt.py` | Frozen proof manifest and run-level capture receipt shape are generated here. |
| Fort Worth frozen proof fixtures | `tests/pipeline/fixtures/fort_worth_proof/*`, `tests/pipeline/test_end_to_end_proof.py`, `tests/pipeline/fort_worth_proof_support.py` | Official agenda pair is primary verbatim source; motion-video pair is supplemental context only. |
| Wave 4B handoff proof on JS lane | `tests/governance.pipelineHandoffProof.test.js` | Verifies Wave 4B handoff can ride existing Wave 4A governed non-event sweep lane without runtime widening. |
| Bridge specs | `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md` | Describe shipped bridge truth only; do not imply live broker proof or actor-level authority. |
| Governance and capture specs/closeouts | `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`, `docs/specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md`, `docs/closeouts/WAVE4A_CLOSEOUT.md`, `docs/closeouts/WAVE4B_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_D_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_E_CLOSEOUT.md` | Record shipped wave truth without rewriting historical closeouts. |
| Bridge/runtime/capture tests and fixtures | `tests/bridge*.test.js`, `tests/governance.runtime.test.js`, `tests/governance.policyPack.test.js`, `tests/governance.runtimeSubset.test.js`, `tests/governance.promiseConfidence.test.js`, `tests/governance.sweep.test.js`, `tests/governance.demoProof.test.js`, `tests/governance.pipelineHandoffProof.test.js`, `tests/pipeline/*.py`, `tests/pipeline/fixtures/*`, `tests/fixtures/governance/*.json`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js` | Fixture-backed proof for bridge/runtime surfaces plus Wave 4B frozen capture/handoff proof. |
| Governance shadows | `src/governance/shadows.js` | Shared shadow substrate for entity scaffolds. |
| Entity scaffolds | `src/entities/*.js` | 13 locked scaffold files; do not widen without explicit scope. |
| Entity ontology spec | `docs/specs/ENTITY_ONTOLOGY.md` | Wave 2 shipped typed `signal_tree` and status rules live here. |
| Constellation config | `src/config/constellation.js` | Read-only Meridian publisher/config substrate imported by the bridge. |
| Structural proof tests | `tests/config.test.js`, `tests/deny-patterns.test.js`, `tests/entities.test.js` | Keep package/config/entity posture truthful. |
| Closeouts | `docs/closeouts/README.md`, `docs/closeouts/WAVE1_CLOSEOUT.md`, `docs/closeouts/WAVE2_CLOSEOUT.md`, `docs/closeouts/WAVE3_CLOSEOUT.md`, `docs/closeouts/WAVE4A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_D_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_E_CLOSEOUT.md`, `docs/closeouts/WAVE4B_CLOSEOUT.md` | Durable delivered-wave summaries. |
| Deny matrix | `CLAUDE.md` (Block 0 Deny Matrix) | Sensitive edit guard posture and patterns. |
