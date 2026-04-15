# Engine Index

## Purpose

This file lists the current logic-bearing Meridian surfaces that exist in-repo for the Wave 1 foundation, Wave 2 entity ontology extension, shipped Wave 3 bridge substrate, and bounded Wave 4A governance runtime landing zone with a static Block B civic policy pack.

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

Purpose: bounded Wave 4A `command_request` evaluator backed by one static local civic policy pack that returns `ALLOW`, `HOLD`, or `BLOCK` without widening publisher behavior or event-side routing.

- `src/governance/runtime/decisionVocabulary.js`
- `src/governance/runtime/meridian-governance-config.js`
- `src/governance/runtime/evaluateGovernanceRequest.js`
- `src/governance/runtime/index.js`

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

Purpose: structural proof suite plus Wave 3 bridge proof surfaces and the Wave 4A runtime activation and policy-pack proof.

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
- `tests/governance.policyPack.test.js`
- `tests/governance.runtime.test.js`
- `tests/fixtures/governance/refusal.commandRequest.json`
- `tests/fixtures/governance/safe-pass.commandRequest.json`
- `tests/fixtures/nats/events.fixture.json`
- `tests/fixtures/nats/telemetry.fixture.json`
- `tests/fixtures/nats/commands.fixture.json`
- `tests/fixtures/nats/publications.fixture.json`
- `scripts/synthetic-constellation.js`
