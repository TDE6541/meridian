# Engine Index

## Purpose

This file lists the current logic-bearing Meridian surfaces that exist in-repo for the Wave 1 foundation, Wave 2 entity ontology extension, shipped Wave 3 bridge substrate, bounded Wave 4A governance runtime lane, bounded Wave 4B meeting-capture pipeline lane, Wave 4.5 calibration truth lock surfaces, shipped Wave 5 authority-topology surfaces, shipped Wave 6 forensic-chain surfaces, shipped Wave 7 civic skins rendering/proof surfaces, shipped Wave 8 corridor scenario integration/proof surfaces, Wave 9 local dashboard proof surfaces, V2-A local/demo-day live civic nervous system surfaces, V2-B/GARP local Authority Runway surfaces, V2-B Foreman/Auth local proof cockpit surfaces, and the V2-C dashboard-local Demo Presentation Layer surfaces. Meridian V1 is complete through Wave 9. Wave 9 is the final V1 wave, and there is no Wave 10 in V1.

## V1 Closure Reference

- `docs/specs/MERIDIAN_V1_FINAL_TRUTH.md`
- `docs/closeouts/MERIDIAN_V1_MASTER_CLOSEOUT.md`
- V1 remains local/proof infrastructure, not a deployed production city system.
- V2-A is recorded separately in `docs/specs/MERIDIAN_V2A_LIVE_CIVIC_NERVOUS_SYSTEM.md` and `docs/closeouts/MERIDIAN_V2A_CLOSEOUT.md`.
- V2-B/GARP Authority Runway is recorded separately in `docs/specs/MERIDIAN_V2B_GARP_AUTHORITY_RUNWAY.md` and `docs/closeouts/MERIDIAN_V2B_GARP_CLOSEOUT.md`.
- V2-B Foreman/Auth local proof cockpit is recorded separately in `docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md` and `docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md`.
- AUTH-5 deployed Vercel URL proof and Auth0 callback/login proof are recorded in `docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md`; final V2-B closeout remains HOLD.
- V2-C Demo Presentation Layer is recorded separately in `docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md` and `docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md`; manual Demo Day proof HOLDs remain carried.

## Bridge Substrate

Purpose: transport-only NATS bridge surfaces for subject cataloging, event and telemetry normalization, command translation, adapter delegation, Meridian publication shaping, and additive Wave 6 forensic receipt publication seam behavior.

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

## Governance Forensic Sidecar Lane

Purpose: bounded Wave 6 forensic-chain substrate and additive post-evaluation publication seam for top-level governance/authority evidence entries only, with demo JSON persistence and synthetic evidence-channel publication over existing subject families.

- `src/governance/forensic/civicForensicChain.js`
- `src/governance/forensic/governanceChainWriter.js`
- `src/governance/forensic/chainPersistence.js`
- `src/governance/forensic/chainPublisher.js`
- `src/governance/forensic/index.js`

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

## Civic Skins Lane

Purpose: bounded Wave 7 rendering-only civic skins surfaces with five shipped skins and deterministic public disclosure boundary behavior.

- `src/skins/CivicSkinFramework.js`
- `src/skins/index.js`
- `src/skins/redaction.js`
- `src/skins/civic/permitting.js`
- `src/skins/civic/council.js`
- `src/skins/civic/operations.js`
- `src/skins/civic/dispatch.js`
- `src/skins/civic/public.js`

## Corridor Scenario Integration Lane

Purpose: bounded Wave 8 integration surfaces for deterministic replay bridge output, deterministic matching and absence detection, single-state scenario composition, multi-step resolution cascade replay, and runner-level verification over frozen scenario fixtures.

- `src/integration/contracts.js`
- `src/integration/pipelineBridge.js`
- `src/integration/matchingEngine.js`
- `src/integration/corridorScenario.js`
- `src/integration/resolutionCascade.js`
- `scripts/run-corridor-scenario.js`

## V2-A Local Live Lane

Purpose: bounded local/demo-day live civic nervous system surfaces for local live sessions, local governance projection, JSON-only HoldPoint ingest, live absence, optional dashboard Live Mode, local seed/corridor generation, Constellation-compatible replay, and inert Foreman seams. V2-A does not ship production behavior, live city integration, legal certification, live broker proof, Auth0/OpenFGA integration, live Whisper/audio, or Foreman behavior.

- `src/live/contracts.js`
- `src/live/liveFeedEvent.js`
- `src/live/liveHashChain.js`
- `src/live/liveSessionStore.js`
- `src/live/liveEntityDelta.js`
- `src/live/liveGovernanceGateway.js`
- `src/live/liveDashboardProjection.js`
- `src/live/liveEventBus.js`
- `src/live/adapters/holdpointArtifactAdapter.js`
- `src/live/adapters/captureToEntityDelta.js`
- `src/live/adapters/holdpointArtifactIngest.js`
- `src/live/absence/liveAbsenceProfiles.js`
- `src/live/absence/liveAbsenceRules.js`
- `src/live/absence/liveAbsenceEvaluator.js`
- `src/live/cityData/fortWorthSeedManifest.js`
- `src/live/cityData/fortWorthSeedPack.js`
- `src/live/corridorGenerator.js`
- `src/live/adapters/constellationReplayAdapter.js`
- `scripts/run-live-governance.js`
- `scripts/replay-constellation-stream.js`

## V2-B/GARP Local Authority Runway

Purpose: bounded local V2-B/GARP authority surfaces for deterministic authority request/evaluation/store contracts, explicit action-token handling, payload-only notification builder, local lifecycle/action record handling, and authority-result handling as implemented. The lane is V2-B/GARP-local and does not widen V1, V2-A, LiveFeedEvent kinds, or ForensicChain vocabulary.

- `src/live/authority/authorityContracts.js`
- `src/live/authority/civicAuthorityModel.js`
- `src/live/authority/authorityResolutionEngine.js`
- `src/live/authority/authorityRequestStore.js`
- `src/live/authority/authorityTokens.js`
- `src/live/authority/authorityNotificationService.js`
- `src/live/authority/authorityResolutionHandler.js`

## Local Dashboard Lane

Purpose: bounded Wave 9 local dashboard proof over committed Wave 8 runner payload snapshots, V2-A optional local Live Mode, V2-B/GARP dashboard-local role-session/authority cockpit surfaces, V2-B Foreman/Auth local guide/explainer cockpit surfaces, and V2-C dashboard-local presentation/choreography/reliability surfaces. The dashboard consumes `dashboard/public/scenarios/*.json`, uses `step.skins.outputs` as the canonical skin payload seam, keeps Director Mode / Absence Lens view-only, keeps snapshot mode default, consumes `DashboardLiveProjectionV1` only when Live Mode is enabled, and exposes dashboard-local Auth0 Universal Login role-session proof, payload-only notification preview, Foreman guide/explainer narration, shared local authority endpoint behavior, browser-native voice fallback, deterministic avatar state, prepared disclosure preview actions, Mission presentation, Mission Rail, HOLD Wall, Demo Audit Wall, reliability runbook/checklists, and SyncPill/approval pulse/vibration fallback. It does not import `src/skins/**` or root `src/live/**` in the browser and does not recompute governance, authority, matching, forensic, absence, skin, city, or cascade truth.

- `dashboard/package.json`
- `dashboard/index.html`
- `dashboard/README.md`
- `dashboard/api/authority-requests.js`
- `dashboard/src/**/*.ts*`
- `dashboard/src/auth/**/*.ts*`
- `dashboard/src/roleSession/**/*.ts*`
- `dashboard/src/authority/**/*.ts*`
- `dashboard/src/live/**/*.ts`
- `dashboard/src/foremanGuide/**/*.tsx`
- `dashboard/src/demo/**/*.ts`
- `dashboard/public/demo/*.md`
- `dashboard/public/audio/foreman/README.md`
- `dashboard/tests/**/*.ts*`
- `dashboard/public/scenarios/*.json`

## V2-B Foreman/Auth Local Proof Cockpit

Purpose: bounded dashboard-local guide/explainer cockpit for deterministic Foreman context, offline source-bounded narration, authority-aware narration, guided event binding, Gold modes, browser-native speech output/input fallback, deterministic avatar state, dashboard-local Auth0 role-session mapping, and shared local `/api/authority-requests` endpoint behavior. Local/pre-deployment truth is recorded in the local closeout, and AUTH-5 deployed demo proof is recorded separately. This lane does not ship model/API calls, external voice service, Whisper/audio upload/transcription, delivered notifications, OpenFGA behavior, public portal behavior, legal/TPIA sufficiency, or final V2-B closeout.

- `docs/specs/MERIDIAN_V2B_FOREMAN_GUIDED_PROOF_COCKPIT.md`
- `docs/closeouts/MERIDIAN_V2B_FOREMAN_PLATINUM_LOCAL_CLOSEOUT.md`
- `docs/closeouts/MERIDIAN_V2B_AUTH5_DEPLOYED_PROOF_CLOSEOUT.md`
- `docs/closeouts/MERIDIAN_V2B_CODE_QUALITY_DEMO_HARDENING_CLOSEOUT.md`
- `dashboard/api/authority-requests.js`
- `dashboard/src/foremanGuide/**/*.ts*`
- `dashboard/src/components/ForemanGuidePanel.tsx`
- `dashboard/tests/foreman*.test.ts`
- `dashboard/tests/foreman*.test.tsx`

## V2-C Demo Presentation Layer

Purpose: dashboard-local presentation, choreography, legibility, and reliability over existing proof only. V2-C ships Mission presentation skin, Mission Rail, Fictional Demo Permit #4471, HOLD Wall, Absence Lens presentation overlay, Decision Counter, Demo Audit Wall, Foreman audio identity, Disclosure Receipt, Doctrine Card, reliability panel/runbook/checklists, SyncPill, approval pulse, and vibration fallback. It does not widen root/shared contracts, root governance/forensic/authority/live absence/root skins substrates, Auth0/Vercel/env/package/deploy/config/secret/security surfaces, or manual proof status.

- `docs/specs/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER.md`
- `docs/closeouts/MERIDIAN_V2C_DEMO_PRESENTATION_LAYER_CLOSEOUT.md`
- `dashboard/src/components/MissionPresentationShell.tsx`
- `dashboard/src/components/MissionRail.tsx`
- `dashboard/src/components/HoldWall.tsx`
- `dashboard/src/components/DecisionCounter.tsx`
- `dashboard/src/components/DemoAuditWall.tsx`
- `dashboard/src/components/DoctrineCard.tsx`
- `dashboard/src/components/DemoReliabilityPanel.tsx`
- `dashboard/src/components/SyncPill.tsx`
- `dashboard/src/demo/**/*.ts`
- `dashboard/src/foremanGuide/audioIdentity.ts`
- `dashboard/public/audio/foreman/README.md`
- `dashboard/public/demo/print-instructions.md`
- `dashboard/public/demo/reliability-runbook.md`
- `dashboard/tests/demo-reliability.test.tsx`
- `dashboard/tests/mission-presentation.test.tsx`
- `dashboard/tests/sync-choreography.test.tsx`

## Governance Substrate

Purpose: legacy/compatibility governance shadow container factories and validators for entity scaffolds. The `authority`, `evidence`, `obligation`, and `absence` shadows are structural containers only; active governance data lives in typed `signal_tree`.

- `src/governance/shadows.js`

## Entity Scaffold Substrate

Purpose: locked structural entity scaffolds with legacy governance shadow containers and active typed `signal_tree` defaults across 13 entity files.

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

Purpose: structural proof suite plus Wave 3 bridge proof surfaces, Wave 4A runtime activation/sweep proof, Wave 4B pipeline/frozen-handoff proof surfaces, Wave 4.5 calibration replay proof surfaces, Wave 5 authority-topology proof surfaces, Wave 6 forensic-chain proof surfaces, Wave 7 civic skins proof surfaces, Wave 8 corridor scenario integration proof surfaces, Wave 9 dashboard-local proof surfaces, V2-A local live proof surfaces, and V2-B/GARP local authority proof surfaces.

- `tests/config.test.js`
- `tests/deny-patterns.test.js`
- `tests/entities.test.js`
- `tests/bridge.subjectCatalog.test.js`
- `tests/bridge.eventTranslator.test.js`
- `tests/bridge.commandTranslator.test.js`
- `tests/bridge.eventSubscriber.test.js`
- `tests/bridge.commandSubscriber.test.js`
- `tests/bridge.chainPublisher.test.js`
- `tests/bridge.governancePublisher.test.js`
- `tests/bridge.governanceTransportAdapter.test.js`
- `tests/governance.forensicChain.test.js`
- `tests/governance.chainWriter.test.js`
- `tests/governance.chainPersistence.test.js`
- `tests/governance.forensicIntegration.test.js`
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
- `tests/skins.civicFramework.test.js`
- `tests/skins.permitting.test.js`
- `tests/skins.sweep.test.js`
- `tests/skins.council.test.js`
- `tests/skins.operations.test.js`
- `tests/skins.dispatch.test.js`
- `tests/skins.redaction.test.js`
- `tests/skins.public.test.js`
- `tests/skins.integration.test.js`
- `tests/integration/scenarioFixtures.test.js`
- `tests/integration/pipelineBridge.test.js`
- `tests/integration/matchingEngine.test.js`
- `tests/integration/corridorScenario.test.js`
- `tests/integration/corridorCascade.test.js`
- `tests/integration/corridorRunner.test.js`
- `tests/live/*.test.js`
- `tests/live/authority*.test.js`
- `tests/fixtures/scenarios/**/*`
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
- `scripts/run-live-governance.js`
- `scripts/replay-constellation-stream.js`
- `dashboard/tests/*.ts`
- `dashboard/tests/*.tsx`
