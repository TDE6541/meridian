# Meridian Entity Ontology

## Purpose

This spec records the shipped Wave 2 entity ontology truth that exists in-repo today. It is a bounded contract widening, not a full Section 9 implementation.

## Shipped Wave 2 Contract

### Typed signal_tree subset

Meridian ships only this typed `signal_tree` subset in Wave 2:

- `governance.decision_state`: `string | null`, default `null`
- `governance.authority_chain.requested_by_role`: `string | null`, default `null`
- `governance.authority_chain.required_approvals`: `string[]`, default `[]`
- `governance.authority_chain.resolved_approvals`: `string[]`, default `[]`
- `governance.authority_chain.missing_approvals`: `string[]`, default `[]`
- `governance.evidence.required_count`: non-negative integer, default `0`
- `governance.evidence.present_count`: non-negative integer, default `0`
- `governance.evidence.missing_types`: `string[]`, default `[]`
- `governance.absence.inspection_missing`: `boolean`, default `false`
- `governance.absence.notice_missing`: `boolean`, default `false`
- `governance.absence.supersession_missing`: `boolean`, default `false`
- `civic.promise_status.conditions_total`: non-negative integer, default `0`
- `civic.promise_status.conditions_satisfied`: non-negative integer, default `0`
- `civic.promise_status.oldest_open_condition_at`: `string | null`, default `null`
- `civic.related_zone_ids`: `string[]`, default `[]`
- `civic.related_asset_ids`: `string[]`, default `[]`
- `lineage.decision_record_ids`: `string[]`, default `[]`
- `lineage.evidence_ids`: `string[]`, default `[]`

`createTypedSignalTree()` produces these defaults. `validateTypedSignalTree(value)` enforces this shipped typed subset for entity validation.

### Status rules

- Stateful entities may use `status === null`, or a non-null `status` that appears in that entity's exported `LIFECYCLE_STATES`.
- Stateless entities must use `status === null`. Any non-null `status` is invalid.
- Stateful entities in-repo after Wave 2: `action_request`, `decision_record`, `evidence_artifact`, `incident_observation`, `inspection`, `obligation`, `permit_application`, `utility_asset`.
- Stateless entities in-repo after Wave 2: `authority_grant`, `corridor_zone`, `critical_site`, `device`, `organization`.

### utility_asset promotion

`utility_asset` is stateful in Wave 2 and exports:

- `["proposed", "operational", "under_maintenance", "failed", "retired"]`

### evidence_artifact addition

Wave 2 adds `evidence_artifact` as entity 13. It is stateful and exports:

- `["created", "linked", "verified", "contested", "superseded"]`

### Compatibility note

Wave 1 compatibility shims remain present:

- `createEmptySignalTree()` still returns the minimal Wave 1 shape.
- `validateMinimalSignalTree()` still preserves the Wave 1 minimal validation behavior.

Entity validators now use the typed Wave 2 path. The minimal shim is preserved additively for compatibility, not repurposed as the new default entity contract.

## DEFERRED / RESERVED

The following surfaces are explicitly deferred or reserved in Wave 2 and are not shipped by this spec:

- `civic.public_disclosure`
- `confidence`
- relationship types and graph logic
- non-shipped Section 9 surfaces beyond the typed subset listed above
- runtime, NATS, and disclosure execution surfaces

## Carry-Forward Note

The ontology filename seam is carried forward unchanged in Wave 2. This spec does not rename, reconcile, or sync that upstream filename seam.
