# Engine Index

## Purpose

This file lists the current logic-bearing Meridian surfaces that exist in-repo for the Wave 1 foundation, Wave 2 entity ontology extension, shipped Wave 3 bridge substrate, bounded Wave 4A governance runtime lane, bounded Wave 4B meeting-capture pipeline lane, Wave 4.5 calibration truth lock surfaces, and local/uncommitted Wave 5 authority-topology surfaces.

## Bridge Substrate

Purpose: transport-only NATS bridge surfaces for subject cataloging, event and telemetry normalization, command translation, adapter delegation, and Meridian publication shaping.

- `src/bridge/subjectCatalog.js`
- `src/bridge/natsTransport.js`
- `src/bridge/eventTranslator.js`
- `src/bridge/commandTranslator.js`
- `src/bridge/eventSubscriber.js`
- `src/bridge/commandSubscriber.js`
- `src/bridge/governancePublisher.js`
- `src/bridge/governanceTransportAdapter.js`

## Governance Runtime Landing Zone

Purpose: bounded Wave 4A+Wave 5 `command_request` evaluator backed by one static local civic policy pack plus runtime subset logic that returns `ALLOW`, `SUPERVISE`, `HOLD`, `BLOCK`, or bounded `REVOKE` (Wave 5), derives bounded `promise_status`, emits separate civic confidence tiers, adds short rationale strings, and exposes a read-only on-demand sweep facade without widening publisher behavior, event-side routing, or scheduling logic.

- `src/governance/runtime/deriveCivicConfidence.js`
- `src/governance/runtime/derivePromiseStatus.js`
- `src/governance/runtime/decisionVocabulary.js`
- `src/governance/runtime/meridian-governance-config.js`
- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/fortWorthAuthorityTopology.js`
- `src/governance/runtime/resolveAuthorityDomain.js`
- `src/governance/runtime/resolveAuthorityActor.js`
- `src/governance/runtime/deriveAuthorityRevocation.js`
- `src/governance/runtime/resolveAuthorityDecision.js`
- `src/governance/runtime/projectAuthorityPropagation.js`
- `src/governance/runtime/runtimeSubset.js`
- `src/governance/runtime/runGovernanceSweep.js`
- `src/governance/runtime/index.js`

## Pipeline Capture Lane

Purpose: bounded Wave 4B civic meeting-capture pipeline for transcript normalization/hashing, OpenAI-only transcription, deterministic segmentation, extraction + merge confidence backbone, narrow fallback cues, local/frozen translation seam, and run-level receipt/proof utilities.

- `src/pipeline/models.py`
- `src/pipeline/transcript_cache.py`
- `src/pipeline/llm_client.py`
- `src/pipeline/transcription.py`
- `src/pipeline/segmentation.py`
- `src/pipeline/extraction.py`
- `src/pipeline/merge.py`
- `src/pipeline/fallback.py`
- `src/pipeline/translation.py`
- `src/pipeline/pipeline.py`
- `src/pipeline/receipt.py`
- `src/pipeline/__init__.py`
- `src/pipeline/README.md`

## Governance Substrate

Purpose: shared governance shadow fields and validation substrate for entity scaffolds.

- `src/governance/shadows.js`

## Entity Scaffold Substrate

Purpose: locked structural entity scaffolds with governance/evidence/disclosure shadow shape across 13 entity files.

- `src/entities/action_request.js`
- `src/entities/authority_grant.js`
- `src/entities/corridor_zone.js`
- `src/entities/critical_site.js`
- `src/entities/decision_record.js`
- `src/entities/device.js`
- `src/entities/evidence_artifact.js`
- `src/entities/incident_observation.js`
- `src/entities/inspection.js`
- `src/entities/obligation.js`
- `src/entities/organization.js`
- `src/entities/permit_application.js`
- `src/entities/utility_asset.js`

## Config Substrate

Purpose: read-only Meridian publisher subject builders and connection config imported by the Wave 3 bridge.

- `src/config/constellation.js`

## Proof Surfaces

Purpose: structural proof suite plus Wave 3 bridge proof surfaces, Wave 4A runtime activation/sweep proof, Wave 4B pipeline/frozen-handoff proof surfaces, Wave 4.5 calibration replay proof surfaces, and local Wave 5 authority-topology proof surfaces.

- `tests/config.test.js`
- `tests/deny-patterns.test.js`
- `tests/entities.test.js`
- `tests/bridge.subjectCatalog.test.js`
- `tests/bridge.eventTranslator.test.js`
- `tests/bridge.commandTranslator.test.js`
- `tests/bridge.eventSubscriber.test.js`
- `tests/bridge.commandSubscriber.test.js`
- `tests/bridge.governancePublisher.test.js`
- `tests/bridge.governanceTransportAdapter.test.js`
- `tests/governance.demoProof.test.js`
- `tests/governance.policyPack.test.js`
- `tests/governance.promiseConfidence.test.js`
- `tests/governance.runtime.test.js`
- `tests/governance.runtimeSubset.test.js`
- `tests/governance.authorityTopology.test.js`
- `tests/governance.authorityDomain.test.js`
- `tests/governance.authorityActor.test.js`
- `tests/governance.revoke.test.js`
- `tests/governance.authorityPropagation.test.js`
- `tests/governance.sweep.test.js`
- `tests/governance.pipelineHandoffProof.test.js`
- `tests/pipeline/test_models.py`
- `tests/pipeline/test_transcript_cache.py`
- `tests/pipeline/test_llm_client.py`
- `tests/pipeline/test_transcription.py`
- `tests/pipeline/test_segmentation.py`
- `tests/pipeline/test_extraction.py`
- `tests/pipeline/test_merge.py`
- `tests/pipeline/test_fallback.py`
- `tests/pipeline/test_translation.py`
- `tests/pipeline/test_receipt.py`
- `tests/pipeline/test_end_to_end_proof.py`
- `tests/pipeline/test_calibration_final.py`
- `tests/pipeline/calibration/runner.py`
- `tests/pipeline/calibration/report.py`
- `tests/pipeline/calibration/baselines/recorded_primary_runs.json`
- `tests/pipeline/calibration/baselines/recorded_fallback_runs.json`
- `tests/pipeline/calibration/baselines/baseline_report.json`
- `tests/pipeline/calibration/final/recorded_primary_runs.json`
- `tests/pipeline/calibration/final/recorded_fallback_runs.json`
- `tests/pipeline/calibration/final/final_report.json`
- `tests/pipeline/fort_worth_proof_support.py`
- `tests/pipeline/fixtures/fort_worth_proof/fort_worth_official_agenda_excerpt.txt`
- `tests/pipeline/fixtures/fort_worth_proof/fort_worth_official_agenda_provenance.json`
- `tests/pipeline/fixtures/fort_worth_proof/fort_worth_motion_video_excerpt.txt`
- `tests/pipeline/fixtures/fort_worth_proof/fort_worth_motion_video_provenance.json`
- `tests/pipeline/fixtures/utility_refusal_translation_expected.json`
- `tests/fixtures/governance/hard-stop.commandRequest.json`
- `tests/fixtures/governance/refusal.commandRequest.json`
- `tests/fixtures/governance/safe-pass.commandRequest.json`
- `tests/fixtures/governance/supervised.commandRequest.json`
- `tests/fixtures/nats/events.fixture.json`
- `tests/fixtures/nats/telemetry.fixture.json`
- `tests/fixtures/nats/commands.fixture.json`
- `tests/fixtures/nats/publications.fixture.json`
- `scripts/synthetic-constellation.js`
