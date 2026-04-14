# NATS Event And Command Translation

## Purpose

This spec records the subject and payload translation truth shipped in Meridian Wave 3.

## Upstream Subjects Used In Wave 3

### Streams

- `CONSTELLATION_ENTITIES`
- `CONSTELLATION_EVENTS`
- `CONSTELLATION_TELEMETRY`
- `CONSTELLATION_COMMANDS`

### Subscribe Families

- Events: `constellation.events.>`
- Telemetry entity subjects: `constellation.telemetry.{org_id}.{entity_id}`
- Command entity subjects: `constellation.commands.{org_id}.{entity_id}`
- Command broadcast subjects: `constellation.commands.{org_id}.broadcast`

Wave 3 uses the wildcard subscription `constellation.commands.*.*` to cover both command subject families without widening beyond the approved scope.

## Event Translation

Wave 3 accepts the documented upstream Event envelope:

- `id`
- `type`
- `subject`
- `data`
- `metadata`
- `timestamp`
- `source`

Translation rules:

- `channel` becomes `"events"`.
- `subject` stays the upstream event subject.
- `org_id` and `entity_id` are read from `data.org_id` and `data.entity_id`.
- `entity_type` is `data.entity_type` when present, otherwise `null`.
- `observed_at` is `timestamp` when present, otherwise `null`.
- `raw_payload` preserves the original event object.
- Malformed inputs fail closed.

## Telemetry Translation

Wave 3 accepts telemetry subjects in the form `constellation.telemetry.{org_id}.{entity_id}` and preserves the upstream payload family opaquely.

Translation rules:

- `channel` becomes `"telemetry"`.
- `org_id` and `entity_id` are derived from the subject.
- `entity_type` is carried only when the payload clearly provides it.
- `observed_at` is taken from `payload.timestamp` when present, otherwise `null`.
- `raw_payload` preserves the original telemetry payload.
- Wave 3 does not invent additional telemetry semantics.

## Command Translation

Wave 3 accepts command subjects in the form:

- `constellation.commands.{org_id}.{entity_id}`
- `constellation.commands.{org_id}.broadcast`

Translation rules:

- `kind` becomes `"command_request"`.
- `org_id` and `entity_ref.entity_id` are derived from the subject.
- Broadcast subjects normalize to `entity_ref.entity_id === "broadcast"`.
- `entity_ref.entity_type` is carried only when the payload clearly provides it.
- `authority_context`, `evidence_context`, `confidence_context`, and `candidate_signal_patch` default to `null` unless explicitly provided out-of-band.
- Raw command payloads remain opaque and are preserved alongside the exact request contract during subscriber handling.
- Wave 3 does not invent command semantics.
- Malformed subjects fail closed.

## Governance Stub Outcomes

Wave 3 ships a fail-closed transport adapter:

- absent authority context -> `HOLD`
- unresolved authority context -> `BLOCK`
- apparently resolved authority context -> still `BLOCK`

Wave 3 never returns `ALLOW`.

## Meridian Publications

Wave 3 publishes through the read-only Meridian subject builders already defined in `src/config/constellation.js`:

- governance: `constellation.governance.{orgId}.{entityId}.{event}`
- evidence: `constellation.evidence.{orgId}.{entityId}.{event}`
- disclosures: `constellation.disclosures.{orgId}.{entityId}.{event}`

Wave 3 publishes fail-closed outcomes as:

- governance `hold` or `decision`
- evidence `missing`
- disclosures `notice-required`

These publication payloads are transport payloads. They do not widen entity contracts.

## Explicit Non-Claims

Wave 3 does not ship:

- live broker proof
- actor-level authorization topology
- entity or KV mutation
- civic ForensicChain runtime writes
- evaluate-before-mutate governance state machines
