# Engine Index

## Purpose

This file lists the current logic-bearing Meridian surfaces that exist in-repo for Wave 1 foundation.

## Governance Substrate

Purpose: shared governance shadow fields and validation substrate for entity scaffolds.

- `src/governance/shadows.js`

## Entity Scaffold Substrate

Purpose: locked structural entity scaffolds with governance/evidence/disclosure shadow shape.

- `src/entities/action_request.js`
- `src/entities/authority_grant.js`
- `src/entities/corridor_zone.js`
- `src/entities/critical_site.js`
- `src/entities/decision_record.js`
- `src/entities/device.js`
- `src/entities/incident_observation.js`
- `src/entities/inspection.js`
- `src/entities/obligation.js`
- `src/entities/organization.js`
- `src/entities/permit_application.js`
- `src/entities/utility_asset.js`

## Config Substrate

Purpose: narrow Constellation subject builders and event/config exports used as foundation surface.

- `src/config/constellation.js`

## Structural Proof Tests

Purpose: structural proof suite for config surface, deny matrix, and entity scaffold floor.

- `tests/config.test.js`
- `tests/deny-patterns.test.js`
- `tests/entities.test.js`
