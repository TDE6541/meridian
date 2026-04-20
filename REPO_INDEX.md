# Meridian Repo Index

## Purpose

This is the front-door navigation index for Meridian. It points agents and maintainers to canonical sources, current working surfaces, and the fastest truthful path to make changes without widening scope.

## Wave Scope Status

Wave 4B Blocks A-E layer a bounded meeting-capture pipeline lane under `src/pipeline/` onto the previously shipped Wave 1 foundation, Wave 2 ontology extension, Wave 3 transport bridge substrate, and Wave 4A bounded governance runtime lane. Wave 4.5 closes the calibration lane with frozen corpus posture, historical baseline truth/pre-Block-C comparison artifacts, and a locked final replay artifact family/report. Shipped Wave 5 Packets 1-3 add a bounded authority-topology lane in `src/governance/runtime/` with additive entity validator widening, static Fort Worth topology declaration, bounded authority evaluation, bounded REVOKE activation, and projection-only propagation. Shipped Wave 6 Packets 1-2 add a bounded forensic-chain lane under `src/governance/forensic/` plus an additive post-evaluation publication seam in `src/bridge/governanceTransportAdapter.js`.

## Canonical Root Files

- `README.md`
- `CLAUDE.md`
- `TEAM_CHARTER.md`
- `AI_EXECUTION_DOCTRINE.md`
- `CONTRIBUTING.md`
- `MIGRATIONS.md`
- `package.json`
- `package-lock.json`
- `.gitignore`

## Canonical Directories

- `src/` (bridge + governance + pipeline + entity + config substrate)
- `tests/` (structural proof suite + bridge/runtime proof suite + pipeline proof suite)
- `docs/` (specs, schemas, notes, indexes, closeouts)
- `scripts/` (synthetic bridge proof harness)

## Current Primary Sources

- Posture and operating rules: `CLAUDE.md`, `TEAM_CHARTER.md`, `AI_EXECUTION_DOCTRINE.md`
- Repo identity and front door: `README.md`
- Bridge runtime substrate: `src/bridge/*.js`
- Governance runtime landing zone, sweep facade, subset, and policy pack: `src/governance/runtime/*.js`
- Wave 4B capture substrate: `src/pipeline/*.py`
- Bridge specs: `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- Wave 4A runtime activation spec: `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`
- Wave 4B meeting-capture spec: `docs/specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md`
- Wave 4.5 calibration spec: `docs/specs/WAVE4_5_CALIBRATION.md`
- Wave 4.5 closeout: `docs/closeouts/WAVE4_5_CLOSEOUT.md`
- Wave 5 authority-topology spec: `docs/specs/WAVE5_AUTHORITY_TOPOLOGY.md`
- Wave 5 closeout: `docs/closeouts/WAVE5_CLOSEOUT.md`
- Wave 6 forensic-chain spec: `docs/specs/WAVE6_FORENSICCHAIN_CIVIC.md`
- Wave 6 closeout: `docs/closeouts/WAVE6_CLOSEOUT.md`
- Wave 6 forensic substrate: `src/governance/forensic/*.js`
- Governance substrate: `src/governance/shadows.js`
- Entity scaffold substrate: `src/entities/*.js`
- Entity ontology spec: `docs/specs/ENTITY_ONTOLOGY.md`
- Constellation config substrate: `src/config/constellation.js`
- Proof surfaces: `tests/bridge*.test.js`, `tests/bridge.chainPublisher.test.js`, `tests/governance.runtime.test.js`, `tests/governance.policyPack.test.js`, `tests/governance.runtimeSubset.test.js`, `tests/governance.promiseConfidence.test.js`, `tests/governance.sweep.test.js`, `tests/governance.demoProof.test.js`, `tests/governance.pipelineHandoffProof.test.js`, `tests/governance.authorityTopology.test.js`, `tests/governance.authorityDomain.test.js`, `tests/governance.authorityActor.test.js`, `tests/governance.revoke.test.js`, `tests/governance.authorityPropagation.test.js`, `tests/governance.forensicChain.test.js`, `tests/governance.chainWriter.test.js`, `tests/governance.chainPersistence.test.js`, `tests/governance.forensicIntegration.test.js`, `tests/pipeline/*.py`, `tests/pipeline/fixtures/*`, `tests/config.test.js`, `tests/deny-patterns.test.js`, `tests/entities.test.js`, `tests/fixtures/governance/*.json`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js`

## Current Repo State

- Wave 1 foundation, Wave 2 ontology extension, Wave 3 transport-only bridge, Wave 4A bounded governance runtime lane, Wave 4B bounded meeting-capture lane, and Wave 4.5 calibration truth lock are landed in-repo.
- Wave 5 Packets 1-3 and Wave 6 Packets 1-2 are committed on `main` and aligned with `origin/main`.
- No UI ships in this repo today.
- No runnable application ships in this repo today.
- No live broker proof or production runtime compatibility proof ships in this repo today.
- `package.json` declares only `nats` as a runtime dependency.
- `src/config/constellation.js` remains the read-only Meridian publisher/config substrate.
- The governance transport adapter now delegates `command_request` evaluation into `src/governance/runtime/` and may return `ALLOW`, `SUPERVISE`, `HOLD`, or `BLOCK`.
- `src/governance/runtime/meridian-governance-config.js` is the only runtime config source for Wave 4A governance evaluation.
- `src/governance/runtime/runtimeSubset.js` now applies the approved runtime subset for control-rod posture, constraints, interlocks, hold shaping, omission evaluation, continuity, standing risk, and Block D civic interpretation output.
- Wave 5 runtime surfaces now include `fortWorthAuthorityTopology.js`, `resolveAuthorityDomain.js`, `resolveAuthorityActor.js`, `resolveAuthorityDecision.js`, `deriveAuthorityRevocation.js`, and `projectAuthorityPropagation.js` as bounded local authority-topology logic.
- `evaluateGovernanceRequest.js` now orchestrates additive authority domain/actor composition and optional read-only propagation projection via nested `authority_context.propagation_context`.
- `runtimeSubset.civic.authority_resolution` and `runtimeSubset.civic.revocation` are additive runtime-only projections; top-level request shape and publication contracts remain unchanged.
- Wave 6 forensic runtime surfaces now include `civicForensicChain.js`, `governanceChainWriter.js`, `chainPersistence.js`, `chainPublisher.js`, and `src/governance/forensic/index.js` as bounded local forensic-chain substrate.
- Wave 6 active civic forensic entry vocabulary is narrowed to `GOVERNANCE_DECISION` and `AUTHORITY_EVALUATION`; deferred meeting/permit/inspection/obligation forensic entry types remain rejected.
- Wave 6 demo persistence is local JSON under `.meridian/forensic-chain/` with `.gitignore` guard; no DB persistence or cryptographic immutability surface ships.
- `src/bridge/governanceTransportAdapter.js` now includes an additive post-evaluation forensic seam that appends receipts through existing `publications` only after successful chain append.
- Wave 6 forensic publication reuses existing `constellation.evidence.*` subjects on `CONSTELLATION_EVIDENCE`; no new stream or subject family ships.
- `src/governance/runtime/runGovernanceSweep.js` now provides a read-only, on-demand sweep facade over explicit synthetic governance inputs only.
- `runtimeSubset.civic.promise_status` mirrors the shipped typed `civic.promise_status` field family as a bounded transient projection without entity mutation.
- `runtimeSubset.civic.confidence.tier` now emits `WATCH`, `GAP`, `HOLD`, or `KILL` as a separate axis from top-level runtime decision state.
- `tests/governance.sweep.test.js` and `tests/governance.demoProof.test.js` freeze the refusal fixture as the governed non-event proof path and keep supporting controls bounded.
- `src/pipeline/` now ships:
  - internal HoldPoint-native `Segment` / `Directive` / `Hold` capture contracts
  - OpenAI env/config and OpenAI-only transcription surfaces
  - deterministic segmentation + extraction ensemble + merge confidence backbone
  - narrow fallback cue scan for extraction failure
  - translation seam that emits a durable capture artifact and reduced local/frozen governance handoff payload
  - frozen proof manifest and run-level capture receipt builders
- `tests/pipeline/test_end_to_end_proof.py` freezes Fort Worth proof posture: official agenda pair is primary verbatim source; motion-video pair is supplemental context only.
- `tests/governance.pipelineHandoffProof.test.js` proves the Wave 4B handoff can ride the existing Wave 4A governed non-event sweep lane without runtime widening.
- Wave 4.5 calibration truth lock surfaces now include:
  - historical baseline truth and pre-Block-C comparison source trio under `tests/pipeline/calibration/baselines/`
  - current calibrated truth artifact family under `tests/pipeline/calibration/final/`
  - permanent final replay regression at `tests/pipeline/test_calibration_final.py`
  - wave-level spec/closeout at `docs/specs/WAVE4_5_CALIBRATION.md` and `docs/closeouts/WAVE4_5_CLOSEOUT.md`
- Wave 4.5 final report records model pin `gpt-5.4` and report version `wave4.5-blockd-final-v1`.
- Wave 5 Packet 3 `REVOKE` is active only for `authority_revoked_mid_action`, `permit_superseded_by_overlap`, and `cross_jurisdiction_resolved_against_requester`.
- `event_observation` remains explicitly blocked and deferred in Wave 4A.
- No periodic worker, scheduler, timer, or daemon ships for governance sweep invocation.
- Publisher behavior remains intentionally unchanged for `ALLOW`, `SUPERVISE`, and fail-closed `BLOCK`.
- No general event routing or general publisher widening ships in Wave 4B.
- No generalized authority-topology widening ships in Wave 4B/Wave 5, and no Wave 6 claim implies live broker proof, legal/tamper-proof immutability, meeting-capture forensic recording, permit/inspection/obligation forensic recording, or per-helper chain spam.
- Ontology filename seam remains unresolved and out of scope here.

## Where To Change X (Quick Pointers)

- Front-door repo truth: `README.md`, `REPO_INDEX.md`, `docs/INDEX.md`
- Agent start surfaces: `README.md`, `CLAUDE.md`
- Bridge runtime: `src/bridge/*.js`
- Governance runtime activation: `src/governance/runtime/*.js`
- Meeting-capture pipeline lane: `src/pipeline/*.py`, `src/pipeline/README.md`
- Bridge specs: `docs/specs/WAVE3_NATS_BRIDGE.md`, `docs/specs/NATS_EVENT_COMMAND_TRANSLATION.md`
- Governance/runtime/capture specs and closeouts: `docs/specs/WAVE4A_GOVERNANCE_RUNTIME.md`, `docs/specs/WAVE4B_MEETING_CAPTURE_PIPELINE.md`, `docs/specs/WAVE4_5_CALIBRATION.md`, `docs/closeouts/WAVE4A_CLOSEOUT.md`, `docs/closeouts/WAVE4B_CLOSEOUT.md`, `docs/closeouts/WAVE4_5_CLOSEOUT.md`
- Wave 5 authority-topology truth surfaces: `docs/specs/WAVE5_AUTHORITY_TOPOLOGY.md`, `docs/closeouts/WAVE5_CLOSEOUT.md`
- Wave 6 forensic-chain truth surfaces: `docs/specs/WAVE6_FORENSICCHAIN_CIVIC.md`, `docs/closeouts/WAVE6_CLOSEOUT.md`, `src/governance/forensic/*.js`, `tests/governance.forensicChain.test.js`, `tests/governance.chainWriter.test.js`, `tests/governance.chainPersistence.test.js`, `tests/bridge.chainPublisher.test.js`, `tests/governance.forensicIntegration.test.js`, `tests/bridge.governanceTransportAdapter.test.js`
- Bridge/runtime/pipeline tests and fixtures: `tests/bridge*.test.js`, `tests/governance.runtime.test.js`, `tests/governance.policyPack.test.js`, `tests/governance.runtimeSubset.test.js`, `tests/governance.promiseConfidence.test.js`, `tests/governance.sweep.test.js`, `tests/governance.demoProof.test.js`, `tests/governance.pipelineHandoffProof.test.js`, `tests/pipeline/*.py`, `tests/pipeline/fixtures/*`, `tests/fixtures/governance/*.json`, `tests/fixtures/nats/*.json`, `scripts/synthetic-constellation.js`
- Governance shadows: `src/governance/shadows.js`
- Entity scaffolds: `src/entities/*.js`
- Entity ontology spec: `docs/specs/ENTITY_ONTOLOGY.md`
- Constellation config: `src/config/constellation.js`
- Closeouts: `docs/closeouts/README.md`, `docs/closeouts/WAVE1_CLOSEOUT.md`, `docs/closeouts/WAVE2_CLOSEOUT.md`, `docs/closeouts/WAVE3_CLOSEOUT.md`, `docs/closeouts/WAVE4A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_A_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_B_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_C_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_D_CLOSEOUT.md`, `docs/closeouts/WAVE4A_BLOCK_E_CLOSEOUT.md`, `docs/closeouts/WAVE4B_CLOSEOUT.md`, `docs/closeouts/WAVE4_5_CLOSEOUT.md`, `docs/closeouts/WAVE5_CLOSEOUT.md`, `docs/closeouts/WAVE6_CLOSEOUT.md`
- Detailed mapping: `docs/WHERE_TO_CHANGE_X.md`
