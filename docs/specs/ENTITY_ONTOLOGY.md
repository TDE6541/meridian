# Meridian Entity Ontology

## Purpose

This spec records the shipped Meridian entity ontology truth that exists in-repo today. It remains a bounded contract widening, not a full Section 9 implementation.

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

### Governance shadow compatibility containers

Entities still carry a `governance` object with `authority`, `evidence`, `obligation`, and `absence` plain-object containers for Wave 1 structural compatibility. These shadow containers are empty by default and do not currently carry computed authority, evidence, obligation, or absence state.

Active governance data for entity validation lives in the typed `signal_tree` subset above.

### Status rules

- Stateful entities may use `status === null`, or a non-null `status` that appears in that entity's exported `LIFECYCLE_STATES`.
- Stateless entities must use `status === null`. Any non-null `status` is invalid.
- Stateful entities in-repo after Wave 2: `action_request`, `decision_record`, `evidence_artifact`, `incident_observation`, `inspection`, `obligation`, `permit_application`, `utility_asset`.
- Stateless entities in-repo after Wave 2: `corridor_zone`, `critical_site`, `device`, `organization`.

### Wave 5 Packet 1 additive entity widening

Wave 5 Packet 1 widens only `authority_grant` and `organization`, and it does so additively:

- existing factory defaults remain at the older structural floor for compatibility with the shared structural suite
- validators now accept the widened fields when they are present
- no graph-aware cycle detection, repo-global state lookup, or other entity widening ships in this packet

#### authority_grant

`authority_grant` now accepts these additive fields when present:

- `granted_role`: non-empty string
- `jurisdiction`: non-empty string
- `scope_of_authority`: `string[]`
- `granted_at`: `string | null`
- `expires_at`: `string | null`
- `revoked_at`: `string | null`
- `superseded_at`: `string | null`
- `granted_by_entity_id`: `string | null`
- `supersedes_grant_ids`: `string[]`
- `delegation_chain_ids`: `string[]`

`authority_grant.status` may now be `null` or one of:

- `active`
- `expired`
- `revoked`
- `superseded`
- `pending`

This is a bounded validator-local status widening for `authority_grant`; it does not add graph logic, authority-topology resolution, or repo-global lookup behavior.

#### organization

`organization` now accepts these additive fields when present:

- `org_type`: non-empty string
- `parent_org_id`: `string | null`
- `portfolio_org_id`: `string | null`
- `authorized_domains`: `string[]`
- `office_holder_snapshot`: `null` or a plain object with optional non-empty string `name` / `title` fields

This widening remains shape-only and does not add mutual-exclusion rules, cross-org cycle checks, or repo-global topology validation.

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
