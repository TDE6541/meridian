# Wave 1 Closeout

## Purpose

This document is the durable closeout record for the Wave 1 foundation shipped on `main`.

## What Shipped

- Root canon and substrate:
  - `README.md`
  - `CLAUDE.md`
  - `TEAM_CHARTER.md`
  - `AI_EXECUTION_DOCTRINE.md`
  - `CONTRIBUTING.md`
  - `MIGRATIONS.md`
  - `package.json`
  - `.gitignore`
- Governance substrate:
  - `src/governance/shadows.js`
- Entity scaffold substrate (12 files):
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
- Config substrate:
  - `src/config/constellation.js`
- Structural proof tests:
  - `tests/entities.test.js`
  - `tests/deny-patterns.test.js`
  - `tests/config.test.js`

## What Did Not Ship

- No UI surface ships in Wave 1.
- No runnable application surface ships in Wave 1.
- No deployment/runtime messaging integration ships in Wave 1.
- No `nats` dependency is declared in `package.json`.
- Upstream 5 Constellation stream helpers remain excluded.
- `evidence_artifact.js` is not present.
- Ontology filename seam remains unresolved and out of scope.

## Final Repo Truth Summary

- Wave 1 is a foundation-only delivery.
- Logic surfaces are limited to governance shadows, entity scaffolds, and narrow Constellation config.
- Proof surfaces are limited to structural tests under `tests/`.

## Remaining HOLDs

- Ontology filename seam unresolved (carried forward).
- NATS pin HOLD remains open (no dependency introduced).
- Upstream 5 helper exclusion remains in effect.

## Signoff Status

- Wave 1 merged to `main`: yes.
- Ready for Wave 2 / next envelope: yes.
